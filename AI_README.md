# Huck: AI Project Handoff

Last consolidated: October 30, 2026. This describes the current implementation, not an append-only list of old requests. Update it and README.md when behavior changes.

## Start here

- Canonical repo: `/Users/talg/Desktop/Websites For Fun/huck`.
- Remote: `https://github.com/talrme/huck.git`; branch `main`.
- Live app: `https://talrme.github.io/huck/`.
- Local preview: `http://127.0.0.1:5190/`, also `/huck/`.
- Family use: Tal and Sophie tracking Avi; other children supported. Do not infer Avi's birthday from old chats or synthetic test fixtures.
- All personal websites should be created in `/Users/talg/Desktop/Websites For Fun` unless the user explicitly chooses elsewhere.
- Read the code before editing. Preserve unrelated work and real records. Keep changes scoped.
- The user expects actual implementation, phone-first visual checks, useful regression tests, and usually commit/push for incremental changes. Honor any explicit local-only/approval-first request.
- The original ten staging apps are gone. Daybook (staging 10) is production. Do not resurrect staging folders/chooser or reset storage.

## Architecture and file ownership

Static vanilla HTML/CSS/JavaScript on GitHub Pages. No framework, bundler, service worker, or hosted application server. Apps Script provides the shared API over a private Google Sheet.

| File | Responsibility |
| --- | --- |
| `tools/page.html` | Authoritative page template |
| `shared/app.js` | Rendering, event handlers, local preferences/outbox, sync, forms, chart, animation |
| `shared/core.js` | Deterministic UMD data reducer/validation; shared with Apps Script |
| `shared/wake.js` | Frontend-only age calculations, range lookup and wake-quality cues |
| `shared/styles.css` | Common components, animation, responsive behavior |
| `shared/themes.css` | Daybook/Orbit/Compact layouts and default periwinkle palette |
| `config.js` | Permanent backend endpoint, Sheet URL and live URL |
| `tools/backend-tail.gs` | Apps Script adapter, fixed Sheet ID, locking, event log and JSONP |
| `tools/build.mjs` | Generates HTML, manifest, standalone script |
| `tools/serve.cjs` | Port 5190 preview, no-store headers, root and /huck/ support |
| `tools/icons.cjs` | sharp-based pacifier PNG generation |
| `tests/` | Pure and Playwright regressions |

Generated artifacts: `index.html`, `manifest.webmanifest`, `backend.sample.gs`. Edit their sources and run `node tools/build.mjs`; do not maintain generated copies independently. The backend file's name does not mean it is sample data: it is the complete deployable Apps Script.

Backend generation concatenates `shared/core.js` + `tools/backend-tail.gs`. Never paste only the adapter into Code.gs. Asset URL version tokens in the page template must change with JS/CSS changes.

## Permanent connections and verified state

Use `config.js` as the single source for the deployed /exec URL and URLs. Sheet ID: `1y7s7IP4Un91hPcqQMFYW6NAZ_S6cEUZBbJdHc9cdWMQ`.

The backend is deployed, reads work, and real writes were performed during the explicit screenshot import. On October 30, 2026, 24 approximate sleeps from screenshots dated October 19–30 were added to Avi's real logs after Pacific timezone confirmation. Existing records were preserved, all imported records were verified in a fresh snapshot, and blank days were not fabricated.

Imported IDs follow `screenshot-YYYY-MM-DD-HHMM-HHMM`, with deterministic request IDs prefixed `import-`. Command metadata records screenshot source and approximation; entries do not have a user-facing approximation field. Do not present these times as exact or reimport them blindly. The one-off script/backups/audit were temporary local /tmp files, not a permanent repo import tool; they may no longer exist. Do not publish raw household records or screenshot files.

Automated cross-device tests use isolated browser contexts and a simulated API. Do not claim those are tests on two actual phones. The screenshot import verifies live write/read persistence, not every concurrent-phone scenario.

The Sheet stays private. Apps Script runs as its owner with web access Anyone. The endpoint is intentionally unauthenticated and can expose/change all profiles and records to anyone who knows it. Do not call this secure/authenticated medical storage or add secrets to frontend files.

## Data model and invariants

State: `children`, `entries`, `settings`, `revision`.

Child: `id, name, archived`.
Entry: `id, childId, start, end, rev, deleted, autoEnded, updatedAt`.
Start/end are epoch milliseconds; `end: null` is active. A deleted record is soft-deleted.

Command: `id, type, payload, createdAt`. Command ID is retry identity, not entry ID. Frontend uses createdAt for optimistic replay; server event replay uses server received time.

Actions: `start, add, end, edit, delete, child, archive, settings, expire`.
Edits/end/delete require the entry's `expectedRev`. Settings writes require global `expectedRevision`.

Preserve:
- One active sleep per child.
- No overlapping live sleeps for that child, including reopening a completed one.
- Positive, finite, nonfuture timestamps; completed end strictly after start.
- Archived children cannot accept new sleep edits through normal commands.
- At least one child active; do not archive a child with running sleep.
- No silent overwrites on revision conflicts.

The shared settings action accepts additional metadata. Birthday/range profiles therefore required no backend change:
```js
settings.wakeProfiles[childId] = {
  birthday: "YYYY-MM-DD",
  ranges: { "3": { min: 45, max: 100 } }
};
```
Example values above illustrate structure, not household data. Range keys are the exclusive upper completed-month boundaries `1, 3, 5, 7, 10, 12`. Only deviations from built-ins are stored. Legacy `mode/custom/min/max` fields are ignored by age lookup; do not restore that UI.

## Event log and deployment

HuckEvents columns are exactly `id | receivedAt | command`. Header validation fails closed; never repair by clearing user data. setupHuck is idempotent and leaves unrelated tabs alone.

For each request the adapter takes a script lock, loads/replays the append-only log, settles expired timers, applies/deduplicates a command if present, and returns the authoritative state. Retries with the same request ID are not appended twice. Retain deterministic server-time replay and lock release in finally.

Transport is JSONP through injected script tags because this is a static site calling Apps Script. Snapshot and command actions use GET, with callback/payload parameters and a cache-buster. A snapshot can persist timer expiry, so it is not guaranteed to be write-free.

Backend deployment is separate from GitHub:
1. Change shared/core.js or backend adapter only if needed.
2. Build the full backend.sample.gs.
3. Have the owner replace Code.gs completely, save, then Deploy → Manage deployments → pencil → New version → Deploy.
4. Preserve the existing /exec URL.
5. Verify deployed behavior; explain any required owner action before saying complete.

Layout, preferences, image changes, and current wake metadata do not require redeployment. Changes to reducer rules/actions/validation/replay do. Editing Code.gs alone never updates the deployed app. README retains detailed owner-facing setup instructions.

## Sync and persistence

Performance review: read PERFORMANCE_REVIEW.md. Projected state is memoized by base object, queue ID/block signature and next active expiry; backward clock changes invalidate it. Treat returned projections and cached entries(s) lists as read-only. Copy before sorting (pastDefaults does). entryLists uses a WeakMap per state and child. Reusable Intl formatters key by kind/timezone. Chart memo keys state identity, child, day period, style, days window, and active minute. acceptSnapshot compares full JSON signatures (not revision alone); identical polls skip view reconstruction. persist suppresses identical storage writes, not serialization. These caches must never suppress expiry, incoming remote edits or queue conflicts.

Production storage key: `huck-v1`. Preserve it across releases and former staging migrations. It contains base snapshot, durable queue, preferences and localOnly metadata.

Sample key: `huck-sample-v1`, enabled only by `?demo=1`. Sample mode must never call the real API, write shared data, or migrate into production. Advanced settings opens the sandbox or returns to the real tracker. Its banner clearly labels fictional records.

Earlier real local-only data is preserved in `huck-local-backup-v1` before connecting. Import/download is explicit, validates all proposed entries first, skips existing IDs, never deletes the backup, and excludes samples.

`enqueue` validates against projected state, saves the outbox before networking, optimistically renders, then syncs. `projected` replays unblocked queued commands over base and derives expiry. Backend success replaces base and removes acknowledged commands. A real validation/revision rejection remains blocked for explicit review/discard; do not drop it or overwrite the other device. Temporary lock/busy/service/transport errors must NEVER become blocked edits. New actions are blocked only while real review is needed.

A sync cycle sends queued commands directly, without a preliminary snapshot, because each command validates on the server and returns authoritative state. With no pending command (or a blocked first item) it reads a snapshot. It flushes commands serially. Real rejection blocks the command and fetches shared truth for review; temporaryError recognizes explicit retryable flags plus legacy Google lock/service messages. Automatic retries preserve the outbox and request ID, with5/10/20/40/45s capped base delays plus up to1.5s jitter. Poll/focus cannot bypass retryAt; sync(true), Check connection and online can. Hide cancels retry timers, not data. Startup removes only recognized transient blocked reasons left by older versions. Do not silently unblock real conflicts.

Request timeout35s; pendingRequest.startedAt permits stale-request cancellation when foreground resumes after40s with suspended timers. Check the current request age, not the age of a whole multi-command sync cycle. Cancel rejects the awaiting request, clears busy in finally and schedules retry. Retain a no-op JSONP callback for60s after a timeout/cancel so a late response cannot throw or mutate state. Do not infer that cancelling the client cancelled the server write; same-ID retry dedup is essential. Existing deployed protocol remains compatible.

Backend October31 changes in tools/backend-tail.gs/generated backend.sample.gs require a NEW owner deployment: tryLock(2000) returns {ok:false,retryable:true,code:BUSY} without opening/writing the Sheet when busy; only release a lock actually acquired. Use a constant Sheet URL to avoid a second SpreadsheetApp.openById call under lock. Flush new events before releasing the lock as Google recommends. Full event replay is still under lock, unchanged. Do not claim the latest backend is deployed until the owner confirms and a live check succeeds.

Every latest adapter response includes backendVersion=2026-10-31-lock-retry so a read-only snapshot can confirm the owner deployed this version. An older deployment may omit it; frontend compatibility is preserved.

Triggers:
- Opening/reload.
- Visible foreground return; focus checks are throttled to five seconds since last check.
- Persisted pageshow and online event.
- Every 15 seconds while visible.
- A local edit when visible and not already busy.

Hidden pages do not start new cycles; already-running requests can finish. There is no websocket/push service or per-second polling. A returning phone may take several seconds to obtain the shared state. The 1-second timer tick is local.

`renderSyncActivity` uses existing busy state to show the header's animated Syncing indicator immediately and hide it on completion/failure. Footer status distinguishes syncing/pending/conflict/unavailable/synced. Animation is feedback, not a promise the command reached the server. Keep failure messages truthful even with no pending writes.

Localhost/ports/Pages are separate origins, so local outboxes/preferences are not shared between them. Configured pages still use the same remote API. No service worker cache exists. Browser persistence can be cleared by the user/OS; do not imply it is a server backup.

## Shared versus local settings

Shared:
- Children and entries.
- Home timezone/dayStart/nightStart and forgotten-timer rules.
- Each child's birthday and edited age-range table.

Device-local:
- Selected child.
- Style: daybook/orbit/compact.
- Theme: original/night/berry/mint.
- Motion preference and wakeInfo visibility toggle.

Style/color/wake visibility apply immediately. Shared form changes use Save and revision checking. Per-child wake drafts survive switching child within settings. Missing birthdays do not block saving unrelated preferences; invalid provided birthdays and invalid ranges do.

## Current phone UX contract

Keep it compact, approachable and usable one-handed. No marketing titles/subtitles, redundant labels, chooser, dashboards or unnecessary counters. Prefer familiar icons, named tooltips/labels, and adequate touch targets.

Header: small pacifier, Huck, selected child, temporary sync activity.
Timer: sleeping/awake state artwork, large duration, small inline ticking seconds only during active sleep.
Active time row: linked start time + muted "to" + linked "Enter end time"; same link font/color. It lives inside .readout and Daybook's accent line, not under the actions.
Actions: Start nap/sleep now while awake; End Nap / End Sleep while sleeping (title case, no now suffix). No earlier-time sliders remain.
Recent entries: completed records intersecting current home day, latest three, newest first; Show all of today's naps/Show fewer; subtle Add sleep at bottom. Expansion is transient childId:period key. Do not show the active record here.
History: newest day initially visible at right, sticky Y-axis, emphasized today, muted older blocks, editable chart blocks.
Footer: Settings and Save / Share.

The overall status "Sleeping" is generic. Session-specific wording uses `sleepName(start, state)`:
- Main start uses now.
- Manual start uses the edited timestamp.
- End actions use recorded start, never current clock time.
- Editor titles, duration noun and Still napping/Still sleeping use the edited start.
Crossing morning/evening alone must not rename an active session.

The user explicitly removed BOTH minutes-ago sliders. Awake actions are only Start now and Enter nap/sleep manually; sleeping actions are End now. renderActions renders only .action-main, and updateActionLabels updates the timestamp-derived noun without slider references. Delay state, event handlers and styles were removed. Backdated starts use the unified manual editor, default five minutes ago. Ending remains immediate End plus Adjust.

Immediate-end confirmation: only a locally successful main End enqueue calls showEndConfirmation(id). Never create one on polling/replay/auto-expiry. #end-confirmation sits after the timer and before Recent entries, shows Ended at clock(end), Adjust, X and a subtle8s progress line. Dismiss/fade only clears transient UI, never deletes/resumes/changes the saved nap or outbox. Adjust clears its timers and opens the existing record with Start collapsed and End visible; it must never auto-close that editor. Opening the same record elsewhere also clears the receipt. Receipt state is memory-only and is invalidated on child change, new active sleep, missing/deleted/reopened record, or expiry; fresh remote state may update the displayed time. Respect reduced motion, prevent old hide timers from hiding a new receipt, and preserve record timestamps on expiry. Do not infer server sync success from the receipt: normal sync status/outbox still applies.

`renderActions` preserves its DOM for the same child/running entry/awake context, avoiding lost focus during polling. Keep form DOM stable across sync as well. Do not reintroduce the removed delay controls.

Daybook is default with periwinkle original palette. Orbit and Compact remain usable alternatives, not staging sites. Check all three with all four themes, particularly Night contrast.

## Time editor behavior

November1 timestamp rejection fix: core timestamp validation permits only now+1000ms. Phone/server skew can accept an optimistic End locally but reject it on the backend; previously this set cmd.blocked and rolled back the projection. clockRejection only recognizes that exact timestamp error for start/end/edit/add with finite positive payload times no later than the command's original createdAt+1000. Such rejections now retain the original ID/payload as pending and enter existing backoff rather than blocking; matching persisted blocked commands migrate automatically. Genuinely future local edits, overlaps and stale revisions still fail normally. Never replace/rebase queued times or IDs. Large phone-clock errors may still leave old commands waiting; do not claim unbounded skew is resolved without calibration.

Backend version2026-11-01-clock-sync adds serverNow to success/error/setup responses. It was NOT deployed by git push; the live read-only check still returned2026-10-31-lock-retry. Owner must copy full generated backend.sample.gs and redeploy sameURL. JSONP response handling sets runtime clockOffset=serverNow-Date.now()-1000 (conservative, no midpoint network overestimate). recordNow is used for new command createdAt, main Start/End, editor Now/defaults, local temporal validation/settling and timer/wake elapsed. Network timeouts, receipt lifetimes, retry intervals and diagnostics still use raw wall time. Existing timestamps stay immutable; calibration is not persisted. Main End clamps to at least start+1ms for an immediate Start→End. tests/clock-sync.cjs reproduces a10s-ahead old backend, startup recovery of an existing blocked end, stable optimistic pending state and same-ID retry, and a2min-ahead phone calibrated from new backend metadata; genuine future manual values still fail. No test commands were sent to the real Sheet.

Blocked queue UX: enqueue calls reviewSyncIssue rather than emitting a dead-end Resolve pending sync message. Within an existing modal, show the first blocked command's type/reason in #modal-notice with a data-discard=<command ID> action; never replace/close that editor or lose its current draft. Outside a dialog, use the dedicated review modal marked data-sync-review, resetting that marker on every new modal. discardRejectedChange only removes that exact still-blocked ID after saving a local recovery copy to huck-discarded-changes-v1. Backup failure aborts removal. Keep all unrelated commands, persist, render, sync(true); preserve an existing form/dialog, close only the standalone review dialog. Do not rebase/retry stale writes automatically or remove all blocked items in bulk. Existing expectedRev checks may still require reopening a changed entry. tests/sync-review.cjs mocks a durable rejected edit, verifies actual reason, draft preservation, backup, unrelated queued command syncing, successful still-sleeping save, and one-at-a-time review of two blocked items. No production outbox was read or changed; phone-local conflict reasons remain unknown until the user reviews them.

Modal message placement: modal() creates #modal-notice in the sticky footer; notice() routes messages there when the dialog is open and hides the outside toast. Enqueue validation failures use isError=true for alert semantics and theme-aware red text; informational messages stay neutral. Dialog messages persist rather than expiring behind the backdrop. New dialogs and time-field edits clear old messages; close discards drafts as usual. Keep the footer flex-wrapping for generic dialogs and block layout for entry footers. No z-index can lift the external toast above a native dialog's top layer; render inside the dialog instead.

Overlap validation remains unchanged in shared/core.js/backend. Enqueue enriches local overlap rejections with the other entry's date/range (or still sleeping), and instructions to delete an accidental entry or adjust times. Never silently merge, truncate, delete another entry or permit two active records. tests/modal-errors.cjs covers persistent unobscured notices via hit testing at320/390/1280 in every style/theme, rejected-edit state preservation, and deleting the accidental newer record before successfully reopening the original nap. No backend redeploy for this frontend-only fix.

The existing endReceipt/showEndConfirmation/renderEndConfirmation machinery now supports kind=start as well as default kind=end; legacy DOM IDs/function names remain to avoid unnecessary churn. Only a successful main Start enqueue shows the start receipt, never a failed command, manual edit, sync/replay or reload. Starting receipt is valid only while that exact record remains active for the selected child; ending receipt only while the record is completed and no sleep is active. Start/end actions replace the old receipt. Labels/aria text derive from the saved start-time noun, and both share the8s fade, paused hover/focus and independent X.

Start receipt Adjust opens the same record with Start expanded, unlike the end-focused Adjust. The secondary Still awake? opens confirmCancelStarted with ID/child/revision captured. Only explicit Cancel nap/sleep confirmation enqueues the standard revision-checked delete; Keep napping/sleeping, X, backdrop or Escape leave the running record intact. This is a soft-deleted audited event, not a fake end timestamp or a new awake record. Previous logs/wake reference remain untouched. Core active/revision protections handle another phone's edits while the confirmation is open. No backend redeploy needed. tests/start-receipt.cjs exercises day/night,3 styles/4 colors/320–1280 widths, start-focused Adjust, cancel safety, original history preservation and no receipt replay.

Keep the Start summary pencil immediately beside #start-summary-value, not pushed to the far right by a flex-growing time label. Only .start-now uses margin-left:auto when expanded; the pencil remains visibly associated with the start time.

End confirmation's .receipt-adjust is one native button spanning the main row except its independent sibling X. The timestamp #end-confirmation-time is styled as a link, but not a nested anchor/button. Keep click/keyboard behavior available over the main adjustment area; X must never open the editor. A second-row .receipt-resume is a separate muted Still napping? / Still sleeping? button. Both labels derive from the original entry start via sleepName, not the current clock. end-adjust tests click timestamp, text and padding across styles.

Resume requires an explicit modal confirmation: confirmResumeEnded snapshots the original ID, start, child and revision, dismisses the receipt, and opens a cancel-safe dialog. Only data-confirm-resume enqueues an ordinary revision-checked edit with end:null; validation/overlap/one-active constraints remain intact. No backend changes or new command types. Cancel/X/backdrop/Escape do not reopen anything. tests/resume-receipt.cjs covers day/night labels, accidental first tap, cancel, same-ID/start resume and reload persistence.

The receipt's8s lifetime fades linearly from1 to .55 opacity starting immediately via Web Animations; normal dismissal then fades out. Both motion preferences disable this effect. Hover (mouse only) or keyboard focus pauses animations AND the timeout; focus/hover restores full opacity via CSS. Leaving resumes the remaining lifetime, not a fresh8s. Dismiss cancels receipt animations. Keep the receipt transient and local, never replayed on sync; opening either action cancels its expiry so a dialog cannot close while editing. Resume tests sample animation time explicitly because Playwright's mocked timer does not drive the compositor timeline.

Awake #timer-detail uses one .last-duration button: Last nap/sleep label, emphasized duration including long, and a muted parenthesized .last-time-range. Both duration and range open the same existing entry via data-edit. Allow natural wrapping on narrow/Compact/Orbit layouts; keep auto-ended/approximate labeling. Active sleep's separate start/end links are unchanged.

Reopening should show the top/current timer, not the previous vertical scroll position. tools/page.html disables browser scroll restoration early. reopenAtTop uses instant window scroll plus a next-frame reset on initial render, load/pageshow (including bfcache), and visible foreground return. Do not reset on polling, ticks, resize, or ordinary focus: those would interrupt scrolling or editing. Chart horizontal scroll and modal drafts are not reset.

The user explicitly requested replacing native time sheets with custom scrolling wheels. shared/time-picker.js exposes HuckTimePicker.mount/refresh/flush. Each visible time-field has day/hour/minute/AM-PM scroll-snap columns, 36px rows, five-row viewport, curved/faded nearby values, a highlight strip, spinbutton semantics and arrow/Page/Home/End keys. Hidden date/time inputs keep the existing timestamp parser and unchanged-precision behavior. Day choices cover the past730 days plus today and preserve an older record's date if necessary. Only mount visible fields; mount/refresh end after revealing it. Manual start defaults five minutes ago; pastDefaults finds a nonoverlapping gap up to45m (minimum5m) or before earliest record.

`entryTime` preserves original milliseconds when date/time fields are unchanged. Do not rewrite an entry solely because an editor was opened.
Now is always visible and enabled for each shown field, resetting its date/time and refreshing the wheels. It changes only the draft. No +/-5m/5m ago controls remain. Flush wheels before explicit Save so an in-flight scroll uses the nearest row. Background sync must not rebuild the picker or discard its draft. Reduced motion removes the 3D transforms, retaining readable scrolling/selection.

Start link uses data-edit. End link uses data-open-end=entryId; opens the existing record with end fields visible and default now. This is not a second data-edit under #timer-detail.

The active timer's start-time link also has data-open-start. After opening the existing record, call setStartExpanded(true) so that explicitly tapping Start goes directly to its picker. End stays unset unless explicitly changed. Enter end time and Adjust retain the collapsed-Start default; generic recent/history edits also default collapsed. setStartExpanded is shared with the pencil toggle.

Existing-record modals always collapse Start by default: .start-summary shows the clock time (and numeric date if not today) with a data-toggle-start pencil. #start-fields retains its hidden inputs while collapsed; mount its wheels only when expanded. A second pencil/chevron click collapses without discarding draft values; the summary tracks changes. Start Now is visible only when expanded and uses the same single data-now=start as new entries (avoid duplicate hidden controls). New/manual/add entries keep Start expanded. Preserve original milliseconds when a collapsed field was not edited.
November1 editor redesign: Start and End use identical time-field-head rows and nowButton controls (rounded, rotate-ccw icon, same alignment). End always exists, even for a new manual start. The two-button .end-state group uses data-end-state=running/ended, aria-pressed and a sliding thumb; label by start-time noun: Still napping / Nap ended, or Still sleeping / Sleep ended. setEndState reveals/hides end fields, preserves endDraft when returning to running, and mounts the end wheels only when visible. End Now selects ended and resets its time. These affect only the draft until explicit Save.

The user found the full-width status selector too large: keep .end-state inline between End and Now in a three-column header, at most174px wide and36px tall. Shrink within the available track at320px, and keep Now aligned with Start. Do not restore its separate full-width row.

The awake action row has Start now (~62%) and text-labeled Enter nap manually (Enter sleep manually at night) (~38%); Compact stacks these when its action area is narrow. Enter nap manually (Enter sleep manually at night) still opens mode=start with a five-minutes-ago start, but now uses the unified full modal, default running. Recent Add sleep defaults completed via pastDefaults. Save chooses edit for an existing record; for a new one choose add if hasEnd, otherwise start. Do NOT base new-record action on the entry point/mode, since the user can change the status pill.

Entry footer contains #time-preview above .entry-footer-actions, so duration/errors stay visible while scrolling pickers. A running draft shows duration so far; completed shows duration and nap/sleep. Large Save with check icon is first/left; small Cancel and Delete icon (existing record only) are right. Keep duration/validation available even before opening the end picker.

IMPORTANT: The prior autosave-on-dismiss was explicitly reversed by the user. Cancel, X, backdrop and Escape close WITHOUT writing anything, even if the draft is valid or invalid. Only Save calls saveEntry/enqueue. Opening Enter end time suggests now but must NEVER finish the sleep just by dismissing. Footer: Delete (existing records only, with confirmation), Cancel, Save. Unchanged existing records preserve timestamps/revision. Keep editor.kind separate for entry/settings/delete confirmation. Guard updateTimePreview against closed/non-entry dialogs so delayed scroll events cannot touch another modal.

Wheel scrolls update only local draft fields and preview, never per-scroll network writes. Native time/date inputs, picker-opening/blur handlers and automatic Now hiding were removed.

All dialogs are centered, solid, readable in every theme, close on outside click/X/Escape, and use a rotating X. Entry dialogs discard unsaved drafts on every dismissal route.

## Time, chart and auto-end rules

Home timezone defaults America/Los_Angeles, independent of phone timezone.
Day starts7am, night starts8pm. Chart shows dayStart to next dayStart.
Save absolute timestamps; never make an active timer depend on a live background interval.

Chart dates oldest left/newest right; preserve horizontal scroll unless already at newest edge. Start with up to30 days, ending today, and prepend30 more when scrolling within60px of the left edge. The first .older-column contains a fallback Show older days button; remove it at the earliest recorded period. Empty history shows7 blank days. Prepending preserves the visible date via first-date delta and pagination-column width; loading older is DOM-only, with no backend requests. Reset the window/selection on child changes. Crossing sleeps split visually, not into separate records. Today has aria-current=date and tinted styling. Recent list counts full intersecting record durations once.

History blocks use data-history-entry, not data-edit: selectHistory outlines all split segments of the record (aria-pressed) and reveals #history-details below the chart. Show start/end, full duration, In progress or Auto-ended as appropriate, Edit and close X. Only Edit opens the editor; recent entries retain direct editing. Details update from projected state on tick and hide if the selected record disappears. Cache markup to preserve button focus. .sleep-block.running has a distinct fill across all themes, not merely an outline. No nighttime legend or external Older days toolbar.
DST: compute actual 23/25h boundaries and scale to fixed chart height; duration math stays actual elapsed. A more literal DST axis is a possible future improvement, not implemented.

Forgotten timer defaults:
- Day cutoff240 minutes, replacement90.
- Night cutoff720 minutes, replacement240.
- Classify by sleep start time.
- Settle on projected state and next backend request; no scheduled/background alarm.
- Preserve autoEnded labels, editability and uncertain wake calculations.
These are bookkeeping corrections, never infant-care recommendations. Changes can affect an active record.

## Wake guidance

`shared/wake.js` is frontend-only UMD HuckWake. Age uses calendar months and date-only birthday, including month-end anniversaries. No seeded birthday.

Guidance requires both local wakeInfo=true and a valid, nonfuture shared birthday. With no birthday, hide the entire main cue; within Wake-window settings show red "Birthday required to use wake-window info." when enabled. Clearing birthday preserves edited ranges. There is no standalone custom/fixed range mode.

Completed-month bands: <1:30–60min; <3:60–120; <5:75–150; <7:120–240; <10:150–270; <12:180–360. At12mo no supported band. These boundaries resolve overlapping source ranges into app bands; do not imply exact developmental deadlines.

`configuredRanges` merges validated per-child overrides without mutating built-ins. Reset changes fields to defaults; Save removes overrides. Highlight current age row. Validate min>=5, max>=min, max<=720 minutes.
Age/range sources: https://health.clevelandclinic.org/wake-windows-by-age and AAP infant sleep page linked in README.
Never instruct keeping a baby awake until a timer/range. Follow sleepy/hunger cues; pediatrician for individual/prematurity questions.

Data quality:
- No/invalid/future end: unknown.
- Stale elapsed >= max(180min, 2*upper range): unknown; fallback upper180 means6h.
- Recent auto-ended record: estimated (~), no colored judgment.
- Reliable nighttime: main cue completely hidden, not a neutral Nighttime message.
- Reliable daytime: assess still computes early/range/past; cue filters visibility as below.
Staleness is a missing-log heuristic, not clinical advice or detection of all unlogged naps.

HuckWake.cue(info) returns null unless recorded quality, a valid age window, daytime phase early/range/past, and elapsed >= max(0,min-15) minutes. At exactly the lower bound use range color; through the upper bound inclusive use range color, then past. Example60–75: hidden before45, green45–<60, amber60–75, rose>75 until stale; at180+ minutes the existing stale-log rule hides this example. Hide for active sleep, local wakeInfo=false, no birthday/age band, nighttime, missing/future/stale/auto-ended logs. These are display rules, not new medical thresholds or new age defaults.

#wake-window follows #actions in tools/page.html, outside .readout so Orbit does not overflow; Compact keeps it in the wake grid area beneath actions. Render one clickable line: Target wake window [min]–[max] min. Keep label muted and11px, only dot/range lightly colored, no progress meter, countdown, second status line or nighttime text. Existing early green/range amber/past rose colors have Night equivalents. Tap retains the source/caution dialog. Cache markup before Lucide replaces icons; no per-second DOM replacement.

## Animation and artwork

November2 visual refresh: prefs.sleepMascot and prefs.awakeMascot select one of4 bundled Twemoji PNGs each; validate IDs at startup. Main .timer-mascot is now a labeled button (not aria-hidden) that cycles only the current state's choice; child decoration spans remain aria-hidden. Settings thumbnail groups update aria-pressed immediately without rebuilding form drafts. Default sleeping/awake assets remain unchanged. Teddy/koala rock; fox peeks; chick hops; other existing state animations and motion suppression remain. Additional PNGs use the existing Twemoji CC-BY4 attribution.

body[data-state=sleep|awake] is derived from C.active during render. Paired palette variables live in themes.css; each of4 existing theme IDs defines awake/sleep accents, soft colors and background tints. Buttons/page accents switch state, Night remains dark, and diagonal swatches preview both colors. The runtime theme-color meta uses the resolved accent. Keep button contrast >=4.5 and verify all3 styles at320/390/1280. No shared settings, API or backend changes.

Recent entries preserves existing IDs/classes/cap3/current-period filtering/direct edit/expand/Add behavior but uses individual8px tiles, noun glyphs and muted clock times. Add recorded wake-duration separators between adjacent displayed sleeps only, not a live/current awake timer. shared/visuals.js exposes pure HuckVisuals.wakeIntervals; it sorts a copy of child-filtered entries, skips deleted records, produces strictly positive gaps only between adjacent sleep records, and flags gaps following auto-ended sleeps as approximate. Cache per entries-list identity in a WeakMap; never infer leading/trailing/current gaps or write derived gaps to the Sheet.

prefs.historyWake (off by default) controls the local Show wake durations switch beneath history. Include it in chartCache.key; preserve horizontal scrolling and sleep selection. Draw clipped actual-time dashed .wake-block gaps below sleep blocks in z-order; very short gaps hide their text instead of overlapping labels. They remain keyboard-accessible, but sub-minute lines can be visually covered by minimum-height sleep blocks. Selecting a wake gap clears sleep selection and shows derived details without Edit. Turning the switch off clears wake selection. Children reset both selections. History sleep/wake details now omit dates even across midnight; chart column headers retain dates. tests/visuals.test.cjs and visual-refresh.cjs cover interval math, local settings persistence, live pairing and mascot selection, loaded images, gaps, times-only overnight details, styles/themes/widths, contrast and no real API access.

History running blocks contain one aria-hidden, pointer-events:none .history-zs span with four decorative i elements. The initial tiny/low-opacity effect was too subtle: use11–12px bold Zs with near-full opacity and staggered2.4s history-dream animation at the left/right edges, plus a2.4s history-glow inset-border pulse. Keep movement within the clipped block; duration and Now retain z-index1 and existing button aria labels/selection behavior. No dimensions, timestamps, network or backend behavior change. Non-running blocks contain no Z decoration. Existing app reduce-motion and OS media rules suppress both animations. tests/history-zs.cjs checks actual movement, minimum font size/pulse, active-only presence, tap details, labels, all styles/themes/320–1280 layouts, both motion switches and removal on end. Screenshots must scroll the active block into view after changing viewport width.

Sleeping .sleep-zs has8 spans: preserve the original3 bold Zs and add5 smaller8px/500-weight Zs with --z-peak .4 from varied head positions,4.8s drift and staggered negative delays. --z-drift varies horizontal direction; all use drifting-z. Keep decorations aria-hidden/noninteractive and animation-free while awake, motion=false, or OS reduced motion. tests/sleep-zs.cjs checks origins, sizes/opacity config, animation switching and phone/desktop framing.

Awake timers now share the same #elapsed-main/#elapsed-seconds rendering as sleeping timers whenever wakeState.quality=recorded (birthday/range configuration is not required for seconds). tick toggles has-seconds for both and computes awake elapsed from the last completed end timestamp. Keep aria-live=off and the aria-label awake/asleep specific. Estimated awake time remains ~duration without seconds; missing/stale time is a dash with no seconds. Reuse stable nodes and fitElapsed for long values; no new API calls. tests/awake-seconds.cjs checks ticking/rollover, preserved nodes, all styles/themes/320/390/1280 and unreliable-data suppression.

`#elapsed-main` and `#elapsed-seconds` are stable nodes in a baseline flex row. Seconds are tabular, 14px and muted; primary duration stays larger. `fitElapsed` refits long primary text to the actual container and reserves Daybook's mascot area. Refit on tick/resize without restarting the timer or re-rendering active inputs. role=timer with aria-live=off prevents continuous announcements.

`.timer-mascot` owns position/dimensions in themes. #timer-art fills it. sleeping.png/awake.png are bundled Twemoji images, not day/night symbols. Sleeping uses breathing motion plus staggered floating Zs. Awake uses a stronger bounce/tilt and Lucide sparkles. Decorations are aria-hidden, noninteractive, and do not change layout dimensions.

Arrival runs only for a locally validated transition from active to completed via end/edit:
1. Capture old elapsed bounds before render.
2. Consume a single transient arrival after render (never on sync replay).
3. Send a duration badge on a1050ms curved/tilted flight toward its recent row.
4. Look up the current row again on landing, so a sync rerender does not lose the850ms bounce/highlight.
5. Always remove the ghost. Respect motion flags again before landing.

For local motion=false or OS reduced motion, skip flights/particles/spinners and keep a concise saved notice/status. Do not make movement necessary to understand a save.

Brand assets: Lucide Lab pacifier and bundled licenses. Twemoji v14.0.2 sleeping1f634/baby1f476, CC BY4.0; credit in README. Old moon/sun files are unused. Keep favicon/apple-touch/manifest references in sync when changing install artwork. Manifest root start_url is ./; child sharing uses ?child=<id>, while selected-child preference is local.

## Testing and release

tests/performance.cjs adds synthetic 2,000-record projection/expiry coverage, direct-save request counts, unchanged chart identity, durable network retry and stale-write refresh. Optional HUCK_BASELINE_JS intercepts app.js for a test-only before/after benchmark. No real API use. Backend adapter cleanup in tools/backend-tail.gs reuses the validated Sheet and lastRow; generated script needs a new Apps Script deployment to activate this extra reduction. It is not deployed automatically by git push. Full log replay under the script lock is still the long-term bottleneck. Persistent checkpoint/conditional snapshots are proposed only; do not describe them as implemented. Keep polling at15s unless separately changed, and do not promise instant phone-to-phone updates from local CPU gains.

Never silently add dummy data to production. Standard tests intercept the API or use ?demo=1. Any real household writes/imports need explicit user authorization. For a future screenshot import: confirm timezone, estimate transparently, read/backup current state, use stable IDs, skip duplicates/overlaps, submit through core/API, and verify by rereading. Do not edit Sheet event rows directly.

Pure:
- tests/core.test.cjs: reducer constraints.
- tests/backend.test.cjs: in-memory Sheets adapter/locking/idempotency/replay, shared wake metadata.
- tests/wake.test.cjs: age/range/quality logic.

Playwright:
- tests/browser.cjs: owns ephemeral server, main workflows/themes/simulated two-device sync.
- tests/time-editor.cjs delegates to time-wheels.cjs: scrolling/keyboard/simulated finger swipe, defaults, Now, validation, explicit Save/Cancel, active-end dismissal safety, unchanged edits, reopen/delete and all styles/themes/320/390/1280.
- tests/editor-layout.cjs: unified manual running/completed saves, aligned Start/End Now controls, status pill and drafted end preservation, sticky duration, Save-left/Cancel/Delete-right proportions, cancel safety and320/390/1280 widths across styles.
- tests/end-controls.cjs delegates to end-adjust.cjs: immediate End plus8s dismissible receipt, saved correction/Adjust surviving timeouts, Start collapse/expand/draft preservation, manual starts/no sliders, all styles/themes/widths and receipt/arrival motion.
- tests/recent-naps.cjs: cap3/reverse order/expand/reopen/overlap/sandbox isolation.
- tests/sleep-labels.cjs: morning/evening crossings and edited start classification.
- tests/timer-polish.cjs: seconds/long durations/images/delayed sync lifecycle/reduced motion.
- tests/history.cjs: block details/edit, selection, active fill in all themes, progressive 75-day scroll and anchoring, no history API calls, split records, empty history and phone/desktop layouts.
- tests/reopen-scroll.cjs: reload, history/back restoration, simulated hidden/foreground events, page-show fallback, normal scrolling/focus/sync stability and open draft preservation. Headless Chrome does not hide other tabs on this machine; physical phone app switching still needs a manual check.
- tests/sync-recovery.cjs: legacy lock and new BUSY responses, snapshot backoff, transport failure, committed-but-lost response, stable retry IDs/no duplicates, automatic recovery of persisted lock-blocked commands and stalled foreground requests. All use mocked backend data.
- tests/wake.browser.cjs: shared profile, birthday requirement, reset, local toggle, stale/missing data and night cues.
- tests/quiet-awake.cjs and wake.test.cjs: exact45/60/75-minute appearance/color boundaries for60–75 settings, below-button placement, no sliders/meters, early/night/estimated/stale/no-birthday suppression and3 styles/4 themes/phone-desktop widths.

Except browser.cjs, browser scripts expect the local preview on5190. Most hardcode macOS Google Chrome; main browser.cjs also supports PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. Playwright and sharp must be resolvable; no package/build dependency is needed for the deployed site.
Current Codex runtime (machine-specific convenience, rediscover on another machine):
- Node: /Users/talg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
- NODE_PATH: /Users/talg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules

Before releasing code: build, run pure tests plus relevant browser regressions, inspect actual screenshots on320/390px and desktop, check all styles/themes, image loading, overlap and reduced motion. Screenshot files belong in /tmp, not the repository. Native OS pickers still need physical phone checks.
Run git diff --check, review diff/status, commit only task changes, push main when authorized, and report test results and any owner deployment work. Do not claim the Pages build finished solely because push succeeded.

## Lessons for this and future projects

- Use a single shared reducer for optimistic validation and server replay instead of duplicating rules.
- Save outbox before networking, make commands retry-safe, lock writes, and reject stale revisions.
- Show pending versus confirmed state honestly. Refresh/foreground sync plus visible-only modest polling is simpler than real-time infrastructure for a small family app.
- Keep API configuration in the repo, not phone settings. Keep Sheet private but explain the unauthenticated endpoint tradeoff.
- Separate local appearance preferences from shared profile/data settings explicitly.
- Use native phone inputs where useful, but never assume desktop phone emulation reproduces native sheets.
- Make sample mode physically separate from real storage/network and obvious on screen.
- Data-entry controls need stable DOM during background refresh; rerendering a focused input/slider feels like a keyboard or drag bug.
- Test long values and every theme, not only the default screenshot.
- Use small local artwork plus CSS/Web Animations rather than heavy GIFs when it accomplishes the effect.
- This append/replay Sheets API suits modest trusted-household data. It is not an authenticated public service, high-volume chat transport, or unlimited real-time database. Reassess quotas/log replay costs if growing.

## Discussed but not implemented

Sandbox pretend clock, jump-ahead controls, and presets for forgotten timers/missing logs/overnight/boundaries. A fake shared Test child is available for real two-phone dogfooding, but creates real backend records and is not an isolated sandbox. Do not change system time or leak simulated future timestamps into production to emulate time travel.

Future testing controls should use a sandbox-only clock abstraction and preserve production timestamp validation. No new backend, notifications, automatic sleep prediction, or background scheduler has been requested/implemented.
