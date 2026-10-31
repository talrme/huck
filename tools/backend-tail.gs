const HUCK_SHEET_ID = '1y7s7IP4Un91hPcqQMFYW6NAZ_S6cEUZBbJdHc9cdWMQ';
const HUCK_BACKEND_VERSION = '2026-10-31-lock-retry';
function setupHuck() {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { return snapshotHuck_(ensureHuck_()); } finally { lock.releaseLock(); }
}
function ensureHuck_() {
  const ss = SpreadsheetApp.openById(HUCK_SHEET_ID);
  let sheet = ss.getSheetByName('HuckEvents');
  if (!sheet) { sheet = ss.insertSheet('HuckEvents'); sheet.appendRow(['id', 'receivedAt', 'command']); sheet.setFrozenRows(1); }
  const headers = sheet.getRange(1, 1, 1, 3).getValues()[0];
  if (headers.join('|') !== 'id|receivedAt|command') throw Error('HuckEvents headers differ. Nothing was cleared; contact Tal.');
  return sheet;
}
function eventsHuck_(sheet) {
  sheet = sheet || ensureHuck_();
  const lastRow = sheet.getLastRow();
  return lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 3).getValues().map(row => ({ id: String(row[0]), now: Number(row[1]), command: JSON.parse(row[2]) }));
}
function replayHuck_(events) { return events.reduce((state, event) => HuckCore.apply(state, event.command, event.now), HuckCore.initial()); }
function snapshotHuck_(sheet) { return { ok: true, backendVersion: HUCK_BACKEND_VERSION, state: replayHuck_(eventsHuck_(sheet)), spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + HUCK_SHEET_ID + '/edit' }; }
function doGet(e) {
  const p = e && e.parameter || {};
  const callback = /^[A-Za-z_$][\w$]*$/.test(p.callback || '') ? p.callback : 'callback';
  const lock = LockService.getScriptLock(); let locked = false, result;
  try {
    if (!lock.tryLock(2000)) { const busy = new Error('Connection is busy. Please retry shortly.'); busy.code = 'BUSY'; busy.retryable = true; throw busy; }
    locked = true;
    const sheet = ensureHuck_(); const events = eventsHuck_(sheet); let state = replayHuck_(events); const now = Date.now();
    const settled = HuckCore.settle(JSON.parse(JSON.stringify(state)), now);
    if (JSON.stringify(settled) !== JSON.stringify(state)) {
      const command = { type: 'expire' }; const id = 'expire-' + now;
      state = HuckCore.apply(state, command, now); sheet.appendRow([id, now, JSON.stringify(command)]); SpreadsheetApp.flush();
    }
    if (p.action === 'command') {
      const command = JSON.parse(p.payload || '{}');
      if (!/^[\w-]{1,100}$/.test(command.id || '')) throw Error('Missing request ID.');
      if (!events.some(event => event.id === command.id)) {
        state = HuckCore.apply(state, command, now);
        sheet.appendRow([command.id, now, JSON.stringify(command)]); SpreadsheetApp.flush();
      }
    } else if (p.action && p.action !== 'snapshot') throw Error('Unknown action.');
    result = { ok: true, backendVersion: HUCK_BACKEND_VERSION, state, spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + HUCK_SHEET_ID + '/edit' };
  } catch (error) { result = { ok: false, backendVersion: HUCK_BACKEND_VERSION, error: String(error.message || error), retryable: Boolean(error.retryable), code: error.code || 'ERROR' }; }
  finally { if (locked) lock.releaseLock(); }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
