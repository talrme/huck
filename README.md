# Huck

**Live site:** [talrme.github.io/huck](https://talrme.github.io/huck/)

**Repository:** [talrme/huck](https://github.com/talrme/huck)

A phone-first sleep tracker for Tal and Sophie to track Avi's sleep across both phones. Additional children are supported. No account or per-phone backend configuration is required.

## Current status

The production app is connected to Google Sheets through the Apps Script URL in `config.js`. Daybook, originally staging option 10, is the default design. The staging folders and chooser were removed; use the root live link.

On October 30, 2026, 24 user-approved sleep records were imported from two screenshots covering October 19–30. Times were estimated to about five minutes in Pacific time; blank periods were left alone, existing records were preserved, and the saved entries were verified by reading the backend again. This history is approximate and incomplete, not a complete account of sleep. Automated tests use isolated samples or a simulated backend, not the household Sheet. Two actual phones have not been used in an automated end-to-end test.

The app is already configured. The setup instructions below are for recreating or changing the backend, not something either phone needs to repeat.

## Everyday use

Opening, reloading, navigating back to, or returning to the app starts at the top instead of restoring the previous page scroll position. Normal scrolling while using the app is unchanged.

- **Start nap now / Start sleep now** begins a timer immediately. The start time determines whether it is called a nap or sleep, using the shared day/night schedule.
- **End nap now / End sleep now** ends that same session. Its name does not change just because it crosses morning or evening.
- For a delayed entry, use **Started/Ended a few minutes ago?** The slider stays at **1–10 minutes**, defaulting to three. The preview shows the offset and clock time; the small Start/End button records it. Dragging alone never saves. Warnings stay hidden until you move the slider or try its Start/End button. An invalid attempt explains the conflict and disables confirmation without changing the scale. Now actions reset this interaction state.
- During sleep, the linked time row reads **9:06 PM to Enter end time**. Tap the start time to edit it or Enter end time to open the end fields. Both links sit inside the timer's accent area.
- A clock button beside Start now opens manual start entry. **Add sleep**, below Recent naps, adds an older completed sleep.
- While awake, the detail emphasizes the last duration: **Last nap 26 minutes long**.
- **Recent naps** shows today's latest three completed entries, newest first. Expand to see all of today's entries. Active sleep stays in the timer and chart, not this list.
- Tap a recent entry to edit. Tapping a history chart block selects it and shows its time range and duration below the chart, with a separate **Edit** link. Active sleep has a contrasting fill and an In progress label. **Still napping / Still sleeping** in the editor clears an accidental end time and resumes the same record, provided it does not overlap another sleep.
- Time edits require **Save**. **Cancel**, tapping outside, X, and Escape discard the draft, including a suggested end time. Opening Enter end time and closing it never ends the sleep. Existing entries also have **Delete**, with confirmation. Unchanged existing entries are not rewritten.

## Time entry and history

The slider's Start/End confirmation button includes a tiny, muted second line (for example, **3m ago**) that follows the selected offset. Screen readers get the full wording. The main Now action is unchanged.

The editor uses in-page scrolling wheels for **day, hour, minute, and AM/PM**, with a curved/faded appearance and a highlighted selection row. Swipe or scroll each column, tap a nearby value, or focus a column and use arrow keys. The day wheel includes the past two years and preserves an older record's original date when editing. Today and Yesterday are labeled. Phone-native date/time sheets and the old +/-5m/5m ago shortcuts are not used.

A subtle **Now** link stays visible for both Started and Ended whenever that field is shown. It resets that field's date and time, but does not save the record. Use Save at the bottom to apply the draft.

Manual starts default to five minutes ago. Adding past sleep defaults to an available gap of up to 45 minutes. Saving an unchanged record preserves its original timestamp precision.

The timer uses saved timestamps, not a background stopwatch. Closing the app does not stop it. Active hours/minutes stay large, with smaller ticking seconds on the same baseline. Seconds update locally without network requests or per-second screen-reader announcements.

History columns are chronological, newest on the right and initially in view. The time axis stays fixed while dates scroll horizontally. By default each column covers **7 AM to the next 7 AM**, with nighttime shading from **8 PM**. Today is emphasized; older columns are quieter. Sleeps crossing a boundary are split visually but remain one editable record. Recent naps uses the full duration for each record intersecting the current period.

History starts with up to 30 days and automatically adds earlier columns as you scroll to the left edge, stopping at the first recorded day. A Show older days control also lives in the first column when more history is available. This only draws more of the already-loaded data; it does not request more Sheet data. Empty history shows a blank seven-day view. The selected block is outlined, and details below the chart can be dismissed with X.

Durations are actual elapsed time. On daylight-saving transition days, the actual 23/25-hour period is scaled into the fixed-height chart; spacing is approximate but timestamps and durations remain accurate. Blank chart areas mean no recorded sleep, not necessarily no sleep.

## Settings and shared data

| Saved to the child's/shared backend | Saved only on this browser/device |
| --- | --- |
| Children and sleep entries | Selected child |
| Each child's birthday and edited age ranges | Show wake-window info |
| Day/night schedule and forgotten-timer rules | Style, color theme, animations |
| Archive/restore state | Temporary Recent naps expansion |

Styles are **Daybook, Orbit, Compact**. Colors are **Original** (periwinkle), **Night, Berry, Mint**. Style/color choices apply immediately; other form fields use Save. The wake visibility toggle also applies immediately.

The pacifier icon is used for browser tabs and phone installation. **Save / Share** includes iPhone/Android installation instructions and a share link for the selected child. Installed apps use the same website/backend, not a separate native database.

State artwork indicates sleeping/awake, not nighttime/daytime. Sleeping has floating Zs; awake has a playful baby face and sparkles. Completed naps make a curved flight into Recent naps with a landing bounce. Both the app's animation toggle and OS reduced-motion preference are respected.

## Wake-window guide

Open **Settings → Wake-window settings**. Turn on Show wake-window info and enter the child's birthday. Without a valid birthday, guidance stays hidden and a red birthday-required message appears. A missing birthday does not prevent saving unrelated settings.

There is no separate custom-range mode. The birthday selects a row from the editable age table automatically. Birthday and edited ranges sync to both phones as part of the child's profile. **Reset to defaults** restores the age table when saved, preserving the birthday. Clearing a birthday does not erase edited ranges. No birthday is assumed for Avi.

| Completed age | Initial approximate range |
| --- | --- |
| Under 1 month | 30–60 minutes |
| 1–2 months | 60–120 minutes |
| 3–4 months | 75–150 minutes |
| 5–6 months | 120–240 minutes |
| 7–9 months | 150–270 minutes |
| 10–11 months | 180–360 minutes |

From 12 months there is currently no supported age band. These broad ranges are adapted from [Cleveland Clinic](https://health.clevelandclinic.org/wake-windows-by-age); see also [AAP infant sleep guidance](https://www.healthychildren.org/English/ages-stages/baby/sleep/Pages/getting-your-baby-to-sleep.aspx). They are approximate cues, not deadlines, predictions, or instructions to keep a baby awake. Follow sleepy/hunger cues and ask your pediatrician about individual needs or prematurity.

Daytime cues progress from Recently awake to Within usual nap range to Beyond usual range. Nighttime is neutral. Auto-ended logs produce estimated wake time without a colored range judgment. Missing/invalid/stale wake time shows a dash rather than a misleading long timer.

The missing-log heuristic marks a wake time stale after the longer of three hours or twice the upper range; without a range the fallback is six hours. This is a bookkeeping heuristic, not a medical threshold, and cannot detect every unrecorded nap.

## Forgotten timers

Initial rules are **daytime: four-hour cutoff → 90-minute replacement**, and **nighttime: 12-hour cutoff → four-hour replacement**. These are editable under Sleep schedule & timer cleanup. Classification uses when the sleep started in the shared `America/Los_Angeles` timezone.

These rules correct forgotten records; they do not advise how long a baby should sleep. Corrected entries are labeled Auto-ended and remain editable. New settings can affect still-running sleeps.

With Sheets connected, corrections are persisted during the next backend request, not by a scheduled alarm. There are no background notifications. Local/sample mode derives the same correction on reopening.

## How syncing works

The website talks to a small Apps Script API backed by the private [household Sheet](https://docs.google.com/spreadsheets/d/1y7s7IP4Un91hPcqQMFYW6NAZ_S6cEUZBbJdHc9cdWMQ/edit). The permanent endpoint is in `config.js`; neither phone pastes it.

1. A valid edit updates the screen and is saved in a durable local outbox before networking.
2. Pending edits are sent directly and each successful command returns the authoritative state. With no pending edit, sync fetches a snapshot. A rejected edit triggers a fresh read for conflict review.
3. Request IDs prevent retry duplicates. Backend locks serialize requests; revisions and overlap checks reject conflicting edits.
4. Network failures remain pending and retry on a later sync. Conflicts remain visible for explicit review rather than silently replacing the other phone's work.

Checks run on opening/reload, foreground return, reconnection, and every 15 seconds while the page is visible. Hidden tabs do not start new sync cycles. Display seconds are independent of polling. A small animated **Syncing** indicator beside the title is visible during requests; the footer reports pending, synced, unavailable, or conflict status. Apps Script requests can take several seconds; this is not instant push synchronization.

Settings writes also check the shared revision. If another phone changed things meanwhile, reopen settings before retrying. A blocked outbox item must be resolved/discarded before new edits can be queued.

Storage belongs to an origin: localhost, a different local port, and GitHub Pages have separate preferences/outboxes. They still read the same backend when configured. This is not an offline-first service-worker app; there is no service-worker cache.

Earlier real local-only records are backed up before connecting to the backend. Settings exposes explicit import/download of that backup when available. Import checks overlaps and existing IDs and keeps the backup. Samples are never imported.

## Safe testing

Open **Settings → Advanced settings → Open testing sandbox**, or [the sample sandbox](https://talrme.github.io/huck/?demo=1). Its banner clearly says sample data. It uses separate device-local storage and never reads/writes the household backend. It supports the same editing, settings, children, and timer interactions. Reset sample history and Open real tracker are available in Advanced settings.

For actual two-phone syncing tests, a clearly named Test child in the real tracker is useful, but those are real shared records. Archive the child afterward; history is preserved. At least one child must remain active, and a child with active sleep cannot be archived.

A pretend clock, jump-ahead buttons, and preset test scenarios have been discussed but are **not implemented**. Do not change your phone clock to test real records.

## Google Sheets setup, step by step

The current app is already connected. To reproduce it for another project or replace the backend:

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

The current performance update includes an optional adapter cleanup that avoids duplicate Sheet lookups/header reads. Its frontend improvements work with the existing deployment. To enable the additional server-side cleanup, replace Code.gs with the generated script and deploy a new version using the steps below. See [PERFORMANCE_REVIEW.md](PERFORMANCE_REVIEW.md) for measured synthetic results, growth concerns and the proposed checkpoint upgrade.

Frontend layout, artwork, animations, wake-range lookup, and preferences do not require redeployment. Current birthday/age-range metadata uses an already-supported shared-settings action.

Changing backend actions, validation, event replay, or `shared/core.js` rules does require deployment:

1. Run `node tools/build.mjs`.
2. Replace all of Apps Script `Code.gs` with generated `backend.sample.gs`, then save.
3. Choose **Deploy → Manage deployments → pencil → Version: New version → Deploy**.
4. Keep the same deployment URL. Editor changes alone do not update the deployed API.
5. Verify the deployed behavior and tell users clearly when their action is required.

## Local development and tests

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
| `tests/time-editor.cjs` / `tests/time-wheels.cjs` | Custom wheels, simulated touch/keyboard, Now, explicit Save/Cancel, active-end dismissal regression, validation, themes and phone/desktop fit |
| `tests/end-controls.cjs` | Slider behavior, control layout, arrival/motion effects |
| `tests/recent-naps.cjs` | Latest-three expansion, resume sleep, overlap protection, sandbox isolation |
| `tests/sleep-labels.cjs` | Day/night boundaries and edited/backdated start naming |
| `tests/timer-polish.cjs` | Inline seconds, long-duration fit, imagery and delayed sync indicator |
| `tests/wake.browser.cjs` | Shared birthdays/ranges, local toggle, reset, missing birthday/logs |

Except the main browser test, start the local server on port 5190 first. Run a test with `node tests/<name>.cjs`. Automated tests do not touch the real Sheet or emulate a physical OS picker. Screenshots are written under `/tmp`, not committed previews. Keep both this file and [AI_README.md](AI_README.md) current.

## Artwork and licenses

App/favicon/home-screen icon: [Lucide Lab baby pacifier](https://github.com/lucide-icons/lucide-lab/blob/main/icons/baby-pacifier.svg), with its license in `shared/LUCIDE-LAB-LICENSE`. `node tools/icons.cjs` regenerates the PNG sizes using sharp.

State images: sleeping face `1f634` and baby face `1f476`, Twitter [Twemoji v14.0.2](https://github.com/twitter/twemoji), CC BY 4.0. They are bundled tiny PNGs animated with CSS, not GIFs or remote runtime downloads. Legacy moon/sun assets are unused. UI icons use bundled Lucide; license in `shared/LUCIDE-LICENSE`.
