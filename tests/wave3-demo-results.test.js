import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectWave3DemoResults } from '../src/wave3-demo-results-view.ts';
import { mountWave3DemoResults } from '../src/wave3-demo-results-ui.ts';

const missions = {
  'mission-race': { progress: 1, goal: 1, claimed: false, rewardDemoPoints: 10 },
  'mission-time': { progress: 0, goal: 1, claimed: false, rewardDemoPoints: 10 },
  'mission-drift': { progress: 1, goal: 2, claimed: false, rewardDemoPoints: 10 },
  'mission-combo': { progress: 0, goal: 1, claimed: false, rewardDemoPoints: 10 },
};
const snapshot = (extra = {}) => ({ version: 1, catalogVersion: 1, mode: 'local-demo', authority: 'local', syncState: 'local-only', accountId: 'guest', demoPoints: 40, demoInventory: [], equippedPreview: null, updatedAt: 100, missions, ...extra });
const settlement = (status = 'completed', deltaDemoPoints = 20, state = snapshot()) => ({ status, deltaDemoPoints, snapshot: state });

class FakeElement {
  constructor(tagName, ownerDocument) { this.tagName = tagName.toUpperCase(); this.ownerDocument = ownerDocument; this.children = []; this.attributes = {}; this.dataset = {}; this.textContent = ''; this.className = ''; this.hidden = false; this.listeners = {}; this.parentElement = null; }
  append(...children) { for (const child of children) { child.parentElement = this; this.children.push(child); } }
  replaceChildren(...children) { for (const child of this.children) child.parentElement = null; this.children = []; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(event, listener) { this.listeners[event] = listener; }
  fire(event) { this.listeners[event]?.(); }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
  querySelector(selector) {
    const matches = el => selector === '[data-wave3-demo-results]' ? Object.hasOwn(el.dataset, 'wave3DemoResults') :
      selector.startsWith('.') ? el.className.split(' ').includes(selector.slice(1)) : el.tagName.toLowerCase() === selector;
    for (const child of this.children) { if (matches(child)) return child; const nested = child.querySelector(selector); if (nested) return nested; }
    return null;
  }
  querySelectorAll(selector) { const out = []; for (const child of this.children) { if (selector.startsWith('.') && child.className.split(' ').includes(selector.slice(1)) || child.tagName.toLowerCase() === selector) out.push(child); out.push(...child.querySelectorAll(selector)); } return out; }
}
const fakeHost = () => { const doc = { createElement(tag) { return new FakeElement(tag, doc); } }; return doc.createElement('div'); };

test('eligible finished result projects local demo payout and bounded matching mission progress only', () => {
  const result = settlement();
  const view = projectWave3DemoResults(result, { locale: 'en', raceMode: 'classic' });
  assert.equal(view.state, 'earned');
  assert.equal(view.points, '+20 Demo points');
  assert.ok(view.missions.some(m => m.id === 'mission-race' && m.progress === 1 && m.goal === 1));
  assert.ok(view.missions.some(m => m.id === 'mission-drift' && m.progress === 1));
  assert.ok(!view.missions.some(m => m.id === 'mission-time'));
  assert.match(view.distinction, /stars|medals/i);
  assert.doesNotMatch(JSON.stringify(view), /40 Demo points|purchase confirmed|server verified|permanently owned/i);
  assert.deepEqual(result, settlement()); // projection is read-only
});

test('ineligible result has no payout and no misleading mission completion', () => {
  const view = projectWave3DemoResults(settlement('ineligible', 0), { locale: 'en', raceMode: 'endless' });
  assert.equal(view.state, 'ineligible');
  assert.equal(view.points, null);
  assert.deepEqual(view.missions, []);
  assert.match(view.status, /not eligible/i);
});

test('duplicate result display never converts existing demo points into another reward', () => {
  const view = projectWave3DemoResults(settlement('duplicate', 0), { locale: 'en' });
  assert.equal(view.state, 'duplicate');
  assert.equal(view.points, null);
  assert.match(view.status, /already recorded/i);
});

test('empty, invalid, unavailable and verified snapshots fail closed without exposing real balances', () => {
  for (const result of [null, undefined, settlement('unavailable', 0), settlement('expired', 0), settlement('completed', 20, snapshot({ mode: 'server', authority: 'verified' }))]) {
    const view = projectWave3DemoResults(result, { locale: 'en' });
    assert.equal(view.state, 'unavailable'); assert.equal(view.points, null); assert.deepEqual(view.missions, []);
  }
});

test('Traditional Chinese and English text explicitly marks disposable demo rewards', () => {
  const chinese = projectWave3DemoResults(settlement(), { locale: 'zh-TW' });
  assert.equal(chinese.heading, '試玩獎勵');
  assert.match(chinese.status, /試玩/);
  assert.match(chinese.disclaimer, /僅此裝置|本機/);
  assert.match(chinese.distinction, /星星|獎牌/);
  const english = projectWave3DemoResults(settlement(), { locale: 'en' });
  assert.equal(english.heading, 'Demo reward');
  assert.match(english.disclaimer, /device|local/i);
});

test('missing or broken optional art leaves a CSS fallback and readable reward text', () => {
  const host = fakeHost();
  const withoutAsset = mountWave3DemoResults({ container: host, settlement: settlement(), locale: 'en' });
  assert.equal(withoutAsset.querySelector('img'), null);
  assert.ok(withoutAsset.querySelector('.wave3-demo-results__mark').textContent);
  assert.match(withoutAsset.querySelector('.wave3-demo-results__points').textContent, /20 Demo points/);
  const withAsset = mountWave3DemoResults({ container: host, settlement: settlement(), locale: 'en', artworkUrl: '/optional.webp' });
  const image = withAsset.querySelector('img'); assert.ok(image);
  image.fire('error');
  assert.equal(withAsset.querySelector('img'), null);
  assert.ok(withAsset.querySelector('.wave3-demo-results__mark').textContent);
});

test('results are a keyboard reachable region with a polite atomic status and native accessible progress', () => {
  const region = mountWave3DemoResults({ container: fakeHost(), settlement: settlement(), locale: 'en' });
  assert.equal(region.tagName, 'SECTION'); assert.equal(region.tabIndex, 0);
  assert.equal(region.getAttribute('role'), 'region');
  assert.equal(region.getAttribute('aria-label'), 'Demo reward');
  const status = region.querySelector('.wave3-demo-results__status');
  assert.equal(status.getAttribute('role'), 'status'); assert.equal(status.getAttribute('aria-live'), 'polite');
  assert.equal(status.getAttribute('aria-atomic'), 'true');
  const progress = region.querySelector('progress');
  assert.ok(progress); assert.ok(progress.getAttribute('aria-label'));
});

test('rerender reuses the same node/status and does not modify existing results or award again', () => {
  const host = fakeHost(); const previous = host.ownerDocument.createElement('div'); previous.textContent = 'STAR 2'; host.append(previous);
  const first = mountWave3DemoResults({ container: host, settlement: settlement(), locale: 'en' });
  const status = first.querySelector('.wave3-demo-results__status');
  const initialMission = first.querySelector('progress');
  const again = mountWave3DemoResults({ container: host, settlement: settlement(), locale: 'en' });
  assert.strictEqual(first, again); assert.strictEqual(again.querySelector('.wave3-demo-results__status'), status);
  assert.strictEqual(again.querySelector('progress'), initialMission);
  assert.strictEqual(host.children[0], previous); assert.equal(previous.textContent, 'STAR 2');
  assert.equal(host.querySelectorAll('.wave3-demo-results').length, 1);
});

test('compact portrait/landscape and reduced-motion styling is scoped to the optional card', () => {
  const css = readFileSync(new URL('../src/wave3-demo-results.css', import.meta.url), 'utf8');
  assert.match(css, /\.wave3-demo-results/);
  assert.match(css, /max-height:\s*480px/);
  assert.match(css, /max-width:\s*480px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /#result-stats|#again-button|#next-button/);
});

test('reward panel remains anchored in the results summary instead of jumping from a transformed fixed-position parent', () => {
  const css = readFileSync(new URL('../src/wave3-demo-results.css', import.meta.url), 'utf8');
  const card = css.match(/\.wave3-demo-results\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(card, /position:\s*static/);
  assert.doesNotMatch(card, /position:\s*(?:fixed|absolute)/);
  assert.doesNotMatch(card, /\b(?:left|bottom|right|top):/);
  assert.match(css, /\.wave3-demo-results\s*\{[^}]*max-height:\s*min\(/s);
  assert.doesNotMatch(css, /#result-cloud|#again-button|#result-links/);
});

test('short landscape results show a compact earned reward without crowding race actions', () => {
  const css = readFileSync(new URL('../src/wave3-demo-results.css', import.meta.url), 'utf8');
  const compact = css.split('@media (max-height: 500px) and (orientation: landscape)')[1] ?? '';
  assert.match(compact, /\.wave3-demo-results\s*\{/);
  assert.match(compact, /\.wave3-demo-results__banner\s*\{\s*display:\s*none/);
  assert.match(compact, /\.wave3-demo-results__missions/);
  assert.match(compact, /\.wave3-demo-results__points/);
});

test('results A-03 optional WebP falls back to PNG then retained decorative CSS mark', () => {
  const host = fakeHost();
  const region = mountWave3DemoResults({
    container: host, settlement: settlement(), artworkUrl: '/demo-points@3x.webp',
    artworkFallbackUrl: '/demo-points@3x.png',
  });
  const image = region.querySelector('img');
  assert.ok(image);
  image.fire('error');
  assert.equal(image.src, '/demo-points@3x.png');
  image.fire('error');
  assert.equal(region.querySelector('img'), null);
  assert.match(region.querySelector('.wave3-demo-results__points').textContent, /20 Demo points/);
});

test('A-06 WebP-only art hides on error without changing settled demo reward text', () => {
  const host = fakeHost();
  const region = mountWave3DemoResults({
    container: host, settlement: settlement(), locale: 'en',
    bannerUrl: '/demo-results-banner@3x.webp',
  });
  const banner = region.querySelector('.wave3-demo-results__banner');
  assert.ok(banner);
  assert.equal(banner.hidden, false);
  const image = banner.querySelector('img');
  assert.equal(image.src, '/demo-results-banner@3x.webp');
  assert.equal(image.alt, '');
  image.fire('error');
  assert.equal(banner.querySelector('img'), null);
  assert.equal(banner.hidden, true);
  assert.match(region.querySelector('.wave3-demo-results__points').textContent, /20 Demo points/);
  mountWave3DemoResults({ container: host, settlement: settlement('duplicate', 0),
    bannerUrl: '/demo-results-banner@3x.webp' });
  assert.equal(banner.hidden, true);
});
