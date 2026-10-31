(function(root) {
  'use strict';
  const defaults = { dayStart: 7, nightStart: 20, dayLimit: 240, dayReplace: 90, nightLimit: 720, nightReplace: 240, timezone: 'America/Los_Angeles' };
  function initial() { return { children: [{ id: 'avi', name: 'Avi', archived: false }], entries: [], settings: { ...defaults }, revision: 0 }; }
  function hour(at, timezone) { return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(new Date(at))); }
  function isNight(at, settings) { const h = hour(at, settings.timezone); return settings.nightStart > settings.dayStart ? h >= settings.nightStart || h < settings.dayStart : h >= settings.nightStart && h < settings.dayStart; }
  function active(state, childId) { return state.entries.find(e => e.childId === childId && !e.deleted && !e.end); }
  function settle(state, now) {
    state.entries.forEach(e => {
      if (e.end || e.deleted) return;
      const night = isNight(e.start, state.settings);
      const limit = Number(night ? state.settings.nightLimit : state.settings.dayLimit);
      if (now - e.start >= limit * 60000) {
        e.end = e.start + Number(night ? state.settings.nightReplace : state.settings.dayReplace) * 60000;
        e.autoEnded = true; e.rev++; e.updatedAt = now;
      }
    });
    return state;
  }
  function timestamp(value, now) { const n = Number(value); if (!Number.isFinite(n) || n <= 0 || n > now + 1000) throw Error('Choose a time in the past or now.'); return n; }
  function validateRange(state, entry, now) {
    timestamp(entry.start, now);
    if (entry.end) { timestamp(entry.end, now); if (entry.end <= entry.start) throw Error('End must be after start.'); }
    const overlap = state.entries.some(other => other.id !== entry.id && other.childId === entry.childId && !other.deleted && entry.start < (other.end || Infinity) && (entry.end || Infinity) > other.start);
    if (overlap) throw Error('This sleep overlaps another sleep. Edit that entry first.');
  }
  function apply(source, command, now) {
    const state = JSON.parse(JSON.stringify(source));
    const p = command.payload || {};
    if (command.type === 'expire') { settle(state, now); state.revision++; return state; }
    if (command.type === 'settings') {
      if (p.expectedRevision !== source.revision) throw Error('Settings changed on another phone. Reopen settings and try again.');
      const settings = { ...state.settings, ...p.settings };
      for (const key of ['dayStart', 'nightStart']) if (!Number.isInteger(Number(settings[key])) || settings[key] < 0 || settings[key] > 23) throw Error('Choose hours from 0 to 23.');
      if (Number(settings.dayStart) === Number(settings.nightStart)) throw Error('Day and night must start at different times.');
      for (const key of ['dayLimit', 'dayReplace', 'nightLimit', 'nightReplace']) if (!Number.isFinite(Number(settings[key])) || settings[key] < 15 || settings[key] > 1440) throw Error('Choose a duration from 15 to 1440 minutes.');
      if (Number(settings.dayReplace) > Number(settings.dayLimit) || Number(settings.nightReplace) > Number(settings.nightLimit)) throw Error('Replacement duration must not exceed the cutoff.');
      new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone }).format();
      state.settings = settings;
    } else if (command.type === 'child') {
      const name = String(p.name || '').trim();
      if (!name || name.length > 60 || !/^[\w-]{1,100}$/.test(p.id || '')) throw Error('Enter a child name (up to 60 characters).');
      if (state.children.some(c => c.id === p.id)) throw Error('Child already exists.');
      state.children.push({ id: p.id, name, archived: false });
    } else if (command.type === 'archive') {
      const child = state.children.find(c => c.id === p.childId);
      if (!child) throw Error('Child not found.');
      if (p.archived && state.children.filter(c => !c.archived).length <= 1) throw Error('Keep at least one child active.');
      if (p.archived && active(state, child.id)) throw Error('End the running sleep before archiving.');
      child.archived = Boolean(p.archived);
    } else {
      const child = state.children.find(c => c.id === p.childId && !c.archived);
      if (!child) throw Error('Child is unavailable.');
      if (command.type === 'start' || command.type === 'add') {
        if (state.entries.some(e => e.id === p.id)) throw Error('Entry ID already exists.');
        if (command.type === 'start' && active(state, p.childId)) throw Error('Sleep already started on another phone.');
        const entry = { id: p.id, childId: p.childId, start: timestamp(p.start, now), end: command.type === 'add' ? timestamp(p.end, now) : null, rev: 1, autoEnded: false, deleted: false, updatedAt: now };
        validateRange(state, entry, now); state.entries.push(entry);
      } else {
        const entry = state.entries.find(e => e.id === p.id && e.childId === p.childId && !e.deleted);
        if (!entry) throw Error('Sleep entry no longer exists.');
        if (entry.rev !== p.expectedRev) throw Error('This sleep changed on another phone. Close and reopen it before editing.');
        if (command.type === 'delete') entry.deleted = true;
        else if (command.type === 'end' || command.type === 'edit') {
          if (command.type === 'end' && entry.end) throw Error('This sleep was already ended.');
          if (command.type === 'edit') entry.start = timestamp(p.start, now);
          entry.end = p.end ? timestamp(p.end, now) : null;
          if (command.type === 'end' && !entry.end) throw Error('Choose an end time.');
          entry.autoEnded = false; validateRange(state, entry, now);
        } else throw Error('Unknown action.');
        entry.rev++; entry.updatedAt = now;
      }
    }
    state.revision++; return state;
  }
  root.HuckCore = { defaults, initial, hour, isNight, active, settle, apply };
  if (typeof module !== 'undefined') module.exports = root.HuckCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);

const HUCK_SHEET_ID = '1y7s7IP4Un91hPcqQMFYW6NAZ_S6cEUZBbJdHc9cdWMQ';
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
function snapshotHuck_(sheet) { return { ok: true, state: replayHuck_(eventsHuck_(sheet)), spreadsheetUrl: SpreadsheetApp.openById(HUCK_SHEET_ID).getUrl() }; }
function doGet(e) {
  const p = e && e.parameter || {};
  const callback = /^[A-Za-z_$][\w$]*$/.test(p.callback || '') ? p.callback : 'callback';
  const lock = LockService.getScriptLock(); let locked = false, result;
  try {
    lock.waitLock(25000); locked = true;
    const sheet = ensureHuck_(); const events = eventsHuck_(sheet); let state = replayHuck_(events); const now = Date.now();
    const settled = HuckCore.settle(JSON.parse(JSON.stringify(state)), now);
    if (JSON.stringify(settled) !== JSON.stringify(state)) {
      const command = { type: 'expire' }; const id = 'expire-' + now;
      state = HuckCore.apply(state, command, now); sheet.appendRow([id, now, JSON.stringify(command)]);
    }
    if (p.action === 'command') {
      const command = JSON.parse(p.payload || '{}');
      if (!/^[\w-]{1,100}$/.test(command.id || '')) throw Error('Missing request ID.');
      if (!events.some(event => event.id === command.id)) {
        state = HuckCore.apply(state, command, now);
        sheet.appendRow([command.id, now, JSON.stringify(command)]);
      }
    } else if (p.action && p.action !== 'snapshot') throw Error('Unknown action.');
    result = { ok: true, state, spreadsheetUrl: SpreadsheetApp.openById(HUCK_SHEET_ID).getUrl() };
  } catch (error) { result = { ok: false, error: String(error.message || error) }; }
  finally { if (locked) lock.releaseLock(); }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
