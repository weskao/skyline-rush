import { test } from 'node:test';
import assert from 'node:assert/strict';
import { historyTrendPoints, createHistoryView } from '../src/history-ui.ts';
import { normalizeRaceConfig } from '../src/race-config.ts';
import { saveModeGhost } from '../src/history.ts';
import { historyView } from '../src/history-view-state.ts';

test('history trend chart preserves evenly spaced points and time range', () => {
  assert.deepEqual(historyTrendPoints([{ time: 10 }, { time: 20 }, { time: 30 }]), [[10, 70], [250, 40], [490, 10]]);
});

test('flat history and a single race stay centered', () => {
  assert.deepEqual(historyTrendPoints([{ time: 15 }, { time: 15 }]), [[10, 40], [490, 40]]);
  assert.deepEqual(historyTrendPoints([{ time: 15 }]), [[250, 40]]);
  assert.deepEqual(historyTrendPoints([]), []);
});

test('Circuit history shows its saved ruleset Ghost without awarding Career medals', () => {
  const previousDocument = globalThis.document, previousStorage = globalThis.localStorage;
  const values = new Map(), config = normalizeRaceConfig({ mode: 'circuit', laps: 1 });
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.document = { querySelector: selector => ({ value: selector === '#history-track' ? 'harbor-circuit' : 'circuit' }) };
  try {
    assert.equal(saveModeGhost('harbor-circuit', config, { time: 20, samples: Array.from({ length: 201 }, (_, i) => [i * 10, -2.5, 0]) }), true);
    const run = { mode: 'circuit', track: 'harbor-circuit', rules: JSON.stringify(config), time: 20 };
    createHistoryView({ getData: () => ({ sessionHistory: [], sessionModeHistory: [run], sessionBests: {}, sessionDaily: [], sessionMedals: {}, world: null }),
      timeString: seconds => String(seconds) }).showHistory();
    assert.equal(historyView.modeRuns.length, 1);
    assert.equal(historyView.modeRuns[0].ghost, true, 'a valid Circuit Ghost must be discoverable in History');
    assert.ok(Object.values(historyView.medalAwards).every(value => value === null));
  } finally {
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage;
  }
});
