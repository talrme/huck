# Huck Firestore Staging

**Staging site:** https://talrme.github.io/huck/staging/firebase/

**Production, still using Google Sheets:** https://talrme.github.io/huck/

This is the same phone-first interface with a different, experimental backend. English, Spanish, Hebrew, themes, history, sharing and installation work here too. A persistent banner identifies shared test data. The default profile is **Test baby**; none of Avi's real history is imported.

## Access And Setup

Firebase project: huck-7a55c, web app Huck Web. Public browser configuration is in config.js. Cloud Firestore (not Realtime Database) is enabled and read/write access was verified using disposable synthetic test environments. No login is required. No owner SDK installation, Hosting setup, Apps Script redeployment or additional configuration is needed for staging.

The owner intentionally published unauthenticated public read/write rules. Anyone can read, modify or delete the data, bypass app validation, or consume the project's free quota. The API key/configuration is not a password. Keep real family history out of this experiment while these rules are open.

The default environment is huckEnvironments/staging. The surrounding project is named Huck, not Staging, and can be kept later. A separate production environment and proper rules can be configured before promotion. This site currently never reads or writes the household Sheet.

## Storage And Sync

- records/head holds schema1, children, shared settings, global revision and a server timestamp.
- records/entry_ID holds one sleep record, including soft-deleted records. Sleep history is not squeezed into one growing Firestore document.
- commands/REQUEST_ID records the exact command fingerprint, committed revision and server receipt time for retry deduplication.
- Each command uses a Firestore transaction: read the head and receipt; reject/retry if the coherent prepared state is stale; run the same HuckCore reducer; atomically write changed entries, the head and receipt. Concurrent starts cannot create two active sleeps through the app. Stale edits remain explicit conflicts.
- Live collection snapshots include the head and entries together. Cached or pending-write snapshots are NOT labeled server-confirmed. The first read waits for a server snapshot; opening/refreshing/returning checks fresh server data. Active listeners deliver subsequent changes without15-second polling. Hidden pages unsubscribe; foreground resumes.
- Only the app's existing one-second display tick and15-second UI/retry checks remain. Idle visible Firestore pages do not fetch an entire snapshot every15 seconds.
- The browser outbox and last confirmed snapshot are durably saved under huck-firestore-staging-v1, separate from production huck-v1. Recovery backups/discarded commands are also separated. A network failure, tab close or lost acknowledgement retains request IDs for safe retry. The isolated ?demo=1 sandbox has its own sample namespace and never reads/writes Firestore.
- Forgotten-timer cleanup is derived in the UI and materialized atomically on the next command. Reads do not append expiry events. Validation uses the device clock; unlike Apps Script, this client-only staging adapter does not provide a trusted current server clock. serverTimestamp records receipt time, not authoritative validation of supplied sleep times.

## Sample Data

The initial fixture has84 completed, non-overlapping synthetic sleeps over roughly14 days, clearly labeled as test data, with no assumed birthday. If the environment is still empty, **Load sample history** creates it once. It will not overwrite an existing head/history. Starting, editing, deleting and changing shared settings really sync between people using staging; these are shared test records, not a per-device demo.

## Comparison And Limitations

Refresh results are maintained in ../../benchmarks/README.md. Compare fresh server data, not merely the quick cached screen. Production and staging have similar entry counts but different contents and storage models; disclose that limitation.

History currently loads all stored sleep documents on opening. There is no event-log replay, but Firestore reads/bandwidth and local chart work still grow with history. Before large-scale use, add per-profile/recent-date queries and paginated older history; do not describe this prototype as infinitely scalable. The shared head serializes app writes via optimistic transactions, not a global Apps Script lock. Heavy contention can still require retries. Command audit receipts are not fetched on ordinary opens.

Before real-data migration: add access protection/role rules, validation at the trusted boundary, authoritative clock handling, backups/export and suitable history pagination; test real phones, permissions changes, offline/reconnect and simultaneous edits. Open client-side validation is not a security boundary. Password unlock/admin roles are discussed, NOT implemented.

## Development

Edit tools/page.html and shared source; node tools/build.mjs generates this index.html with shared asset paths plus the Firestore adapter, and a separately scoped install manifest. Do not fork/copy the UI into a drifting second app. Root production does not load Firebase's SDK. Its config.js and backend.sample.gs remain unchanged.

The adapter uses official Firebase CDN modules pinned at13.2.0. No project npm install/build dependency is needed by the deployed site. The existing Playwright runtime runs tests/firestore.cjs, which exercises the real Firebase project ONLY in a unique test-TIMESTAMP environment and deletes those created test documents afterward. It tests two-device propagation, concurrent-start rejection, stable-ID dedupe, settings after expiry, offline queue across reopening, isolation and layouts/languages. Never change test cleanup to target staging or production. Browser screenshots live in /tmp.
