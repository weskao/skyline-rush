import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace } from '../src/game.js';
import { normalizeRaceConfig, rulesSignature } from '../src/race-config.ts';

test('Custom and Free Drive may opt into deterministic road obstacles', () => {
  for (const mode of ['custom','free']) {
    const standard = createRace('coast', {mode, hazards:'standard'});
    const same = createRace('coast', {mode, hazards:'standard'});
    assert.ok(standard.hazards.length > 0);
    assert.deepEqual(standard.hazards, same.hazards);
    assert.equal(standard.config.hazards, 'standard');
    assert.ok(createRace('coast', {mode, hazards:'extreme'}).hazards.length > standard.hazards.length);
  }
});

test('Practice defaults and Classic/Daily preserve old no-hazard balance', () => {
  assert.equal(createRace('coast').hazards.length, 0);
  assert.equal(createRace('coast','double-traffic').hazards.length,0);
  assert.equal(createRace('coast',{mode:'custom'}).hazards.length,0);
  assert.equal(createRace('coast',{mode:'free',hazards:'off'}).hazards.length,0);
  assert.equal(createRace('coast',{mode:'classic',hazards:'extreme'}).hazards.length,0);
  assert.equal(normalizeRaceConfig({mode:'classic',hazards:'extreme'}).hazards,undefined);
  assert.equal(normalizeRaceConfig({mode:'custom',hazards:'off'}).hazards,undefined);
});

test('Hazards change practice signatures without invalidating existing no-hazard runs', () => {
  const original={mode:'custom',rivals:2};
  assert.equal(rulesSignature(original),rulesSignature({...original,hazards:'off'}));
  assert.notEqual(rulesSignature(original),rulesSignature({...original,hazards:'standard'}));
  assert.notEqual(rulesSignature({...original,hazards:'standard'}),rulesSignature({...original,hazards:'extreme'}));
});

test('Invalid obstacle tiers do not add hidden obstacles', () => {
  for (const mode of ['custom','free']) {
    const game=createRace('coast',{mode,hazards:'invalid'});
    assert.equal(game.hazards.length,0);
    assert.equal(game.config.hazards,undefined);
  }
});

test('ENV-07 hazard intensity is offered only by modes that support it', async () => {
  const { MODES } = await import('../src/race-config.ts');
  for (const mode of MODES) {
    const practice = mode === 'custom' || mode === 'free';
    for (const hazards of ['standard', 'extreme']) {
      assert.equal(normalizeRaceConfig({ mode, hazards }).hazards, practice ? hazards : undefined, `${mode} ${hazards}`);
      assert.equal(createRace('coast', { mode, hazards }).hazards.length > 0, practice || mode === 'gauntlet', `${mode} ${hazards}`);
    }
    assert.equal(normalizeRaceConfig({ mode, hazardTier: 'extreme' }).hazardTier, mode === 'gauntlet' ? 'extreme' : undefined, mode);
  }
});
