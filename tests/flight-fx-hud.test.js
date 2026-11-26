import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFlightFxHud } from '../src/flight-fx-hud.ts';

const element = () => {
  const style = new Map(), attributes = new Map();
  return { style: { setProperty: (name, value) => style.set(name, value) }, vars: style, attributes,
    hasAttribute: name => attributes.has(name), setAttribute: (name, value) => attributes.set(name, value), removeAttribute: name => attributes.delete(name) };
};

test('high-frequency flight variables are written to the elements that read them, never to <body>', () => {
  const streaks = element(), director = element();
  const update = createFlightFxHud(streaks, director);
  update(1, -2.5, '0.6');
  assert.equal(director.vars.get('--flight-bank'), '-2.5deg');
  assert.equal(streaks.vars.get('--streak-opacity'), '0.6');
});

test('the invisible speed streaks stop animating after their fade-out and resume with the next boost', () => {
  const streaks = element(), director = element();
  const update = createFlightFxHud(streaks, director);
  update(0, 0, '0.6');
  assert.equal(streaks.hasAttribute('data-idle'), false, 'visible streaks keep playing');
  update(1, 0, '0');
  assert.equal(streaks.hasAttribute('data-idle'), false, 'the .4 s opacity fade is still running');
  update(1.5, 0, '0');
  assert.equal(streaks.hasAttribute('data-idle'), true, 'faded out: nothing visible to animate');
  update(2, 0, '0.6');
  assert.equal(streaks.hasAttribute('data-idle'), false);
});
