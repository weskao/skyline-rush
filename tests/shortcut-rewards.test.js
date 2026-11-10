import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, setLayoutSeed, RACE_TRACKS } from '../src/game.js';
import { COURSE_TRACKS } from '../src/race-tracks.ts';
import { COURSE_RUNTIMES } from '../src/course-runtimes.ts';
import { routeLength } from '../src/course-route-frame.ts';

// A shortcut or hidden path keeps the 60 m cell line, and a long-form course also fills that same
// window with a ring every 25 m and a cell 12 m after each ring. Classic tracks stay on the 60 m line.
const STEP = 25, MAPPED_STEP = 50, OFFSET = 12, INSET = 30;
const BURST_TYPES = ['charge', 'slipstream', 'charge', 'nitro', 'slipstream', 'charge'];

const slots = (start, end, offset, step = STEP) => {
  const out = [];
  for (let s = start + offset; s < end; s += step) out.push(s);
  return out;
};

// Section bounds are already the corridor. Graph edges inset 30 m from both ends, matching the cell line.
function corridors(id) {
  const runtime = COURSE_RUNTIMES[id];
  if (runtime) {
    const graph = runtime.spec.graph;
    return graph.edges.filter(edge => !graph.groundRoute.includes(edge.id)).map(edge => {
      const length = routeLength(graph, edge.id), altitude = edge.mode === 'flight' ? 6 : 0;
      return {
        name: edge.id,
        ringAt: slots(INSET, length - INSET, 0),
        cellAt: slots(INSET, length - INSET, OFFSET),
        ring: (race, s) => race.rings.find(item => item.edgeId === edge.id && item.localS === s && item.x === 0 && item.altitude === altitude),
        cell: (race, s) => race.pickups.find(item => item.edgeId === edge.id && item.localS === s && item.x === 0 && item.altitude === altitude && item.tier === 'cell'),
      };
    });
  }
  return COURSE_TRACKS[id].sections.filter(section => section.type === 'shortcut').map(section => ({
    name: `${section.from}-${section.to}`,
    ringAt: slots(section.from + INSET, section.to, 0, MAPPED_STEP),
    cellAt: slots(section.from + INSET, section.to, OFFSET, MAPPED_STEP),
    ring: (race, distance) => race.rings.find(item => item.distance === distance && item.x === section.x && item.altitude === section.altitude),
    cell: (race, distance) => race.pickups.find(item => item.distance === distance && item.x === section.x && item.altitude === section.altitude && item.tier === 'cell'),
  }));
}

for (const id of Object.keys(COURSE_TRACKS)) {
  test(`${id}: each shortcut or hidden path is filled with consecutive rings and cells`, () => {
    const paths = corridors(id);
    assert.ok(paths.length > 0, `${id} has a shortcut or hidden path`);
    setLayoutSeed(() => 1);
    let first;
    try {
      first = createRace(id, { mode: 'classic' });
      setLayoutSeed(() => 99);
      const again = createRace(id, { mode: 'classic' });
      for (const path of paths) {
        assert.ok(path.ringAt.length >= 6, `${path.name} open length holds ${path.ringAt.length} rings`);
        for (const [index, at] of path.ringAt.entries()) {
          const ring = path.ring(first, at);
          assert.ok(ring, `${path.name} ring @${at}`);
          assert.equal(ring.type, BURST_TYPES[index % BURST_TYPES.length], `${path.name} ring type @${at}`);
          assert.equal(ring.radius, 4.8);
          assert.ok(path.ring(again, at), `${path.name} ring @${at} moved when the layout was re-rolled`);
        }
        for (const at of path.cellAt) {
          assert.ok(path.cell(first, at), `${path.name} cell @${at}`);
          assert.ok(path.cell(again, at), `${path.name} cell @${at} moved when the layout was re-rolled`);
        }
      }
    } finally {
      setLayoutSeed();
    }
  });
}

test('classic shortcut corridors keep the 60 m reward line and do not gain the dense mix', () => {
  for (const [id, track] of Object.entries(RACE_TRACKS)) {
    for (const section of track.sections.filter(section => section.type === 'shortcut')) {
      const race = createRace(id, { mode: 'classic' });
      const ringAt = slots(section.from + INSET, section.to, 0);
      const placed = ringAt.filter(distance => race.rings.some(ring => ring.distance === distance && ring.x === section.x && ring.altitude === section.altitude));
      assert.ok(placed.length < ringAt.length, `${id} dense rings ${placed.length}/${ringAt.length}`);
    }
  }
});

test('mapped course shortcut bursts never spill onto ordinary stretches or exceed one ring per 50 m', () => {
  for (const [id, track] of Object.entries(COURSE_TRACKS)) {
    if (COURSE_RUNTIMES[id]) continue; // physically separate graph edges retain the 25 m reward lattice
    const race = createRace(id, { mode: 'classic' });
    const shortcuts = track.sections.filter(section => section.type === 'shortcut');
    const expected = shortcuts.flatMap(section =>
      slots(section.from + INSET, section.to, 0, MAPPED_STEP)).sort((a, b) => a - b);
    const burst = race.rings.filter(ring => ring.group === -4);
    assert.deepEqual(burst.map(ring => ring.distance), expected, id);
    for (const ring of burst) assert.ok(shortcuts.some(section =>
      ring.distance >= section.from + INSET && ring.distance < section.to &&
      ring.x === section.x && ring.altitude === section.altitude), id + ': stray reward @' + ring.distance);
  }
});
