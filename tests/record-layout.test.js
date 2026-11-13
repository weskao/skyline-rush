import test from 'node:test';
import assert from 'node:assert/strict';
import { RACE_TRACKS, createRace } from '../src/game.js';
import { COURSE_TRACKS } from '../src/race-tracks.ts';
import { CIRCUIT_ID } from '../src/circuit-track.ts';
import { layoutVersion, raceLayout, recordTrackId, recordTrackIds, runLayout, parseRecordTrackId, isCurrentLayout } from '../src/record-layout.ts';
import { BEST_KEY, recordBest, loadBests, recordRace, loadModeBest, recordModeRace, loadModeHistory, loadGhost, saveGhost, loadModeGhost, saveModeGhost } from '../src/history.ts';
import { loadCircuitLapBest, circuitLapKey } from '../src/circuit-records.ts';
import { mergeProgress, mergeModeBests, readLocalProgress, saveLocalProgress, parseProgressExport, readLocalModeBests, saveLocalModeBests } from '../src/cloud-progress.ts';
import { settleRace } from '../src/race-results.ts';
import { createGhostStore } from '../src/ghost-store.ts';
import { GHOST_RATE } from '../src/ghost.ts';

// A layout change makes older times incomparable. Stage 1 moved five tracks to layout 2; stage 2 (user,
// 2026-11-02: more rings on every map, every timed record gets a new key) moved those five to layout 3 and
// Aurora and the World Tour to layout 2. Scaled layouts (user, 2026-11-02: 4 rings and pickups per car, re-rolled
// every race) bump every track once more. Every older id stays readable as an old-layout record.
const NEWEST = ['coast', 'neon', 'canyon']; // layout 5
const TWICE = ['aurora', 'spiral', CIRCUIT_ID]; // layout 4
const ONCE = [ 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']; // layout 3
const memory = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = String(value); }, removeItem: key => { delete data[key]; } };
};
const lap = time => ({ time, splits: [time / 4, time / 2, time * 3 / 4, time] });
const ghost = (trackId, time, config) => {
  const { length } = config ? createRace(trackId, config) : createRace(trackId), count = Math.floor(time * GHOST_RATE) + 1;
  return { time, samples: Array.from({ length: count }, (_, i) => [length * i / (count - 1), 0, 0]) };
};

test('layout versions track the current road and item layouts', () => {
  for (const id of NEWEST) assert.equal(layoutVersion(id), 5, id);
  for (const id of TWICE) assert.equal(layoutVersion(id), 4, id);
  for (const id of ONCE) assert.equal(layoutVersion(id), 3, id);
  assert.equal(layoutVersion('nowhere'), 1);
  assert.equal(recordTrackId('coast'), 'coast@5');
  assert.equal(recordTrackId(CIRCUIT_ID), CIRCUIT_ID + '@4');
  assert.equal(recordTrackId('aurora'), 'aurora@4');
  assert.deepEqual(recordTrackIds('coast'), ['coast', 'coast@2', 'coast@3', 'coast@4', 'coast@5']);
  assert.deepEqual(recordTrackIds('taipei'), ['taipei', 'taipei@2', 'taipei@3']);
  assert.ok(Object.keys(RACE_TRACKS).every(id => recordTrackId(id).includes('@')), 'every track records under a new id');
});

test('a Cup takes the newest layout; Endless and Event Lab version the road independently', () => {
  assert.equal(raceLayout('aurora', { mode: 'cup', cupTracks: ['aurora', 'coast', 'taipei'] }), 5);
  assert.equal(raceLayout('aurora', { mode: 'cup', cupTracks: ['aurora', 'taipei'] }), 4);
  assert.equal(recordTrackId('coast', { mode: 'endless' }), 'coast@2');
  assert.equal(recordTrackId('coast', { mode: 'eventlab' }), 'coast@2');
  assert.equal(recordTrackId('coast', { mode: 'time' }), 'coast@5');
});

test('record ids parse back, older layouts included; a run without a layout field is layout 1', () => {
  assert.deepEqual(parseRecordTrackId('coast@5'), { trackId: 'coast', layout: 5 });
  assert.deepEqual(parseRecordTrackId('coast@3'), { trackId: 'coast', layout: 3 }, 'a stage-2 record stays readable');
  assert.deepEqual(parseRecordTrackId('coast@2'), { trackId: 'coast', layout: 2 }, 'a stage-1 record stays readable');
  assert.deepEqual(parseRecordTrackId('aurora@4'), { trackId: 'aurora', layout: 4 });
  assert.deepEqual(parseRecordTrackId('aurora@2'), { trackId: 'aurora', layout: 2 });
  assert.deepEqual(parseRecordTrackId('aurora'), { trackId: 'aurora', layout: 1 });
  for (const bad of ['aurora@5', 'coast@1', 'coast@6', 'coast@', '@2', 'coast@2@2', 'coast@02', 5]) assert.equal(parseRecordTrackId(bad), null, String(bad));
  assert.equal(runLayout({}), 1);
  assert.equal(runLayout({ layout: 2 }), 2);
  assert.equal(runLayout({ layout: 'x' }), 1);
  assert.equal(isCurrentLayout({ track: 'coast' }), false);
  assert.equal(isCurrentLayout({ track: 'coast', layout: 2 }), false, 'stage-1 runs are now old');
  assert.equal(isCurrentLayout({ track: 'coast', layout: 3 }), false, 'stage-2 runs are now old');
  assert.equal(isCurrentLayout({ track: 'coast', layout: 5 }), true);
  assert.equal(isCurrentLayout({ track: 'aurora' }), false);
  assert.equal(isCurrentLayout({ track: 'aurora', layout: 2 }), false);
  assert.equal(isCurrentLayout({ track: 'aurora', layout: 4 }), true);
});

test('AC1 Classic: an old-layout best never blocks a NEW RECORD and its saved value is kept', () => {
  const storage = memory({ [BEST_KEY]: JSON.stringify({ coast: 40, 'coast@2': 45, aurora: 50 }) });
  assert.deepEqual(recordBest(recordTrackId('coast'), 70, storage), { best: 70, record: true });
  assert.deepEqual(recordBest(recordTrackId('aurora'), 55, storage), { best: 55, record: true });
  assert.deepEqual(loadBests(storage), { coast: 40, 'coast@2': 45, aurora: 50, 'coast@5': 70, 'aurora@4': 55 });
  assert.deepEqual(recordBest(recordTrackId('aurora'), 60, storage), { best: 55, record: false });
});

test('AC1 Classic settlement: a new-layout run is a record against old bests; the legacy key is never touched', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = memory({ [BEST_KEY]: JSON.stringify({ coast: 40, 'coast@2': 45 }), 'skyline-rush-best': '40' });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  try {
    const race = { ...createRace('coast'), elapsed: 70, result: { position: 1, time: 70, stars: 1 } };
    const progress = { unlocked: new Set(['coast']), bests: { coast: 40, 'coast@2': 45 }, stars: {}, medals: {}, history: [], modeHistory: [], daily: [], challengeMedals: { version: 1, awards: {}, longestFlight: 0, maxAerialCombo: 0 } };
    const saved = [];
    const settlement = settleRace(race, { series: { sprintSeries: null, cup: null, stunt: null }, progress, ghosts: { saveClassic: (...args) => saved.push(args) }, daily: null, trace: ghost('coast', 70).samples });
    assert.equal(settlement.record, true);
    assert.equal(settlement.best, 70);
    assert.equal(progress.bests['coast@5'], 70);
    assert.equal(progress.bests['coast@2'], 45);
    assert.equal(progress.bests.coast, 40);
    assert.equal(storage.data['skyline-rush-best'], '40');
    assert.equal(progress.history.at(-1).layout, 5);
    assert.deepEqual(saved.map(([id]) => id), ['coast']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
  }
});

test('Classic history: every new run carries its track\'s current layout', () => {
  const storage = memory();
  assert.equal(recordRace({ trackId: 'neon', length: 4000, result: { position: 1, time: 50 } }, storage).layout, 5);
  assert.equal(recordRace({ trackId: 'aurora', length: 4000, result: { position: 1, time: 50 } }, storage).layout, 4);
});

test('Classic ghosts: the new layout gets its own slot and older ghosts stay where they were', () => {
  const old = ghost('coast', 40), stage1 = ghost('coast', 45);
  const storage = memory({ 'skyline-rush-ghosts': JSON.stringify({ coast: old, 'coast@2': stage1 }) });
  assert.equal(loadGhost('coast', storage), null, 'an old-layout ghost is never raced against');
  const fresh = ghost('coast', 70);
  saveGhost('coast', fresh, storage);
  const stored = JSON.parse(storage.data['skyline-rush-ghosts']);
  assert.deepEqual(stored.coast, old);
  assert.deepEqual(stored['coast@2'], stage1);
  assert.deepEqual(stored['coast@5'], fresh);
  assert.deepEqual(loadGhost('coast', storage), fresh);
  saveGhost('aurora', ghost('aurora', 60), storage);
  assert.ok(JSON.parse(storage.data['skyline-rush-ghosts'])['aurora@4']);
});

test('AC1 modes: best, ghost and history compare only runs of the same layout', () => {
  const config = createRace('coast', { mode: 'time' }).config, rules = JSON.stringify(config);
  const storage = memory({
    'skyline-rush-mode-history-v1': JSON.stringify([{ date: '2026-01-01T00:00:00.000Z', mode: 'time', track: 'coast', rules, time: 40, layout: 2 }]),
    'skyline-rush-mode-bests-v1': JSON.stringify({ [JSON.stringify(['coast', config])]: 40, [JSON.stringify(['coast@2', config])]: 45 }),
    'skyline-rush-mode-ghosts-v1': JSON.stringify({ ['coast:' + rules]: ghost('coast', 40, config), ['coast@2:' + rules]: ghost('coast', 45, config) }),
  });
  assert.equal(loadModeBest('coast', config, storage), null);
  assert.equal(loadModeGhost('coast', config, storage), null);
  const race = { ...createRace('coast', config), result: { time: 70, position: 1, score: 0, success: true } };
  assert.deepEqual(recordModeRace(race, storage), { best: 70, record: true });
  assert.equal(loadModeHistory(storage).at(-1).layout, 5);
  const bests = JSON.parse(storage.data['skyline-rush-mode-bests-v1']);
  assert.equal(bests[JSON.stringify(['coast', config])], 40, 'old permanent best kept');
  assert.equal(bests[JSON.stringify(['coast@2', config])], 45, 'stage-1 permanent best kept');
  assert.equal(bests[JSON.stringify(['coast@5', config])], 70);
  assert.ok(saveModeGhost('coast', config, ghost('coast', 70, config), storage));
  const ghosts = JSON.parse(storage.data['skyline-rush-mode-ghosts-v1']);
  assert.ok(ghosts['coast:' + rules] && ghosts['coast@2:' + rules], 'old mode ghosts kept');
  assert.equal(loadModeGhost('coast', config, storage).time, 70);
});

test('modes: a track first re-laid in stage 2 moves to its current keys and keeps the bare one as layout 1', () => {
  const config = createRace('aurora', { mode: 'time' }).config;
  const storage = memory({ 'skyline-rush-mode-bests-v1': JSON.stringify({ [JSON.stringify(['aurora', config])]: 40 }) });
  assert.equal(loadModeBest('aurora', config, storage), null);
  recordModeRace({ ...createRace('aurora', config), result: { time: 70, position: 1, score: 0, success: true } }, storage);
  assert.deepEqual(Object.keys(JSON.parse(storage.data['skyline-rush-mode-bests-v1'])).sort(), [JSON.stringify(['aurora', config]), JSON.stringify(['aurora@4', config])].sort());
  assert.equal(loadModeHistory(storage).at(-1).layout, 4);
});

test('Circuit: total and lap bests move to the layout 4 keys and ignore older laps', () => {
  const config = createRace(CIRCUIT_ID, { mode: 'circuit', laps: 3 }).config;
  const older = { [JSON.stringify([CIRCUIT_ID, config, 'lap'])]: 20, [JSON.stringify([CIRCUIT_ID + '@2', config, 'lap'])]: 25, [JSON.stringify([CIRCUIT_ID + '@3', config, 'lap'])]: 27 };
  const storage = memory({ 'skyline-rush-mode-bests-v1': JSON.stringify(older) });
  assert.equal(circuitLapKey(config), JSON.stringify([CIRCUIT_ID + '@4', config, 'lap']));
  assert.equal(loadCircuitLapBest(config, storage), null);
  const race = createRace(CIRCUIT_ID, config);
  recordModeRace({ ...race, result: { time: 100, position: 1, score: 0, success: true, lapTimes: [lap(30), lap(35), lap(35)] } }, storage);
  assert.equal(loadCircuitLapBest(config, storage), 30);
  const stored = JSON.parse(storage.data['skyline-rush-mode-bests-v1']);
  for (const [key, value] of Object.entries(older)) assert.equal(stored[key], value, key);
});

test('the ghost store races only the current layout\'s ghost', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory({ 'skyline-rush-ghosts': JSON.stringify({ neon: ghost('neon', 30), 'neon@2': ghost('neon', 32) }) }) });
  try {
    assert.equal(createGhostStore().forRace({ trackId: 'neon', mode: 'classic', config: {} }), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage;
  }
});

test('AC2 cloud: old and new Classic bests, versioned mode keys and layout fields survive every merge', () => {
  const config = createRace('coast', { mode: 'time' }).config, rules = JSON.stringify(config);
  const local = { bests: { coast: 40, 'coast@2': 60, 'coast@3': 70, 'coast@5': 75, aurora: 50 },
    history: [{ date: '2026-01-01T00:00:00.000Z', track: 'coast', position: 1, time: 40 }, { date: '2026-02-01T00:00:00.000Z', track: 'coast', position: 1, time: 70, layout: 3 }],
    modeHistory: [{ date: '2026-02-01T00:00:00.000Z', mode: 'time', track: 'coast', rules, time: 70, layout: 3 }] };
  const merged = mergeProgress(local, { version: 2, bests: { 'coast@5': 65, 'neon@4': 30, 'aurora@4': 45, 'aurora@5': 1, 'nowhere@2': 1 } });
  assert.deepEqual(merged.bests, { coast: 40, 'coast@2': 60, 'coast@3': 70, 'coast@5': 65, aurora: 50, 'aurora@4': 45, 'neon@4': 30 });
  assert.deepEqual(merged.history.map(run => run.layout), [undefined, 3]);
  assert.equal(merged.modeHistory[0].layout, 3);
  assert.deepEqual(mergeProgress(merged, null), merged, 'a merged snapshot round-trips unchanged');
  const current = JSON.stringify(['coast@5', config]), stage1 = JSON.stringify(['coast@2', config]), old = JSON.stringify(['coast', config]);
  assert.deepEqual(mergeModeBests({ bests: { [current]: 70, [stage1]: 60, [old]: 40, [JSON.stringify(['aurora@5', config])]: 1 } }).bests, { [current]: 70, [stage1]: 60, [old]: 40 });
});

test('every track\'s older record ids stay readable after the stage-2 bump', () => {
  const storage = memory();
  for (const id of Object.keys(RACE_TRACKS)) for (const record of recordTrackIds(id)) recordBest(record, 60, storage);
  const merged = mergeProgress({ bests: JSON.parse(storage.data[BEST_KEY]) }, null);
  assert.deepEqual(Object.keys(merged.bests).sort(), Object.keys(RACE_TRACKS).flatMap(recordTrackIds).sort());
});

test('AC4 History: old-layout runs stay listed with an Old layout tag and never count as best or trend', async () => {
  const { createHistoryView } = await import('../src/history-ui.ts');
  const { historyView } = await import('../src/history-view-state.ts');
  const { setLocale, t } = await import('../src/i18n.ts');
  const config = { mode: 'time' }, rules = JSON.stringify(config);
  const sessionHistory = [{ track: 'coast', time: 40, position: 1, date: '2026-01-01T00:00:00Z', layout: 3 }, { track: 'coast', time: 70, position: 1, date: '2026-02-01T00:00:00Z', layout: 5 }];
  const sessionModeHistory = [{ track: 'coast', mode: 'time', rules, time: 40, date: '2026-01-01T00:00:00Z', layout: 3 }, { track: 'coast', mode: 'time', rules, time: 70, date: '2026-02-01T00:00:00Z', layout: 5 }];
  const restore = ['localStorage', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  Object.defineProperty(globalThis, 'localStorage', { value: memory({ 'skyline-rush-mode-history-v1': JSON.stringify(sessionModeHistory) }), configurable: true });
  Object.defineProperty(globalThis, 'document', { value: { querySelector: s => ({ value: s === '#history-track' ? 'coast' : 'all' }) }, configurable: true });
  try {
    for (const locale of ['en', 'zh-TW']) {
      setLocale(locale);
      const tag = t('history.oldLayout');
      assert.ok(tag && tag !== 'history.oldLayout', locale + ' has a tag');
      createHistoryView({ getData: () => ({ sessionHistory, sessionModeHistory, sessionBests: { 'coast@3': 40, 'coast@5': 70 }, sessionDaily: [], sessionMedals: {}, world: null }), timeString: String }).showHistory();
      const [fresh, old] = historyView.historyRuns;
      assert.deepEqual([fresh.best, old.best], [true, false], locale + ' best is the new-layout run');
      assert.ok(old.fields.includes(tag) && !fresh.fields.includes(tag), locale + ' classic tag');
      assert.equal(historyView.trendCircles.length, 1, locale + ' trend uses current-layout runs only');
      const [freshMode, oldMode] = historyView.modeRuns;
      assert.deepEqual([freshMode.personalBest, oldMode.personalBest], [true, false]);
      assert.ok(oldMode.text.includes(tag) && !freshMode.text.includes(tag), locale + ' mode tag');
    }
  } finally {
    setLocale('en');
    for (const [name, descriptor] of restore) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
  }
});

// Cloud saves are rejected whole when a best id is missing from the rules, so the two lists move together.
test('firestore.rules accepts exactly the versioned Classic best ids the client writes or keeps', async () => {
  const { readFileSync } = await import('node:fs');
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const listed = [...rules.match(/function bestIds\(\) \{[^}]*\}/)[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const versioned = [...Object.keys(RACE_TRACKS), ...Object.keys(COURSE_TRACKS)].flatMap(recordTrackIds).filter(id => id.includes('@'));
  assert.deepEqual(listed.sort(), [...versioned].sort());
  for (const id of versioned) assert.match(rules, new RegExp(`validBest\\(bests, '${id}'\\)`), id); // inside validBests(bests)
});

test('AC2 device: export, import and a cloud merge write old and new records back bit-for-bit', () => {
  const config = createRace('coast', { mode: 'time' }).config, rules = JSON.stringify(config);
  const device = memory({
    [BEST_KEY]: JSON.stringify({ coast: 40, 'coast@2': 60, 'coast@3': 70, aurora: 50 }),
    'skyline-rush-history': JSON.stringify([{ date: '2026-01-01T00:00:00.000Z', track: 'coast', position: 1, time: 40, collisions: 0, nearMisses: 0, rings: 0, perfectLines: 0, nitroUses: 0, longestCombo: 0, score: 0, fuelOuts: 0, gapFalls: 0, distance: 5000 },
      { date: '2026-02-01T00:00:00.000Z', track: 'coast', position: 1, time: 70, collisions: 0, nearMisses: 0, rings: 0, perfectLines: 0, nitroUses: 0, longestCombo: 0, score: 0, fuelOuts: 0, gapFalls: 0, distance: 5000, layout: 3 }]),
    'skyline-rush-mode-bests-v1': JSON.stringify({ [JSON.stringify(['coast', config])]: 40, [JSON.stringify(['coast@2', config])]: 60, [JSON.stringify(['coast@3', config])]: 70 }),
  });
  const exported = JSON.stringify({ ...readLocalProgress(device), permanent: readLocalModeBests(device) });
  const imported = parseProgressExport(exported), fresh = memory();
  assert.ok(saveLocalProgress(imported.progress, fresh));
  assert.ok(saveLocalModeBests(imported.permanent, fresh));
  for (const key of [BEST_KEY, 'skyline-rush-history', 'skyline-rush-mode-bests-v1']) assert.deepEqual(JSON.parse(fresh.data[key]), JSON.parse(device.data[key]), key);
  const synced = mergeProgress(readLocalProgress(fresh), { version: 2, bests: { 'coast@3': 90 }, history: [] });
  assert.deepEqual(synced.bests, { coast: 40, 'coast@2': 60, 'coast@3': 70, aurora: 50 });
});

test('re-authored roads get fresh Sprint and Endless records without deleting the old ones', () => {
  const storage = memory({ [BEST_KEY]: JSON.stringify({ 'coast@4': 30 }) });
  assert.equal(recordTrackId('coast'), 'coast@5');
  assert.equal(recordTrackId('aurora'), 'aurora@4');
  assert.equal(loadBests(storage)['coast@4'], 30);

  const { config } = createRace('neon', { mode: 'endless' });
  const legacy = JSON.stringify(['neon', config]), current = JSON.stringify(['neon@2', config]);
  const old = memory({ 'skyline-rush-mode-bests-v1': JSON.stringify({ [legacy]: 20000 }) });
  assert.equal(loadModeBest('neon', config, old), null);
  assert.deepEqual(recordModeRace({ mode: 'endless', trackId: 'neon', config, result: { time: 60, distance: 4000 } }, old),
    { best: 4000, record: true });
  assert.deepEqual(mergeModeBests({ bests: JSON.parse(old.data['skyline-rush-mode-bests-v1']) }).bests,
    { [legacy]: 20000, [current]: 4000 });
});
