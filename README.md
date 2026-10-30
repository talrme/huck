# Huck

**Live site:** https://talrme.github.io/huck/ (available once GitHub Pages is enabled)

**Repository:** https://github.com/talrme/huck

Phone-first sleep tracking for Avi, with support for additional children. The selected Daybook design is the main app. No account is required to use the website.

## Current connection

Apps Script is deployed and permanently configured in config.js for the app. Its public snapshot was verified successfully with Avi, an empty sleep history, and the expected schedule settings. You do not need to configure anything on either phone. The root app uses shared real records. Optional ?demo=1 uses a separate browser-only sample sandbox and never calls the backend. Real write/cross-phone verification has not yet been performed against the household Sheet; automated write tests use a simulated backend.

## Use Huck

Open the live link above, or run `node tools/serve.cjs` and open http://127.0.0.1:5190/ . Cursor Live Server can also serve `huck/` from Websites For Fun. All staging folders, the chooser and preview images have been removed.

Settings offers independent Style (Daybook, Orbit, Compact) and Color theme (original periwinkle, Night, Berry, Mint) choices. They apply immediately, persist on this device, and do not affect sleep data. Fresh devices default to Daybook. Existing device color preferences and saved records are preserved. For explicitly fictional sample data only, open ?demo=1; samples remain separate and are never uploaded.

## Connect your Google Sheet, step by step

Your Sheet: https://docs.google.com/spreadsheets/d/1y7s7IP4Un91hPcqQMFYW6NAZ_S6cEUZBbJdHc9cdWMQ/edit

1. Open the Sheet while signed into the Google account that owns it. Keep the Sheet private. No public editing or publishing is needed.
2. In the Sheet's top menu, choose **Extensions → Apps Script**. A new editor tab opens.
3. Click the project name, usually **Untitled project**, at the top. Rename it **Huck**.
4. Open `Code.gs` in the editor. Select all its starter code and replace it with the COMPLETE contents of `backend.sample.gs` from this folder. This is one self-contained file; do not paste only `tools/backend-tail.gs`.
5. Click the disk-shaped **Save** icon, or press Command+S. Wait for the saving indicator to finish.
6. In the function dropdown next to **Run**, select **setupHuck**. Click **Run**.
7. Google will ask for authorization. Click **Review permissions**, choose your account, review the permissions, and approve. For your own unverified script, Google may show **Advanced → Go to Huck (unsafe)**; proceed only after confirming this is the script you just created in your account. Organizational policies can block this flow.
8. Wait for **Execution completed**. Go back to the Sheet: a new **HuckEvents** tab should exist. Leave its headers and contents alone. Setup never clears other tabs, and it does not add dummy sleep records.
9. Return to Apps Script. Click **Deploy → New deployment**.
10. Beside **Select type**, click the gear and choose **Web app**.
11. Set **Description** to `Huck v1`, **Execute as** to **Me**, and **Who has access** to **Anyone** (not “Anyone with a Google account”). This exposes the app endpoint, not the spreadsheet itself.
12. Click **Deploy** and finish any authorization prompts. Deployment makes this saved version callable by the website.
13. Under **Web app**, copy the full URL ending in `/exec`. Send that URL to me. Do not send the deployment ID or the `/dev` test URL instead.
14. I will put the URL permanently in `config.js`, verify read/write sync using disposable test records with your approval, and connect the app. Neither phone needs to paste any configuration.

After deployment, the Sheet can remain private. Anyone who knows the endpoint can read/change these shared records: this is a simple family tool, not an authenticated private medical record system. Avoid putting sensitive personal details in it or distributing the URL broadly.

## What still needs to happen

- Apps Script deployment and permanent URL configuration are complete. Reload Huck to connect; no configuration is needed on individual phones.
- GitHub repository: https://github.com/talrme/huck . In its Settings → Pages, choose Deploy from a branch, main, / (root), and Save. The root page is the selected Daybook app. The website will appear at the live link above after GitHub finishes deploying.
- Install the main root app on both phones. Old staging links are retired; use the root live link. No new Apps Script deployment is needed for this promotion.

## Tracking and cleanup

- Start now, five minutes ago, ten minutes ago, or at a custom time. While sleeping, the primary button reads End nap during daytime or End sleep at night (based on the current shared home time). Three subtle controls below it offer Ended 5m ago, Ended 10m ago, and Edit time. Edit any start/end time and add past sleep manually.
- The phone time editor separates Today / Yesterday / Choose date from the native time picker, with five-minute adjustments and Now / 5m ago shortcuts. Custom starts default to five minutes ago. Past sleep defaults to a 45-minute gap ending now, or the most recent available gap. Existing entries retain their original timestamps when saved unchanged. A live duration preview flags invalid or future times before saving. Running sleep shows Ended with a Set time button. Tap it to reveal the end controls, defaulted to now. Clear hides them again without ending sleep. Saving without an end time keeps the timer running.
- Valid changed times also save when you tap outside the editor, press its X, or press Escape. Invalid changes keep the editor open for correction. Merely opening/closing an editor does not create or rewrite records. A committed minute change blurs the native time field to dismiss its picker where the browser supports it; hour-only changes keep focus. Native picker behavior still varies by phone OS.
- Time is saved as absolute timestamps, not a background stopwatch. Closing the app does not stop a running sleep.
- Active sleep shows hours/minutes with smaller, ticking seconds underneath, even for longer sleeps. Awake time, history and totals stay at minute precision. The seconds update locally, without extra network calls or screen-reader announcements every second.
- Below the current timer, Today's naps lists sleep intersecting the current 7 AM–7 AM period, earliest first. Durations are bold and times are muted; tap a row to edit. The former three summary stats and separate last-sleep row are removed. Today's chart column has a tinted background, accented header/edges and stronger blocks; older blocks use quieter fills while keeping labels readable. A sleep crossing a day boundary is listed once with its full duration, matching the editable record.
- The chart runs from 7 AM to 7 AM, with newest dates on the right and a stationary time axis. Night shading begins at 8 PM. Sleep is split visually at day boundaries but remains one editable record. Durations use actual elapsed time. On daylight-saving transition days, the 24-hour chart compresses/stretches that day's time spacing; the saved timestamps and durations remain accurate.
- Daytime sleeps running four hours are corrected to 90 minutes. Nighttime sleeps running 12 hours are corrected to four hours. These are provisional bookkeeping defaults, not baby sleep recommendations. Rules use the start time of each sleep and the shared America/Los_Angeles timezone. All cutoffs, replacements, day start, and night start are editable in Settings.
- With Sheets connected, automatic cleanup is persisted during the next server request, even if the app was closed at the cutoff. No background job or notification is required. Local/sample mode derives the same correction on reopening.
- Child archive preserves history and supports restoration. At least one child stays active; end an active sleep before archiving its child.

## Sync behavior

Check immediately on opening, refresh, foreground return, and reconnection; poll every 15 seconds while visible, including for active naps, and pause when hidden. Timer display itself updates each second locally without network calls.

Edits update the screen immediately and enter a durable browser-local outbox before networking. They retry on reconnect/reopen. Backend script locks serialize commands; unique request IDs make retries idempotent. Entry revisions reject stale edits, concurrent starts cannot create two active timers, and overlapping sleeps are rejected. Conflicting changes stay marked for review, rather than silently replacing another phone's work. Discard the conflicting pending change to use the shared record and retry your edit.

Shared: children, sleeps, schedule/cleanup rules. Device-local: color theme, layout style, motion, selected child. Sample mode never syncs. The app loads no data or pages through a service-worker cache. JSONP is used for Apps Script compatibility with a static website.

If you saved real records before connecting the backend, the original local state is backed up automatically in this browser. Settings → Earlier local records lets you import them explicitly or download the JSON backup. Imports validate for overlaps before queuing anything, skip existing IDs, and keep the backup. They never include demo records. Already synced records remain authoritative until you choose to import.

## Updating Apps Script later

Appearance and ordinary frontend changes do not require redeployment. Backend actions, validation, data model, and the rules in `shared/core.js` do. Run `node tools/build.mjs` to regenerate the self-contained script, replace Code.gs, save, then **Deploy → Manage deployments → pencil → Version: New version → Deploy**. Keep the deployment URL unchanged. Changes in the editor alone do not update the deployed web app.

## Development and tests

`node tools/build.mjs` copies tools/page.html to the production index.html and regenerates the root manifest and backend.sample.gs. Edit tools/page.html and shared files, not generated index.html. It never recreates staging folders.

`node tests/core.test.cjs` checks data rules without dependencies. `node tests/browser.cjs` uses Playwright and Chrome to test all three styles on phones and desktop, settings, sleep editing, samples, chart scrolling, and multi-device sync through a simulated backend. Tests do not access your real Sheet. Screenshots are generated into a temporary test directory, not committed previews.

Assets: moon and sun artwork from Twitter Twemoji, CC BY 4.0, https://github.com/twitter/twemoji . Icons: Lucide, ISC license included in shared/LUCIDE-LICENSE.

Favicon and home-screen artwork: Lucide Lab baby-pacifier, https://github.com/lucide-icons/lucide-lab/blob/main/icons/baby-pacifier.svg ; license in shared/LUCIDE-LAB-LICENSE. Run `node tools/icons.cjs` with sharp installed to regenerate 32/180/192/512-pixel PNGs. Moon/sun remain timer-state artwork. Run `node tests/time-editor.cjs` against the local preview server for additional editor and icon checks. Native mobile picker sheets are provided by the phone OS; automated checks verify browser behavior/layout, not a physical iOS/Android picker.

Google setup references: https://developers.google.com/apps-script/guides/web and https://developers.google.com/apps-script/reference/lock/lock-service .
