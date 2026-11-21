import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as itemUI from '../src/item-ui.ts';
const { setupItemUI } = itemUI;
import { bankItem, tickItemCooldown } from '../src/active-items.ts';

test('item HUD announces pickup/cooldown once, keeps activation paused-safe and displays the active effect', () => {
  const previousDocument = globalThis.document;
  const listeners = new Map();
  const nodes = {
    'item-slot': { hidden: true, dataset: {} },
    'player-hit-screen': { hidden: true, dataset: {} },
    'item-status': { textContent: '' },
    'ghost-phase-status': { hidden: true },
    'ghost-phase-time': { textContent: '' },
    'ghost-phase-fill': { style: {} },
    'bonus-status': { hidden: true, textContent: '' },
    'activate-item': { disabled: true, addEventListener: (name, listener) => listeners.set(name, listener) },
  };
  globalThis.document = { getElementById: id => nodes[id] };
  try {
    const race = { mode: 'custom', elapsed: 0, rings: [], phase: 'racing', config: { activeItems: true }, rivals: [], player: {
      heldItem: null, itemCooldown: 0, effects: { shield: 0, magnet: 0, ghost: 0, freeze: 0 },
    } };
    const cues = [];
    let calm = false;
    const ui = setupItemUI({ getRace: () => race, cue: name => cues.push(name), calm: () => calm });
    ui.update(race);
    bankItem(race.player, 'shield');
    ui.update(race); ui.update(race);
    assert.deepEqual(cues, ['pickup']);
    assert.equal(nodes['activate-item'].disabled, false);
    assert.equal(nodes['item-slot'].dataset.item, 'shield');
    race.phase = 'paused'; ui.activate(); ui.update(race);
    assert.equal(race.player.heldItem, 'shield');
    assert.equal(nodes['activate-item'].disabled, true);
    race.phase = 'racing'; listeners.get('click')(); ui.update(race);
    assert.equal(race.player.effects.shield, 10);
    assert.match(nodes['item-status'].textContent, /COOLDOWN/);
    bankItem(race.player, 'ghost'); ui.update(race);
    for (let i = 0; i < 8; i++) tickItemCooldown(race.player, .1);
    ui.update(race); ui.update(race);
    assert.deepEqual(cues, ['pickup', 'item-use', 'pickup', 'item-ready']);
    ui.activate(); ui.update(race);
    for (let i = 0; i < 8; i++) tickItemCooldown(race.player, .1);
    ui.update(race);
    assert.equal(nodes['ghost-phase-status'].hidden, false);
    assert.equal(nodes['ghost-phase-time'].textContent, 'GHOST PHASE · 3s');
    assert.equal(nodes['item-slot'].dataset.item, 'ghost');
    assert.equal(nodes['item-status'].hidden, true);
    race.player.effects.ghost = 1.5;
    ui.update(race);
    assert.equal(nodes['ghost-phase-fill'].style.transform, 'scaleX(0.500)');
    race.player.effects.ghost = 0;
    ui.update(race);
    assert.equal(nodes['ghost-phase-status'].hidden, true);
    assert.match(nodes['item-status'].textContent, /ACTIVE/);
    race.rings = [{ type: 'speed-pad', distance: 100, hit: false }];
    race.player.distance = 0;
    ui.update(race); ui.update(race);
    assert.equal(nodes['bonus-status'].hidden, false);
    assert.match(nodes['bonus-status'].textContent, /SPEED.*100/);
    assert.equal(cues.at(-1), 'ui');
    const count = cues.length;
    ui.update(race); assert.equal(cues.length, count);
    race.player.lastBonus = { type: 'air-pad', time: 0 };
    ui.update(race); ui.update(race);
    assert.match(nodes['bonus-status'].textContent, /AIR/);
    assert.equal(cues.length, count + 1);
    race.elapsed = 3; race.rings = [];
    ui.update(race); assert.equal(nodes['bonus-status'].hidden, true);
    race.config.activeItems = false;
    race.player.freezeUntil = 5;
    race.player.empUntil = 4.5;
    ui.update(race);
    assert.equal(nodes['bonus-status'].hidden, false);
    const screen = nodes['player-hit-screen'];
    assert.equal(screen.hidden, false);
    assert.deepEqual(screen.dataset, { hit: 'emp', calm: 'false' });
    assert.equal(nodes['bonus-status'].textContent, 'EMP HIT · 2s');
    assert.deepEqual(itemUI.playerHitView, { emp: 1.5, freeze: 2, empPhase: 'impact', freezePhase: 'impact', calm: false }, 'tenths of a second, each on its own timeline');
    race.elapsed = 3.2;
    ui.update(race);
    assert.deepEqual(itemUI.playerHitView, { emp: 1.3, freeze: 1.8, empPhase: 'spread', freezePhase: 'spread', calm: false });
    race.elapsed = 3.7;
    ui.update(race);
    assert.equal(itemUI.playerHitView.empPhase, 'active');
    race.player.empUntil = 5.2; // hit again: the impact replays, Freeze carries on
    ui.update(race);
    assert.deepEqual(itemUI.playerHitView, { emp: 1.5, freeze: 1.3, empPhase: 'impact', freezePhase: 'active', calm: false });
    race.player.empUntil = 4.5; race.elapsed = 3;
    ui.update(race);
    calm = true;
    ui.update(race);
    assert.equal(screen.dataset.calm, 'true');
    assert.equal(itemUI.playerHitView.calm, true);
    race.phase = 'paused';
    ui.update(race);
    assert.equal(screen.hidden, true, 'hide the screen effect behind pause');
    assert.equal(itemUI.playerHitView.emp, 0);
    assert.equal(itemUI.playerHitView.freeze, 0);
    assert.equal(itemUI.playerHitView.empPhase + itemUI.playerHitView.freezePhase, '');
    race.phase = 'racing';
    ui.update(race);
    assert.equal(screen.hidden, false);
    assert.equal(itemUI.playerHitView.freezePhase, 'impact', 'a pause does not move the hit forward: the race clock stood still');

    race.elapsed = 4.5;
    ui.update(race);
    assert.equal(nodes['bonus-status'].textContent, 'FROZEN · 1s');
    assert.equal(screen.dataset.hit, 'freeze');
    assert.deepEqual(itemUI.playerHitView, { emp: 0, freeze: .5, empPhase: '', freezePhase: 'recovery', calm: true });
    race.elapsed = 5;
    ui.update(race);
    assert.equal(screen.hidden, true);
    assert.equal(screen.dataset.hit, '');
    assert.equal(itemUI.playerHitView.freeze, 0);
    race.player.effects.freeze = 2;
    ui.update(race);
    assert.equal(itemUI.playerHitView.freeze, 0, 'an outgoing attack must not light the incoming alert');
    assert.equal(nodes['bonus-status'].hidden, true);
  } finally { globalThis.document = previousDocument; }
});
