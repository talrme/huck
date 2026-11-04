# Refresh Benchmarks

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

### Planned Firebase Comparison (Not Built Yet)

Use an isolated staging entry point, separate storage/outbox and a separate Firebase project or explicitly isolated database path. Production remains on Sheets. For an unauthenticated public staging database, use clearly labeled synthetic records with matching volume/shape, not copies of private family history. Public access allows other people to read/change/delete that staging data; do not hide this consequence.

Repeat the same four empty-context opens and twelve cached reloads on the same computer/connection and record navigation-to-server-confirmed-data, not merely cached or optimistic listener callbacks. Retain offline pending writes and explicit server acknowledgements. Add a Firebase-specific timing adapter for subscription start/server receipt; the current JSONP request instrumentation is Sheets-specific. Also measure write acknowledgement and server-confirmed change appearing on a second connected browser, plus concurrent edits, reconnects and retries. Compare matched record counts and disclose the synthetic-data difference.

The owner must first create a Firebase project, enable Realtime Database and provide its database URL and public web-app config. No Firebase database, security rules or public data export were created during the Sheets measurement.
