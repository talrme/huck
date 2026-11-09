# Huck

**Live site:** [talrme.github.io/huck](https://talrme.github.io/huck/)

**Repository:** [talrme/huck](https://github.com/talrme/huck)

**Firestore staging:** [Try the separate Firebase test version](https://talrme.github.io/huck/staging/firebase/) · [Setup, isolation and limitations](staging/firebase/README.md). It uses synthetic test data, separate from the real production history.

A phone-first sleep tracker for Tal and Sophie to track Avi's sleep across both phones. Additional children are supported. No account or per-phone backend configuration is required.

## Current status

The production app now uses **Cloud Firestore** in project `huck-7a55c`, environment `production`. Daybook, originally design option10, remains the default design. The old design staging folders are gone; `staging/firebase/` remains an isolated backend test site.

On November 3, with explicit approval for public access, the real Sheet history was migrated and verified field-for-field: **86 stored sleeps (66 visible, 20 previously deleted), one profile, shared settings, and 339 command receipts**. The original Sheet is retained unchanged as a backup, not a second live backend. Private migration exports are kept outside Git. New entries go to Firestore only.

**After this switch, refresh/reopen Huck on every phone and old browser tab.** An already-loaded old version can still write to Sheets; it does not switch backends until refreshed. If an old tab was used afterward, preserve its storage and reconcile late Sheet changes before deleting anything. Browser preferences and pending requests retain the original `huck-v1` storage key, with a one-time local pre-switch recovery copy.

**Access is intentionally public:** anyone can read, change or delete real data or consume project quota. No password, sign-in, administrator roles or trusted server-side input validation are implemented. The Firebase API key is public configuration, not a password. Protection can be added later.

On October 30, 2026, 24 user-approved sleep records were imported from two screenshots covering October 19–30. Times were estimated to about five minutes in Pacific time; blank periods were left alone, existing records were preserved, and the saved entries were verified by reading the backend again. This history is approximate and incomplete, not a complete account of sleep. Automated tests use isolated samples or a simulated backend, not the household Sheet. Two actual phones have not been used in an automated end-to-end test.

The app is already configured. The setup instructions below are for recreating or changing the backend, not something either phone needs to repeat.

## Everyday use

The compact header has the koala-with-pacifier icon and **Huck** on the left and the selected child's name on the right. Tap the name for directions, a small Close button, and a Settings shortcut that opens directly to the Child settings section; it does not switch children accidentally.

**Settings → Language** has a sliding, three-part selector: **English / Español / עברית**. The label always says **Language** in English, so it is easy to find after switching. Changes apply immediately and are remembered on this device. Dialogs, time wheels, validation, syncing, sharing and accessibility labels are translated. Hebrew uses a right-to-left layout, while clock values, time wheels, links and the chronological history chart retain their familiar direction. Names, timestamps and shared records are unchanged; short duration notation (h/m/s) and AM/PM stay the same. Future interface changes must include both Spanish and Hebrew translations and phone-layout checks.

Opening, reloading, navigating back to, or returning to the app starts at the top instead of restoring the previous page scroll position. Normal scrolling while using the app is unchanged.

- **Start nap now / Start sleep now** begins a timer immediately. A matching **Nap started at [time] · Adjust time** bar (Sleep at night) fades over eight seconds. Adjust opens Start expanded; a subtle **Still awake?** link asks for confirmation before canceling that accidental start and returning to the prior awake timer. Canceling removes that new record from visible history rather than creating a zero-minute nap, and preserves older sleeps. X/expiry only dismiss the bar. The start time determines whether it is called a nap or sleep, using the shared day/night schedule.
- **End Nap / End Sleep** ends that same session immediately. A dismissible **Nap ended at [time] · Adjust time** confirmation (Sleep at night) appears for about8 seconds. Adjust opens the end-focused editor and cancels the confirmation timeout; X or letting it fade away never changes the saved sleep. A subtle **Still napping? / Still sleeping?** link asks for confirmation before removing the end time and resuming the same timer. The session name does not change just because it crosses morning or evening.
- The awake screen has just **Start nap now** and **Enter nap manually**. Both the starting and ending sliders were removed. Use the manual editor for a backdated start, or Adjust after ending.
- During sleep, the linked time row reads **9:06 PM to Enter end time**. Tap the start time to edit it or Enter end time to open the end fields. Both links sit inside the timer's accent area.
- **Enter nap manually (Enter sleep manually at night)**, beside Start now, opens the same Add/Edit nap modal with **Still napping** selected and a start time five minutes ago. Choose **Nap ended** to enter both times instead. **Add sleep**, below Recent entries, opens that modal with a completed entry selected by default.
- While awake, the clickable detail shows **Last nap: 26 minutes long (start–end)**, with smaller muted clock times. Tap the duration or time range to edit that same entry.
- **Recent entries** shows today's latest three completed entries, newest first. Expand to see all of today's entries. Active sleep stays in the timer and chart, not this list.
- Tap a recent entry to edit. Tapping a history chart block selects it and shows its time range and duration below the chart, with a separate **Edit** link. Active sleep has a contrasting fill and an In progress label. **Still napping / Still sleeping** in the editor clears an accidental end time and resumes the same record, provided it does not overlap another sleep.
- Time edits require **Save**. **Cancel**, tapping outside, X, and Escape discard the draft, including a suggested end time. Opening Enter end time and closing it never ends the sleep. Existing entries also have **Delete**, with confirmation. Unchanged existing entries are not rewritten.
- Validation and sync messages raised while a modal is open appear inside its footer, above the buttons, not blurred behind the backdrop. Overlap errors identify the other sleep's date/times. Overlapping sleeps are still rejected: remove an accidental entry with its editor's Delete button, then reopen the original sleep and choose Still napping/sleeping. Only one sleep can run per child; rejected edits never merge or delete logs automatically.

## Time entry and history

The main confirmation row opens Adjust, including the underlined time and blank space. Its X only dismisses it; the secondary Still napping? link opens a protected Resume confirmation. Cancel/X/backdrop/Escape in that dialog leave the completed sleep untouched. The bar starts gently fading immediately and dismisses after eight seconds. Hover or keyboard focus pauses its countdown and restores full visibility. Reduced-motion/animations-off mode skips the fade. This is temporary local UI; saved sleep still syncs normally.

Backdated entries use the manual editor; there are no minutes-ago sliders on the main screen.

The editor uses in-page scrolling wheels for **day, hour, minute, and AM/PM**, with a curved/faded appearance and a highlighted selection row. Swipe or scroll each column, tap a nearby value, or focus a column and use arrow keys. The day wheel includes the past two years and preserves an older record's original date when editing. Today and Yesterday are labeled. Phone-native date/time sheets and the old +/-5m/5m ago shortcuts are not used.

The minute wheel loops continuously between **59 and 00** in either direction for both Start and End. This changes the minute only, not the hour, day, or AM/PM. Changes remain a draft until Save.

A matching **Now** button stays visible in both the Start and End headers. It resets that field's date and time, but does not save the record. Use Save at the bottom to apply the draft.

The modal labels its sections **Start** and **End**, each with a matching rounded Now button in the same place. End has a compact, inline sliding **Still napping / Nap ended** selector (Still sleeping / Sleep ended at night). Choosing Now for End also selects the ended state. Switching back and forth preserves the drafted end time. The duration stays visible above the footer buttons, including time so far for a running nap. Large **Save** is on the left, with smaller Cancel and an existing-record Delete icon on the right. Nothing is saved until Save is pressed.

For existing records, Start normally collapses to a clock-time summary and pencil. Tapping the active timer's start-time link opens Start expanded for immediate editing. Enter end time and Adjust keep Start collapsed and focus on End. The pencil expands/collapses Start without losing draft changes. New manual entries keep Start expanded. The Now control for Start appears when expanded; End's remains available in its header.

Manual starts default to five minutes ago. Adding past sleep defaults to an available gap of up to 45 minutes. Saving an unchanged record preserves its original timestamp precision.

The timer uses saved timestamps, not a background stopwatch. Closing the app does not stop it. Both sleeping and reliably recorded awake time show large hours/minutes with smaller ticking seconds on the same baseline. Estimated awake time keeps its ~minutes display without seconds; missing/stale wake times show a dash. Seconds update locally without network requests or per-second screen-reader announcements.

History columns are chronological, newest on the right and initially in view. The time axis stays fixed while dates scroll horizontally. By default each column covers **7 AM to the next 7 AM**, with nighttime shading from **8 PM**. Today is emphasized; older columns are quieter. Sleeps crossing a boundary are split visually but remain one editable record. Recent entries uses the full duration for each record intersecting the current period.

History starts with up to 30 days and automatically adds earlier columns as you scroll to the left edge, stopping at the first recorded day. A Show older days control also lives in the first column when more history is available. This only draws more of the already-loaded data; it does not request more Sheet data. Empty history shows a blank seven-day view. The selected block is outlined, and details below the chart can be dismissed with X.

Durations are actual elapsed time. On daylight-saving transition days, the actual 23/25-hour period is scaled into the fixed-height chart; spacing is approximate but timestamps and durations remain accurate. Blank chart areas mean no recorded sleep, not necessarily no sleep.

## Settings and shared data

| Saved to the child's/shared backend | Saved only on this browser/device |
| --- | --- |
| Children and sleep entries | Selected child |
| Each child's birthday and edited age ranges | Show wake-window info |
| Day/night schedule and forgotten-timer rules | Language, color theme, animations |
| Archive/restore state | Temporary Recent entries expansion |

Settings uses consistent collapsible sections: **Basic settings** (open initially), **Child settings**, **Animation settings**, **Wake-window settings**, **Sleep schedule & timer cleanup**, and **Advanced settings**. Basic starts with colors, followed by sleeping/awake icons, then Language. Child selection, adding a child and archive/restore controls are together in Child settings; Advanced now contains the sandbox, backend link, connection check and any earlier local backups. All animation controls, including presets, detailed effects and celebration threshold, are under Animation settings.

There is one unified Daybook layout; the Style selector and Compact/Orbit choices were removed. Old style preferences normalize to Daybook without changing records or other preferences. Colors remain **Original, Night, Berry, Mint, Midnight**. Night and Midnight stay dark with separate awake/sleep accents. Their previews have black surrounds/dividers independent of selection. Color/language/icon choices apply immediately; shared form fields use Save. The wake visibility toggle also applies immediately.

Each color theme is now a pair: Awake and Sleeping. Diagonally split swatches preview both colors. The page accents, background tint and action buttons switch automatically with the current state; Night stays dark in both states. **Sleeping icon** and **Awake icon** each have four choices in Settings, applied immediately and saved on this device. You can also tap the main mascot to cycle the current state's choices. Sleeping characters have floating Zs; awake characters bounce, peek or hop. Animation preferences still apply.

**Recent entries** uses compact editable tiles, keeping the latest three completed sleeps for the current day and an expand option. Muted **Wake window** separators show the interval between adjacent recorded sleeps. The active sleep stays in the main timer/history, and no current ongoing wake interval is added to the tiles. In Sleep history, **Show wake durations** adds dashed, awake-colored intervals alongside the existing sleep blocks; tap a visible interval for its duration and clock times. This toggle is saved locally and off initially. These gaps describe the logs, not proof the child was awake throughout an unlogged stretch; gaps after auto-ended records are approximate. Sleep and wake details show clock times only, including overnight entries.

Recent tiles are single44px rows: duration left, clock times right, with no icons or Nap/Sleep labels. Small wake-duration chips overlap the neighboring tile edges. **All today's entries / Show fewer** and the labeled-on-hover **+** add-entry icon share one footer row.

The koala-with-pacifier icon is used in the header, browser tabs and phone installation. **Save / Share** includes iPhone/Android installation instructions and a share link for the selected child. Installed apps use the same website/backend, not a separate native database. An already-installed home-screen icon may keep its old artwork until the shortcut is removed and added again.

While sleep is running, a wake-duration chip above the recent tiles shows the recorded gap immediately before this sleep. It uses the same small font, line height and padding as the other wake chips. It is not a new live timer or a fabricated gap. In history, small upward/downward chevrons indicate a sleep continuing from/to another chart day (normally 7 AM–7 AM). Selecting either segment highlights the entire sleep.

State artwork indicates sleeping/awake, not nighttime/daytime. Sleeping has floating Zs; awake has a playful baby face and sparkles. Completed naps make a curved flight into Recent entries with a landing bounce. Both the app's animation toggle and OS reduced-motion preference are respected.

The in-progress sleep block in history has bold drifting Zs at its edges and a gently pulsing inset border. Duration and Now remain readable and tappable; finished sleeps do not animate. Turning off animations or enabling reduced motion stops both effects.

The sleeping face has three original floating Zs plus five smaller, softer Zs drifting from different spots around its head. These are decorative only and add no network requests.

## Animation settings

Settings now includes **Animation settings** with an **Off / Gentle / Playful / Custom** slider. Playful is the default when animations were previously enabled; an existing disabled preference stays Off. Changes apply immediately and are saved on this device. Customize effects contains individual switches; changing one selects Custom. Returning to Custom restores the last manual combination.

- **Off:** no decorative motion; the nighttime grid and static awake-time marker remain usable.
- **Gentle:** floating characters/Zs, rolling timer values, mascot reactions, icon pops, entry expansion and the existing sleep-to-entry animation. Color ripples and celebrations are off.
- **Playful:** all effects on.
- **Custom:** your own combination, remembered independently of presets.

Timer adjustments count smoothly to their new elapsed value over about one second, in either direction. Ordinary ticks, refreshes and syncs do not replay the count-up, and a reset to zero stays immediate. Starting/ending sleep gives the mascot a settling or happy reaction and, when enabled, sends a brief color ripple from the action area. Changing a mascot pops the new icon; expanding today's entries gives additional tiles a small stagger.

The history chart keeps hour grid lines above nighttime shading in every color scheme. While awake, a colored line/dot marks the current clock time in today's column; it updates locally and disappears while sleeping.

**Celebrate nighttime sleep over** defaults to **3 hours** and is editable from0.5 to12 hours. With celebrations enabled, ending a sleep that started at night and exceeds the threshold produces a brief confetti burst and a duration message. This is a personal celebration preference, not a sleep recommendation. It fires only after a newly completed local action is confirmed by the backend (immediately in sample/local mode), at most once per sleep on that device. Rejected saves, imported/backfilled completed records, auto-ended timers, refreshes, repeated completed-entry edits, hidden pages and confirmations delayed over a minute do not celebrate. It does not replay from background sync. All effects respect OS reduced motion; hiding the page or disabling animations clears active effects. No sound or additional Sheet polling is used.

## Wake-window guide

The temporary start/end confirmation has a compact **Minutes ago** row (1–10). Tap a number to change that entry's start or end to that many minutes before the current time; the pop-up then dismisses automatically. Choices are absolute, not cumulative; invalid/overlapping choices are disabled. The pop-up expands/collapses its height and spacing smoothly (instant with reduced motion), including on dismissal or eight-second expiry. The full time editor, close button and confirmed undo options remain available. Use `?demo=1` to try it without changing shared history.

Open **Settings → Wake-window settings**. Turn on Show wake-window info and enter the child's birthday. Without a valid birthday, guidance stays hidden and a red birthday-required message appears. A missing birthday does not prevent saving unrelated settings.

There is no separate custom-range mode. The birthday selects a row from the editable age table automatically. Birthday and edited ranges sync to both phones as part of the child's profile. **Reset to defaults** restores the age table when saved, preserving the birthday. Clearing a birthday does not erase edited ranges. No birthday is assumed for Avi.

| Completed age | Initial approximate range |
| --- | --- |
| 0–4 weeks | 45–60 minutes |
| 4–8 weeks | 60–75 minutes |
| 2–3 months | 75–90 minutes |
| 4 months | 90–120 minutes |
| 5–6 months | 120–150 minutes |
| 7–8 months | 150–180 minutes |
| 9–12 months | 180–240 minutes |

Defaults match the **Target Wake Window** column in the first section of the [family sleep guide](https://docs.google.com/document/d/1qQL-HxmINgJCCvArtJ-SCII5kObWh8WlR1K6LfQDQXg/edit?tab=t.0#heading=h.xsxr01xg3wdc), as of 11/5/2026. That section is linked from both wake-window settings and the in-app guide. This is a static copy of the ranges, not a live Google Doc sync. The link requires whatever Google Doc access the owner grants; no sharing permissions were changed.

The first two boundaries use exactly 28 and 56 days; at 56 days, use the 2–3-month row until the fourth calendar-month birthday. Other bands use completed calendar months, with the final band ending at 13 months. Existing profiles with customized legacy ranges keep their original six-band table and values. Choose **Reset to defaults**, then **Save**, to adopt this seven-band table while preserving the birthday; the new profile configuration syncs across devices.

These are the family's configurable reference ranges, not medically validated deadlines. No feeding, nap-cap, or sleep-training rules from the document are automated. For general guidance, see [Cleveland Clinic](https://health.clevelandclinic.org/wake-windows-by-age) and [AAP infant sleep guidance](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/getting-your-baby-to-sleep.aspx). Follow sleepy/hunger cues and ask your pediatrician about individual needs or prematurity.

The main wake-window cue is a single subtle line **below the buttons**, shown only while awake during daytime with reliable logs and a configured birthday/range. It starts **15 minutes before the lower end** of the range. For a60–75-minute range: before45 minutes show nothing;45–59 show a muted green dot/range;60–75 use amber; after75 use muted rose until the log becomes stale. The wording stays **Target wake window 60–75 min**; only the small dot and range text change color. Tap it for the guide. There is no progress bar, extra status copy or nighttime message.

Auto-ended, missing, invalid or stale logs hide the target cue rather than guessing. Auto-ended logs may still show estimated awake time in the main timer. Missing/invalid/stale wake time shows a dash rather than a misleading long timer. Ranges remain approximate guides, not deadlines.

The missing-log heuristic marks a wake time stale after the longer of three hours or twice the upper range; without a range the fallback is six hours. This is a bookkeeping heuristic, not a medical threshold, and cannot detect every unrecorded nap.

## Forgotten timers

Initial rules are **daytime: four-hour cutoff → 90-minute replacement**, and **nighttime: 12-hour cutoff → four-hour replacement**. These are editable under Sleep schedule & timer cleanup. Classification uses when the sleep started in the shared `America/Los_Angeles` timezone.

These rules correct forgotten records; they do not advise how long a baby should sleep. Corrected entries are labeled Auto-ended and remain editable. New settings can affect still-running sleeps.

With Firestore, corrections are derived on reopening and persisted atomically with the next edit, not by a scheduled alarm. There are no background notifications. Local/sample mode derives the same correction on reopening.

## How syncing works

The website connects directly to Cloud Firestore using the permanent public configuration in `config.js`; neither phone pastes anything. The [household Sheet](https://docs.google.com/spreadsheets/d/1y7s7IP4Un91hPcqQMFYW6NAZ_S6cEUZBbJdHc9cdWMQ/edit) is the retained pre-migration backup.

1. A valid edit updates the screen and is saved in a durable local outbox before networking.
2. Pending edits are sent directly and each successful command returns the authoritative state. With no pending edit, sync fetches a snapshot. A rejected edit triggers a fresh read for conflict review.
3. Request IDs prevent retry duplicates. Firestore transactions atomically save records, shared revision and request receipts; revisions and overlap checks reject conflicting edits. Migrated Sheet request IDs also deduplicate old pending acknowledgements.
4. Network failures remain pending and retry automatically, using the same request ID. Retries back off from about 5 seconds to at most 47 seconds. Real edit conflicts remain visible for explicit review rather than silently replacing the other phone's work.

Opening/reload and foreground return obtain fresh server data. While visible, a live listener delivers changes from other devices without polling. Hidden tabs unsubscribe and reconnect on return. There is no periodic Firestore sync check: failed saves schedule their own retry. A once-a-minute local-only refresh keeps the history chart and date sections current without network calls; display seconds still tick locally each second. These screen refreshes pause while hidden and do not rebuild an open editor. The header/footer indicate syncing, pending, synced, unavailable or conflict status; an immediate optimistic change is not proof of a completed save.

Requests time out after 35 seconds. If a phone suspended its timers and returns with a request older than 40 seconds, the app cancels that stale client request and retries safely; the server may already have saved it, so the original request ID is retained. Retry timers pause while hidden. Advanced settings → Check connection and returning online can retry immediately. Do not clear browser storage to fix syncing: it can contain unsent records.

**Clock limitation:** Firestore currently validates times using the device clock. Server timestamps record receipt time, but do not calibrate the phone or validate supplied sleep timestamps. Keep automatic date/time enabled. The old Apps Script server-clock calibration applies only when using the legacy Sheets adapter, not Firestore.

Settings writes also check the shared revision. If another phone changed things meanwhile, reopen settings before retrying. A blocked outbox item must be resolved/discarded before new edits can be queued.

If Save is blocked by a rejected earlier change, the editor now shows its actual rejection reason and **Discard rejected change** directly above Save. This discards only that explicitly selected failed command, not saved sleep logs or other queued changes, and preserves the current editor draft. A recovery copy is saved locally under `huck-discarded-changes-v1` before discarding; if backup fails, nothing is discarded. Try Save again afterward. If the sleep itself changed on another phone, close/reopen the entry before applying your edit. The footer's Review sync issue offers the same one-at-a-time resolution outside an editor. Do not clear browser storage to fix this.

Storage belongs to an origin: localhost, a different local port, and GitHub Pages have separate preferences/outboxes. They still read the same backend when configured. This is not an offline-first service-worker app; there is no service-worker cache.

Earlier real local-only records are backed up before connecting to the backend. Settings exposes explicit import/download of that backup when available. Import checks overlaps and existing IDs and keeps the backup. Samples are never imported.

## Safe testing

Open **Settings → Advanced settings → Open testing sandbox**, or [the sample sandbox](https://talrme.github.io/huck/?demo=1). Its banner clearly says sample data. It uses separate device-local storage and never reads/writes the household backend. It supports the same editing, settings, children, and timer interactions. Reset sample history and Open real tracker are available in Advanced settings.

For actual two-phone syncing tests, a clearly named Test child in the real tracker is useful, but those are real shared records. Archive the child afterward; history is preserved. At least one child must remain active, and a child with active sleep cannot be archived.

A pretend clock, jump-ahead buttons, and preset test scenarios have been discussed but are **not implemented**. Do not change your phone clock to test real records.

## Legacy Google Sheets setup, step by step

Production no longer needs Apps Script changes or a publicly editable Sheet. These retained instructions describe the old Sheets backend for reuse or a deliberately planned rollback. Do not simply point the frontend back to the old Sheet: new Firestore entries must be exported/reconciled first.

1. Create/open your Sheet in its owner account. Keep it private; no public editing or publishing is needed.
2. Choose **Extensions → Apps Script**. A new editor tab opens.
3. Rename the Apps Script project **Huck** (or the new project's name).
4. Open `Code.gs`. Replace all starter code with the complete generated `backend.sample.gs`. Despite its filename, this is the deployable script, not fake data. Do not paste only `tools/backend-tail.gs`.
5. For a different Sheet, first update the Sheet ID in `tools/backend-tail.gs` and run the build below. Save the pasted script with Command+S/the Save icon.
6. In the function dropdown next to Run, select **setupHuck**, then click **Run**.
7. Approve the requested permissions in your account. If Google labels your own script unverified, review the script/account before using Advanced to proceed. Organization policies may prevent deployment.
8. Wait for **Execution completed**. The Sheet should have a **HuckEvents** tab with `id | receivedAt | command` headers. Setup does not clear other tabs or add fake sleep records. Do not manually rearrange/edit this event log.
9. Choose **Deploy → New deployment**.
10. Click the gear beside Select type and choose **Web app**.
11. Set **Execute as: Me** and **Who has access: Anyone** (not only signed-in users). This exposes the API, not the Sheet itself.
12. Click **Deploy**, complete authorization, and copy the complete Web app URL ending in `/exec`. Do not use the `/dev` testing URL or just a deployment ID.
13. Put that endpoint and the Sheet URL into `config.js` in the repository. Neither phone needs configuration. Keep sample mode isolated.
14. Verify reads first. Test real writes only with explicit permission/disposable records, and verify a fresh read afterward. Publish the frontend separately through GitHub Pages.

The Sheet can remain private because Apps Script runs as its owner. **The endpoint itself has no authentication:** anyone with it can read/change shared records, including profile birthdays. This is a convenience tool for trusted family use, not a private medical record system. Avoid broad distribution or sensitive information.

For Pages, select **Settings → Pages → Deploy from a branch → main → / (root) → Save** in GitHub. Deployment can take time after pushing; verify the live page before assuming a push is visible.

References: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service).

## When Apps Script needs updating

This section is legacy documentation only. The current Firestore site does not call Apps Script; no owner redeployment is needed for this switch. Browser code changes deploy through GitHub Pages; Firebase security rules require a separate rules deployment.

**November 1 clock calibration update:** The deployed backend was still `2026-10-31-lock-retry` when checked. The frontend retry fix works now; server-clock calibration requires replacing Code.gs with the complete latest `backend.sample.gs`, saving, then **Deploy → Manage deployments → pencil → New version → Deploy**, keeping the same URL. The expected new backend version is `2026-11-01-clock-sync`. No Sheet reset or reimport is needed. Do not copy a diff view; use the full file contents.

**October 31 lock recovery update:** The frontend recovery works with the existing backend. The latest generated backend also waits only two seconds for a lock (instead of 25), returns an explicitly retryable busy response, opens the Sheet only once per request, and flushes new events before unlocking. **These backend changes still require the owner to deploy the latest script; a GitHub push does not deploy Apps Script.**

1. Open the household Sheet → Extensions → Apps Script.
2. Replace all of Code.gs with the complete current `backend.sample.gs`, then Save.
3. Deploy → Manage deployments → pencil → Version: New version → Deploy.
4. Keep Execute as Me, access Anyone, and the same /exec URL. Do not clear the Sheet or rerun imports.
5. Reload Huck on each phone to load the frontend recovery. Existing unsent entries stay on the device and retry automatically.

See [PERFORMANCE_REVIEW.md](PERFORMANCE_REVIEW.md) for growth concerns and the proposed checkpoint upgrade.

Measured live refresh results are in [benchmarks/README.md](benchmarks/README.md). In the November3 pre-switch comparison (16 runs per backend), total first-open medians were3.10s Sheets versus0.82s Firestore; cached-reload medians were1.89s versus0.265s. Both used real Pages URLs on the same desktop connection; Sheets had86 entries versus84 synthetic staging entries. All32 final runs succeeded. These are not physical-phone, long-term reliability or scaling guarantees. Firestore still loads all entry documents on opening, so reads and chart work grow with history; pagination is a future improvement.

Frontend layout, artwork, animations, wake-range lookup, and preferences do not require redeployment. Current birthday/age-range metadata uses an already-supported shared-settings action.

Changing backend actions, validation, event replay, or `shared/core.js` rules does require deployment:

1. Run `node tools/build.mjs`.
2. Replace all of Apps Script `Code.gs` with generated `backend.sample.gs`, then save.
3. Choose **Deploy → Manage deployments → pencil → Version: New version → Deploy**.
4. Keep the same deployment URL. Editor changes alone do not update the deployed API.
5. Verify the deployed behavior and tell users clearly when their action is required.

## Local development and tests

Firestore regressions: `node tests/firestore.cjs` and `node tests/firestore-cutover.cjs` use disposable live `test-*` environments and clean them up. `node tests/firestore-production-readonly.cjs` verifies the real production page without edits; set `HUCK_CHECK_URL` to check Pages instead of localhost. A private snapshot path can be passed to compare migrated fields. Never point write/cleanup tests at real production.

Canonical checkout: `/Users/talg/Desktop/Websites For Fun/huck`. All new personal websites belong under **Websites For Fun** unless explicitly requested elsewhere.

Use a modern Node.js runtime (Node 24 is used in the current environment):

```sh
node tools/build.mjs
node tools/serve.cjs
```

Open [http://127.0.0.1:5190/](http://127.0.0.1:5190/). The server also supports `/huck/`. If the port is occupied, use `PORT=5191 node tools/serve.cjs`. Cursor Live Server can serve the parent folder at `http://127.0.0.1:5500/huck/`; use that path rather than assuming `/index.html` is at its root.

Edit `tools/page.html` and `shared/` source files. The build generates `index.html`, `manifest.webmanifest`, and `backend.sample.gs`; it must not recreate staging folders. Update asset version tokens when changing JS/CSS so browsers fetch the new version.

Pure tests need only Node:

```sh
node tests/core.test.cjs
node tests/backend.test.cjs
node tests/wake.test.cjs
```

Browser tests need Playwright and Google Chrome. Optional icon regeneration needs sharp. These libraries are available in the current Codex runtime; otherwise install them locally, for example `npm install --no-save --package-lock=false playwright sharp`. Most browser tests use macOS Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Adapt that path on another machine.

| Browser test | Checks |
| --- | --- |
| `tests/performance.cjs` | Synthetic large history, one-request saves, cache expiry, retries/conflicts |
| `tests/browser.cjs` | Main workflows, styles/themes, simulated two-device sync; starts its own server |
| `tests/header-language.cjs` | Compact header, koala assets, English/Spanish settings and dialogs, local persistence, five palettes, continuation markers, shared-data preservation and phone/desktop fitting |
| `tests/hebrew.cjs` | Hebrew translation coverage, sliding selector, RTL, English label, draft/data preservation, persistence, time entry, sharing and layouts across themes/styles/phone-desktop widths |
| `tests/time-editor.cjs` / `tests/time-wheels.cjs` | Custom wheels, simulated touch/keyboard, Now, explicit Save/Cancel, active-end dismissal regression, validation, themes and phone/desktop fit |
| `tests/end-controls.cjs` / `tests/end-adjust.cjs` | Immediate End, dismiss/8s expiry, non-expiring Adjust editor, collapsed Start, manual starts, themes/widths and motion |
| `tests/recent-naps.cjs` | Latest-three expansion, resume sleep, overlap protection, sandbox isolation |
| `tests/sleep-labels.cjs` | Day/night boundaries and edited/backdated start naming |
| `tests/timer-polish.cjs` | Inline seconds, long-duration fit, imagery and delayed sync indicator |
| `tests/wake.browser.cjs` | Shared birthdays/ranges, local toggle, reset, missing birthday/logs |

Except the main browser test, start the local server on port 5190 first. Run a test with `node tests/<name>.cjs`. Automated tests do not touch the real Sheet or emulate a physical OS picker. Screenshots are written under `/tmp`, not committed previews. Keep both this file and [AI_README.md](AI_README.md) current.

## Artwork and licenses

App/favicon/home-screen icon: generated koala face with a mint pacifier. The transparent original is preserved in `shared/koala-pacifier-original.png`; `node tools/icons.cjs` regenerates the padded PNG sizes using sharp. Generation prompt and provenance are in AI_README.md. The previous Lucide Lab pacifier asset/license remain bundled but are no longer the app icon.

State images: sleeping face `1f634`, baby `1f476`, teddy `1f9f8`, cat `1f431`, koala `1f428`, smile `1f604`, fox `1f98a`, and chick `1f425`, Twitter [Twemoji v14.0.2](https://github.com/twitter/twemoji), CC BY 4.0. They are bundled tiny PNGs animated with CSS, not GIFs or remote runtime downloads. Legacy moon/sun assets are unused. UI icons use bundled Lucide; license in `shared/LUCIDE-LICENSE`.
