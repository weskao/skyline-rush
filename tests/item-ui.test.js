import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupItemUI } from '../src/item-ui.ts';
import { bankItem, tickItemCooldown } from '../src/active-items.ts';

test('item HUD announces pickup/cooldown once, keeps activation paused-safe and displays the active effect', () => {
  const previousDocument = globalThis.document;
  const listeners = new Map();
  const nodes = {
    'item-slot': { hidden: true, dataset: {} },
    'item-status': { textContent: '' },
    'bonus-status': { hidden: true, textContent: '' },
    'activate-item': { disabled: true, addEventListener: (name, listener) => listeners.set(name, listener) },
  };
  globalThis.document = { getElementById: id => nodes[id] };
  try {
    const race = { mode: 'custom', elapsed: 0, rings: [], phase: 'racing', config: { activeItems: true }, rivals: [], player: {
      heldItem: null, itemCooldown: 0, effects: { shield: 0, magnet: 0, ghost: 0, freeze: 0 },
    } };
    const cues = [];
    const ui = setupItemUI({ getRace: () => race, cue: name => cues.push(name) });
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
  } finally { globalThis.document = previousDocument; }
});
