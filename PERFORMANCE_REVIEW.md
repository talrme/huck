# Sync and Growth Review

Reviewed October 30, 2026. Scope: browser rendering/state/sync, reducer, Apps Script event adapter, assets, build, and regression tests. This review uses source inspection and explicitly synthetic benchmarks, not household load testing.

## Recommendation

Keep Google Sheets for this two-phone family app. The October31 lock-recovery fix automatically retries temporary errors and recovers stalled client requests. Deploy the latest adapter below to reduce lock waiting; prioritize a materialized server checkpoint before accumulated event replay becomes slow. Firebase is an alternative for push-style updates, not required for the current workflows.

## Findings, in priority order

### 1. Full event replay is the principal growth bottleneck

`tools/backend-tail.gs` reads and parses the entire HuckEvents log on every request, then `replayHuck_` applies every historical command. `shared/core.js` deliberately deep-copies state per apply for transactional safety and checks overlaps against existing entries. As both events and records accumulate, full reconstruction can approach quadratic work. It runs while holding the script lock, so one slow read also makes the other phone wait.

Deleted entries and edits remain in the audit log, so row count grows faster than the number of visible naps. Returning the full state also increases transfer size and browser storage over time. No log trimming or checkpoint is implemented by this patch; no history has been removed.

Synthetic local Node replay, one completed sleep per add event:

| Events | Local replay time |
| --- | --- |
| 100 | about 4 ms |
| 500 | about 72 ms |
| 2,000 | about 1,130 ms |

These are single local runs, not Apps Script/Sheets timings, a capacity guarantee, or an estimate of household latency. They demonstrate the growth pattern. They do not include startup, network, Sheet service calls, or lock contention.

### 2. Cross-phone delay is partly the deliberate polling interval

The receiving phone polls every 15 seconds while visible, plus refresh/foreground/reconnection checks. Consequently it can wait roughly 0–15 seconds for its next scheduled poll, plus request/lock time; throttling or network failures can make it longer. Improving browser speed cannot turn this into realtime push.

The interval is unchanged. Reducing it globally would increase requests and potentially lock pressure. A short foreground burst could be considered separately, but both phones would need to be in that burst to improve mutual visibility.

### 3. Saving did an unnecessary network round trip — fixed

Previously an ordinary edit did snapshot, then command. Commands already validate against authoritative state under a lock and return the full new state. The frontend now sends a pending command immediately, cutting the ordinary save from two requests to one. On a real validation/revision rejection it marks the item blocked and fetches fresh state for review. Temporary lock/busy/transport errors now retry with backoff instead; older persisted lock-blocked commands are recovered on startup. Expected revisions, durable queue, request identity and retry deduplication are preserved.

An idle refresh still fetches a snapshot. Pending edits queued during an already-running snapshot are flushed by that cycle. This is compatible with the currently deployed backend.

### 4. Unchanged browser state was recomputed repeatedly — fixed

- Cache time-zone formatters instead of constructing them for every formatted date/time.
- Memoize optimistic projected state by base identity and queued-command/block status; invalidate at the next forgotten-timer deadline or a backward clock change.
- Cache each child's filtered/sorted entries by projected-state identity. Callers needing a different order copy the list before sorting.
- Reuse chart DOM when state, child, period, style, history window and active minute are unchanged.
- Do not rebuild the interface for an identical remote snapshot; still update sync status and the live timer.
- Skip identical localStorage writes. Encoding/comparing a full snapshot still has linear cost; this is not unlimited storage.

Synthetic Chrome fixture with 2,000 completed records plus one active sleep:

| Operation | Before | After |
| --- | --- | --- |
| 100 repeated projected-state reads | about 48 ms | below 1 ms in that run |
| Intl formatter constructions during initial view | 324 | 15 |

This measures local browser work, not faster internet or server response. Main workflows and live age/wake/timer behavior are regression-tested, including expiry after cache reuse.

### 5. Repeated Sheet service lookups — prepared, needs deployment

The adapter passes its already-validated Sheet into the event reader and reads lastRow once. The October31 revision avoids a second open solely for getUrl: mocked snapshots use one spreadsheet open, one header read and one last-row read (originally three/two/two).

It uses tryLock(2000), not waitLock(25000), so contention produces an explicit retryable BUSY response instead of a25-second lock queue. Browser retries back off from about5s to at most47s with jitter, pause when hidden, and retain original request IDs. New event rows are flushed before unlocking, following [Google’s lock guidance](https://developers.google.com/apps-script/reference/lock/lock#releaselock). Locks/revision validation and the append-only event schema remain intact. Read requests still need the lock because they can persist timer expiry; no unsafe unlocked snapshots were introduced.

The repository's generated `backend.sample.gs` includes this cleanup. **Pushing the website does not deploy it.** Existing frontend improvements work before deployment; only this extra adapter saving waits for the owner.

To activate it:
1. Open the household Sheet → Extensions → Apps Script.
2. Replace all Code.gs with this repo's complete `backend.sample.gs`, then save.
3. Deploy → Manage deployments → pencil → Version: New version → Deploy.
4. Keep Execute as Me, access Anyone, and the existing /exec URL. Do not clear the Sheet or rerun imports.

## Next Sheets upgrade: persistent checkpoint

Proposed, not implemented:

1. Keep the append-only audit log intact.
2. Store materialized current entries/children/settings in an additional checkpoint tab, with schema version and the last fully applied event row. Use structured/chunked storage rather than one unbounded JSON cell.
3. Under the existing lock, load the checkpoint and replay only its unapplied tail. Validate completeness/cursor and fall back to full replay if a checkpoint is missing, corrupt or incompatible.
4. Commit log events before advancing the checkpoint cursor. Recovery and request-ID deduplication must work after a partial checkpoint failure or a lost response.
5. Add conditional snapshots so an unchanged revision does not resend all history, while still checking forgotten-timer expiry.
6. Optionally add CacheService as an accelerator keyed to the authoritative log/checkpoint. Never make it the source of truth: cached entries may disappear and size limits apply.

This requires an Apps Script update and migration/recovery tests, not a new provider or public Sheet. Do not implement it as an unsafe in-place reducer or by truncating old event rows. Google's [Apps Script best practices](https://developers.google.com/apps-script/guides/support/best-practices) recommend reducing service calls and using batching/caching; [Cache documentation](https://developers.google.com/apps-script/reference/cache/cache) describes its limits and eviction behavior.

## Firebase comparison

[Firestore snapshot listeners](https://firebase.google.com/docs/firestore/query-data/listen) can push changes to connected clients rather than waiting for a scheduled poll. It would require backend/data migration, security rules/access design, setup and updated tests. It would not eliminate all network delay, phone background restrictions or the need for conflict handling. Do not replace the existing unauthenticated endpoint with a broadly writable Firebase database as a shortcut.

Choose it if near-immediate cross-device updates become more important than keeping the simple Sheets backend. Stay with Sheets plus checkpointing if modest delays are acceptable.

## Validation and reproduction

- All standard tests continue to use sample data or mocked services; no real records were changed by this performance work.
- `tests/performance.cjs` covers 2,000-record cache/expiry, one-request saves, unchanged chart identity, durable retry, and stale-write recovery.
- `tests/sync-recovery.cjs` simulates temporary lock/busy errors, automatic backoff/retries, old blocked-outbox recovery, lost committed responses and suspended-phone request recovery. Backend mocks verify busy requests never open/write the Sheet or release a lock they do not own.
- With the preview server on port 5190, run it using the same Playwright/Chrome dependencies as the other browser tests.
- Optional `HUCK_BASELINE_JS=/path/to/baseline-app.js` compares an older source file through test-only interception. The reviewed pre-change app can be extracted from commit `87536aa`. No baseline file in /tmp is required for normal regression tests.
- Before/after local microbenchmarks are not end-to-end phone or deployed Apps Script measurements. No claim of a fixed percentage improvement to sync latency is made.
