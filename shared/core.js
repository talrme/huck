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
