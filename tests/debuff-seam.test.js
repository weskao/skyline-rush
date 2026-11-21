import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DEBUFF_TIMELINE, debuffPhase } from '../src/debuff/timeline.ts';
import { ITEM_SETTINGS_COPY } from '../src/locales/item-settings.ts';

const source = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('a debuff runs impact, spread, active and recovery on its own clock', () => {
  assert.deepEqual(DEBUFF_TIMELINE, {
    freeze: { impact: .15, spread: .65, recovery: .5 },
    emp: { impact: .1, spread: .45, recovery: .3 },
  });
  assert.equal(debuffPhase('freeze', 0, 2), 'impact');
  assert.equal(debuffPhase('freeze', .15, 1.85), 'spread');
  assert.equal(debuffPhase('freeze', .65, 1.35), 'active');
  assert.equal(debuffPhase('freeze', 1.5, .5), 'recovery');
  assert.equal(debuffPhase('emp', .09, 1.41), 'impact');
  assert.equal(debuffPhase('emp', .1, 1.4), 'spread');
  assert.equal(debuffPhase('emp', .45, 1.05), 'active');
  assert.equal(debuffPhase('emp', 1.2, .3), 'recovery');
  // A hit that lands on an almost spent debuff still clears: the last seconds are always the recovery.
  assert.equal(debuffPhase('emp', 0, .2), 'recovery');
});

test('Freeze and EMP each say what happened and what it does, in both locales', () => {
  const { en, 'zh-TW': zh } = ITEM_SETTINGS_COPY;
  assert.equal(zh['mode.playerHit.freeze'], '冰凍！');
  assert.equal(zh['mode.playerHit.freezeDetail'], '操控暫時變遲緩');
  assert.equal(zh['mode.playerHit.emp'], 'EMP 電擊！');
  assert.equal(zh['mode.playerHit.empDetail'], '操控暫時受干擾');
  assert.equal(zh['mode.playerHit.time'], '{sec} 秒');
  for (const key of ['freeze', 'freezeDetail', 'emp', 'empDetail', 'time']) assert.ok(en[`mode.playerHit.${key}`], `en ${key}`);
  assert.equal('mode.playerHit.speed' in en || 'mode.playerHit.speed' in zh, false, 'the shared "speed reduced" line is gone');
});

// Freeze and EMP are built on separate branches. Each effect's look lives in its own folder, and the shared
// files only route to it: a per-effect rule in a shared file is a merge conflict waiting for the next change.
test('shared HUD and status files hold no per-effect look', () => {
  for (const [effect, Name] of [['freeze', 'Freeze'], ['emp', 'Emp']]) {
    for (const file of [`${effect}.css`, `${Name}Screen.vue`, `${Name}PanelDecor.vue`, `${effect}-shell.ts`, `${effect}-fx.ts`]) {
      assert.ok(existsSync(new URL(`../src/debuff/${effect}/${file}`, import.meta.url)), `src/debuff/${effect}/${file}`);
    }
  }
  const perEffect = /\[data-(debuff|hit)="(freeze|emp)"\]/;
  for (const file of ['player-hit-screen.css', 'PlayerHitCenter.vue', 'RaceSpeedometer.vue', 'PlayerHitScreen.vue']) {
    assert.doesNotMatch(source(file), perEffect, `${file} styles one effect`);
  }
  const screen = source('player-hit-screen.css');
  assert.match(screen, /@import '\.\/debuff\/freeze\/freeze\.css';/);
  assert.match(screen, /@import '\.\/debuff\/emp\/emp\.css';/);
  const tint = source('rival-status-tint.ts');
  assert.doesNotMatch(tint, /facets|strike|glint/, 'the shell shader body of each effect lives in its own module');
  assert.match(tint, /FREEZE_SHELL/);
  assert.match(tint, /EMP_SHELL/);
  const fx = source('rival-status-fx.ts');
  assert.doesNotMatch(fx, /OctahedronGeometry|SPARK_WHITE|VAPOR/, 'crystals and sparks live with their effect');
  assert.doesNotMatch(source('App.vue'), /player-hit-screen/, 'App.vue mounts PlayerHitScreen instead of a bare div');
});
