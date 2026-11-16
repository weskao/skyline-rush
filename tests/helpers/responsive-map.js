import { expect } from './test.js';

// The short-screen live map sits on the bottom row beside the thumb clusters, so its slot must follow every
// touch size, steering mode and hand (a fixed offset once overlapped the Large throttle/BOOST by 6-13px).
export const RACE_MAP_SIZES = [[375, 667], [360, 640], [320, 568], [844, 390], [874, 339], [812, 375], [932, 430]];
export const CONTROL_COMBOS = ['S', 'M', 'L'].flatMap(size => ['slide', 'buttons'].flatMap(mode => ['left', 'right'].map(hand => ({ size, mode, hand, version: 1 }))));
// Phones shorter than 380 px sit beside a home-indicator inset.
export const mapInsets = height => (height < 380 ? { left: 62, right: 62, top: 0, bottom: 21 } : null);

const OTHERS = ['.position-stat', '.leaderboard', '.race-progress', '.mode-indicator', '.speedometer', '.flight-telemetry', '.aero-tools',
  '#controls-button', '#pause-button', ...['left', 'right', 'brake', 'fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];

// Reload with the combo stored, press START and stop in the countdown, which already lays out the race HUD (telemetry only turns
// visible); skipping its 3s keeps the layouts quick.
export async function startControlCombo(page, combo) {
  await page.evaluate(value => localStorage.setItem('skyline-rush-controls', value), JSON.stringify(combo));
  await page.reload();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
}

export const readMapLayout = page => page.evaluate(selectors => {
  const box = el => { const { x, y, width, height } = el.getBoundingClientRect(); return { x, y, width, height }; };
  const map = document.querySelector('.race-route-map');
  const [steer, brake] = ['.touch-steer', '[data-control="brake"]'].map(selector => document.querySelector(selector));
  return { map: map.checkVisibility() ? box(map) : null, events: getComputedStyle(map).pointerEvents,
    steer: steer.checkVisibility() ? box(steer) : null, brake: brake.checkVisibility() ? box(brake) : null,
    others: selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el => el.checkVisibility()).map(el => [selector, box(el)])) };
}, OTHERS);

export function mapHits(result, combo, width, height) {
  const tag = `${combo.size}/${combo.mode}/${combo.hand} ${width}x${height}`;
  const hits = [];
  if (!result.map) return [`${tag}: map hidden`];
  if (result.events !== 'none') hits.push(`${tag}: map takes pointer events`);
  // A phone caps BRAKE short of its row: it must keep to the outer screen edge for either hand (the map slot relies on it).
  if (result.brake) {
    const [s, b] = [result.steer, result.brake];
    const gap = combo.hand === 'left' ? b.x - s.x : (s.x + s.width) - (b.x + b.width);
    if (Math.abs(gap) > 0.5) hits.push(`${tag}: brake ${Math.round(gap)}px off the outer edge`);
  }
  const m = result.map;
  if (m.x < 0 || m.y < 0 || m.x + m.width > width + 0.5 || m.y + m.height > height + 0.5) hits.push(`${tag}: map off screen`);
  // Portrait Buttons mode: [<][>] take the bottom row, so the map shares the BRAKE row; any higher and it covers the player's car.
  if (result.brake && height > width && m.y < result.brake.y - 0.5) hits.push(`${tag}: map rises ${Math.round(result.brake.y - m.y)}px above the BRAKE row onto the car`);
  for (const [name, b] of result.others) {
    const apart = m.x + m.width <= b.x + 0.5 || b.x + b.width <= m.x + 0.5 || m.y + m.height <= b.y + 0.5 || b.y + b.height <= m.y + 0.5;
    if (!apart) hits.push(`${tag}: map × ${name} ${Math.round(Math.min(m.x + m.width - b.x, b.x + b.width - m.x))}px`);
  }
  return hits;
}
