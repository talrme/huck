# Refresh Benchmarks

## Live Firestore Comparison: November 3, 2026

Production: https://talrme.github.io/huck/ (Google Sheets). Staging: https://talrme.github.io/huck/staging/firebase/ (Cloud Firestore, open access, synthetic records).

Final comparison measured on the same computer/connection around10:03-10:07 PM Pacific. Each backend used four independent empty browser contexts followed by twelve reloads preserving the fourth context's local data and HTTP cache. Both were real GitHub Pages URLs. Headless desktop Chrome used a390x844 phone-sized viewport, with no network/CPU throttling. These are NOT physical phone measurements or a long-term uptime test. Empty contexts do not guarantee cold Google servers/CDN/TLS connections.

**The first two rows below are separate total navigation-to-fresh-confirmation/paint measurements. The third row is a component of those totals; do not add rows together.**

| Metric | Sheets median | Firestore median | Sheets range | Firestore range |
| --- | ---: | ---: | ---: | ---: |
| Total first open without saved data (4) | 3.103 s | 0.818 s | 2.388-4.001 s | 0.773-0.880 s |
| Total reload with saved data (12) | 1.889 s | 0.265 s | 1.558-2.755 s | 0.229-0.660 s |
| Backend request, all16 | 1.884 s | 0.215 s | 1.479-3.576 s | 0.163-0.649 s |

Firestore's median cached reload was about7.1 times faster in this sample; the first-open median was about3.8 times faster. All32 final runs succeeded on their first request, with no retry/timeouts/JavaScript errors observed. This is not a promise about every phone or future reliability.

Sheets had86 entries, revision339, and one child. Firestore had84 synthetic entries, revision1, and one Test baby profile. The original Sheets baseline below had84 entries; household usage added entries normally before this later comparison. The contents, tombstones/history distribution and storage models differ, so this is a near-matched real-world comparison, not a controlled identical-dataset benchmark. No real sleep content was copied into public staging. The benchmark sent only ordinary Sheets snapshots; it never added or manually edited household logs.

Request timing boundaries: Sheets uses script insertion to JSONP callback, including transport/Google work/download/parsing. Firestore uses adapter request start to the first server-sourced snapshot BEFORE decoding/rendering; this includes SDK initialization on first opens. Cached/pending-write snapshots are ignored. Response-to-synced-DOM medians were2.6ms Sheets and11.1ms Firestore, so backend waiting still dominates. Firestore live rendering happens in the listener before the final request completes; do not mistake the earlier preliminary0.3ms request-completion/status-update measurement for all rendering work. Total fresh-data timing includes the full update and the next paint opportunity for both backends.

### Individual Total Fresh-Data Times (Seconds)

| Run | Type | Sheets | Firestore |
| --- | --- | ---: | ---: |
| 1 | Empty context | 4.001 | 0.880 |
| 2 | Empty context | 3.372 | 0.853 |
| 3 | Empty context | 2.833 | 0.782 |
| 4 | Empty context | 2.388 | 0.773 |
| 5 | Cached reload | 1.919 | 0.288 |
| 6 | Cached reload | 1.860 | 0.267 |
| 7 | Cached reload | 2.392 | 0.321 |
| 8 | Cached reload | 1.638 | 0.328 |
| 9 | Cached reload | 1.923 | 0.254 |
| 10 | Cached reload | 1.989 | 0.660 |
| 11 | Cached reload | 2.211 | 0.245 |
| 12 | Cached reload | 1.739 | 0.262 |
| 13 | Cached reload | 1.824 | 0.252 |
| 14 | Cached reload | 2.755 | 0.275 |
| 15 | Cached reload | 1.558 | 0.229 |
| 16 | Cached reload | 1.724 | 0.261 |

Raw results: 2026-11-03-firestore.json and 2026-11-03-sheets-comparison.json. Use tools/benchmark-refresh.cjs with HUCK_BENCH_URL set to either live URL and HUCK_BENCH_OUTPUT to a new JSON path. The driver chooses the corresponding isolated localStorage key and verifies server-confirmation signals. All16 final Firestore runs recorded responseSource=server-snapshot. Do not compare local-server results to live Pages results without disclosing it.

Separate tests/firestore.cjs runs exercised actual two-browser transactions/listeners in disposable test environments. Three start/end smoke runs observed second-device changes in roughly0.4-0.8s, INCLUDING Playwright click/observation overhead; this is not a pure network propagation benchmark. Concurrent starts left exactly one active sleep, repeated request IDs created one change, edits persisted after reload, expired timers did not block settings, and queued offline changes survived closing/reopening the page. Only test environments were written/cleaned. The open staging database is deliberately not a private data store; no auth/password/admin layer has been implemented.

## Sheets Baseline: November 3, 2026

Measured around 8:20 PM Pacific against https://talrme.github.io/huck/ using headless Google Chrome on this computer's connection, with a 390x844 phone-sized viewport. No network or CPU throttling was applied. These are not physical-phone measurements.

Four independent browser contexts with empty site storage/cache were followed by twelve reloads in the fourth context, preserving its saved data and browser cache. All sixteen runs were serial and tightly grouped within about forty seconds. Fresh browser contexts do not guarantee cold Apps Script servers, DNS or TLS connections. This is a baseline sample, not a long-term service percentile or uptime measurement.

| Metric | Fresh contexts (4): median | Cached reloads (12): median | Overall median | Overall fastest | Overall slowest |
| --- | ---: | ---: | ---: | ---: | ---: |
| First rendered action/UI | 256 ms | 43 ms | 44 ms | 35 ms | 553 ms |
| Fresh backend data confirmed and next paint opportunity | 2.294 s | 1.984 s | 2.045 s | 1.411 s | 4.025 s |
| Snapshot request: script insertion to JSONP callback | 2.016 s | 1.905 s | 1.905 s | 1.342 s | 3.440 s |
| Response to synced DOM | 16.2 ms | 1.6 ms | 2.0 ms | 0.6 ms | 21.3 ms |
| Response to next paint opportunity | 30.4 ms | 25.6 ms | 27.0 ms | 18.4 ms | 32.0 ms |

All sixteen snapshot requests succeeded on their first attempt. No retries, timeouts, busy/lock errors or JavaScript errors were observed. Each response reported backend version 2026-11-01-clock-sync, 84 entries (including any retained deleted records) and revision 332. The backend request metric includes network travel, redirects, download and callback parsing as well as Apps Script/Sheet work; it does NOT isolate server processing.

The first rendered UI on an empty profile is only the empty/default interface, not real household data. On cached reloads it is the saved household snapshot, not proof that it is current. Fresh confirmation is measured separately. The app remains optimistic during edits, but no edits were made during this benchmark.

### Individual Fresh-Confirmation Times

| Run | Type | Seconds |
| --- | --- | ---: |
| 1 | Empty context | 4.025 |
| 2 | Empty context | 2.488 |
| 3 | Empty context | 2.029 |
| 4 | Empty context | 2.100 |
| 5 | Cached reload | 2.428 |
| 6 | Cached reload | 1.562 |
| 7 | Cached reload | 2.614 |
| 8 | Cached reload | 1.977 |
| 9 | Cached reload | 1.764 |
| 10 | Cached reload | 2.062 |
| 11 | Cached reload | 1.678 |
| 12 | Cached reload | 2.758 |
| 13 | Cached reload | 1.411 |
| 14 | Cached reload | 1.660 |
| 15 | Cached reload | 3.043 |
| 16 | Cached reload | 1.990 |

### Interpretation

Most waiting in this sample was in the backend round trip, not rendering. The reported 5-10-second phone refresh delay was NOT reproduced in this short desktop sample; phone CPU/network, other times, server variability and concurrent devices remain unmeasured. This does not establish that a phone report is wrong or that future refreshes cannot take longer.

The app still reads/replays the entire event history under a global script lock. This test measures current data volume; it is not a scaling benchmark or proof of constant performance as records accumulate.

### Reproduction And Safety

Raw per-run timings/metadata: `2026-11-03-sheets.json`. No household record content or callback payloads are stored in that file.

Run `node tools/benchmark-refresh.cjs` with Playwright installed/resolvable and Chrome at the configured executable path. HUCK_BENCH_URL overrides the target URL; HUCK_BENCH_OUTPUT overrides the output JSON path (default /private/tmp/huck-sheets-refresh-benchmark.json). The local Codex runtime/NODE_PATH are documented in AI_README.md.

The driver uses isolated browser contexts with no existing household outbox and never presses action controls or submits commands. It only allows the normal startup snapshot requests. Those requests can automatically finalize an overdue timer by normal backend design; do not describe them as absolutely write-free. During this sample the reported revision was unchanged across all sixteen responses.

### Firebase Comparison Setup

The implemented comparison uses an isolated staging entry point, separate storage/outbox and explicitly isolated Firebase database paths. Production remains on Sheets. Unauthenticated public staging uses clearly labeled synthetic records with similar volume/shape, not copies of private family history. Public access allows other people to read/change/delete that staging data; do not hide this consequence.

Both backends use the same four empty-context opens and twelve cached reloads on the same computer/connection and record navigation-to-server-confirmed-data, not merely cached or optimistic listener callbacks. Offline pending writes and explicit server acknowledgements are retained. Firestore-specific timing events report adapter start and server receipt separately from rendering; Sheets retains JSONP instrumentation. Further physical-phone, high-volume and long-idle/wake tests remain useful; these samples alone do not establish all future performance or reliability.

At the time of the original Sheets baseline, no Firebase backend was configured. The owner subsequently chose Cloud Firestore, created huck-7a55c and supplied its public web configuration. The isolated staging implementation is documented in ../staging/firebase/README.md. No Realtime Database URL or authentication setup is required. Production remains on Sheets; real household history has not been exported to the open staging database.
