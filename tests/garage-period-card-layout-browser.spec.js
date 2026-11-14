import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { WAVE3_CATALOG_VERSION, WAVE3_EXPERIENCE_VERSION } from '../src/wave3-experience-contract.ts';

// One card per state a player can meet at once: claimable (button), in progress, not started, claimed.
const GOALS = [['race', 1, 5], ['time', 1, 3], ['drift', 2, 6], ['combo', 1, 4]];
const PARTIAL = { 'mission-race:weekly': 4, 'mission-time:daily': 0 };
const CLAIMED = ['mission-time:weekly'];
// The checkpoint validator accepts only the full mission set: the four base missions plus their periods.
const missions = Object.fromEntries(GOALS.flatMap(([family, daily, weekly]) =>
  [[`mission-${family}`, daily, 0], [`mission-${family}:daily`, daily], [`mission-${family}:weekly`, weekly]])
  .map(([id, goal, progress]) =>
    [id, { progress: progress ?? PARTIAL[id] ?? goal, goal, claimed: CLAIMED.includes(id), rewardDemoPoints: 10 }]));

const seedDemo = page => page.addInitScript(({ version, catalogVersion, missions }) => {
  const now = Date.now();
  localStorage.setItem('skyline-rush-wave3-demo:v1:guest', JSON.stringify({
    version, accountId: 'guest', savedAt: now,
    snapshot: { version, catalogVersion, mode: 'local-demo', authority: 'local', syncState: 'local-only',
      accountId: 'guest', missions, demoPoints: 20, demoInventory: [], equippedPreview: null, updatedAt: now },
    checkpoint: { seenEvents: [], settledCompletions: [], missionTime: now },
  }));
}, { version: WAVE3_EXPERIENCE_VERSION, catalogVersion: WAVE3_CATALOG_VERSION, missions });

/** Parts of one card that share pixels, leave the card, or spill their own box; cards that share pixels. */
const measurePeriodCards = cards => cards.evaluateAll(els => {
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5;
  const boxes = els.map(el => el.getBoundingClientRect());
  const problems = [];
  els.forEach((card, index) => {
    const id = card.dataset.missionId, box = boxes[index];
    const parts = [...card.children].map(el => ({ el, name: el.className || el.tagName.toLowerCase(), r: el.getBoundingClientRect() }))
      .filter(part => part.r.width > 0 && part.r.height > 0);
    parts.forEach((a, i) => {
      for (const b of parts.slice(i + 1)) if (hit(a.r, b.r)) problems.push(`${id}: ${a.name} overlaps ${b.name}`);
      if (a.r.left < box.left - .5 || a.r.right > box.right + .5 || a.r.top < box.top - .5 || a.r.bottom > box.bottom + .5)
        problems.push(`${id}: ${a.name} leaves the card`);
      if (a.el.scrollWidth > a.el.clientWidth + 1) problems.push(`${id}: ${a.name} spills its box`);
    });
    if (card.scrollWidth > card.clientWidth) problems.push(`${id}: card content is clipped`);
    for (let other = index + 1; other < els.length; other++)
      if (hit(box, boxes[other])) problems.push(`${id}: card overlaps ${els[other].dataset.missionId}`);
  });
  return problems;
});

for (const locale of ['en', 'zh-TW']) {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [768, 1024], [1440, 900]]) {
    test(`period card parts never overlap in ${locale} at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await seedDemo(page);
      await page.goto('/');
      await selectLocale(page, locale);
      await page.locator('#garage-button').click();
      const board = page.locator('.garage-mission-board');
      const card = id => board.locator(`.garage-period-card[data-mission-id="${id}"]`);
      await expect(card('mission-race:daily')).toHaveAttribute('data-mission-state', 'claimable');
      await expect(card('mission-race:weekly')).toHaveAttribute('data-mission-state', 'in-progress');
      await expect(card('mission-time:daily')).toHaveAttribute('data-mission-state', 'not-started');
      await expect(card('mission-time:weekly')).toHaveAttribute('data-mission-state', 'claimed');
      await card('mission-race:daily').scrollIntoViewIfNeeded();
      expect(await measurePeriodCards(board.locator('.garage-period-card'))).toEqual([]);
      const claim = await card('mission-race:daily').locator('.garage-mission-claim').boundingBox();
      expect(claim.height, 'claim touch height').toBeGreaterThanOrEqual(44);
      // The reward shows as icon chips; each icon still names its currency for assistive tech.
      await expect(card('mission-race:daily').locator('.period-reward')).toContainText('+40');
      await expect(card('mission-race:daily').getByRole('img', { name: locale === 'en' ? 'Demo coins' : '試玩金幣' })).toHaveCount(1);
      await board.locator('.garage-period-grid').screenshot({ path: test.info().outputPath('period-grid.png') });
    });
  }
}
