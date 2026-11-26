import { test, expect } from './helpers/test.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

// Fixed race scenario (scripted input, same viewport/DPR): counts DOM mutation records and compositing-relevant
// browser metrics over a fixed wall-clock window. Software/local Chromium numbers: label them with HUD_ENV.
// A steady racing HUD must not rewrite a value it already holds (docs/performance/hud-compositing.md).
const WINDOW_MS = 4000;
const profiles = [
  { name: 'desktop-1440x900', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'iphone-390x844', viewport: { width: 390, height: 844 }, mobile: true },
];
const TRACED = ['Layout', 'UpdateLayoutTree', 'Paint', 'PrePaint', 'UpdateLayer', 'CompositeLayers', 'Layerize', 'Commit'];

for (const profile of profiles) {
  test.describe(profile.name, () => {
    test.use({ viewport: profile.viewport, hasTouch: profile.mobile, isMobile: profile.mobile });
    test(`HUD DOM writes and layout/style work in a fixed race (${profile.name})`, async ({ page, browser }) => {
      test.setTimeout(ciTimeout(120000));
      await page.addInitScript(() => {
        localStorage.setItem('skyline-rush-target-fps-v1', '60');
        localStorage.setItem('skyline-rush-music', 'off');
        localStorage.setItem('skyline-rush-sound', 'off');
      });
      await page.goto('/');
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(60000) });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      await page.evaluate(() => {
        const label = node => (node.id ? `#${node.id}` : typeof node.className === 'string' && node.className ? `.${node.className.trim().split(/\s+/)[0]}` : node.nodeName.toLowerCase());
        const audit = window.__hudWrites = { records: 0, redundant: 0, frames: 0, byTarget: {} };
        const observer = new MutationObserver(records => {
          for (const record of records) {
            audit.records++;
            let key, redundant = false;
            if (record.type === 'attributes') {
              key = `${label(record.target)}[${record.attributeName}]`;
              redundant = record.oldValue === record.target.getAttribute(record.attributeName);
            } else if (record.type === 'characterData') {
              key = `${label(record.target.parentElement ?? record.target)}(text)`;
              redundant = record.oldValue === record.target.data;
            } else key = `${label(record.target)}(children)`;
            if (redundant) audit.redundant++;
            const row = audit.byTarget[key] ??= { n: 0, redundant: 0 };
            row.n++;
            if (redundant) row.redundant++;
          }
        });
        observer.observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, characterData: true, characterDataOldValue: true, childList: true });
        const tick = () => { audit.frames++; requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
        window.__hudObserver = observer;
      });
      const invalidation = process.env.HUD_TRACE_INVALIDATION === '1'; // diagnosis only: slows the page
      await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', ...(invalidation ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : [])] });
      const before = (await cdp.send('Performance.getMetrics')).metrics;
      // Fixed input script: throttle held, steering alternates left/right every 500 ms (drives --flight-bank and the needle).
      await page.keyboard.down('ArrowUp');
      for (let step = 0; step < WINDOW_MS / 500; step++) {
        const key = step % 2 ? 'ArrowLeft' : 'ArrowRight';
        await page.keyboard.down(key);
        await page.waitForTimeout(500);
        await page.keyboard.up(key);
      }
      await page.keyboard.up('ArrowUp');
      const after = (await cdp.send('Performance.getMetrics')).metrics;
      const trace = JSON.parse((await browser.stopTracing()).toString());
      const audit = await page.evaluate(() => { window.__hudObserver.disconnect(); return window.__hudWrites; });
      // Layer audit: visible elements that create a filter/backdrop-filter/will-change layer while racing.
      const layers = await page.evaluate(() => {
        const rows = {};
        for (const el of document.querySelectorAll('body *')) {
          const box = el.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          for (const [prop, value] of [['backdrop-filter', cs.backdropFilter], ['filter', cs.filter], ['will-change', cs.willChange], ['mix-blend-mode', cs.mixBlendMode]]) {
            if (value && value !== 'none' && value !== 'auto' && value !== 'normal') { const key = `${prop}:${el.id ? '#' + el.id : el.nodeName.toLowerCase() + '.' + String(el.getAttribute('class') ?? '').split(' ')[0]}`; rows[key] = (rows[key] ?? 0) + 1; }
          }
        }
        return rows;
      });
      const delta = Object.fromEntries(after.map(m => [m.name, +(m.value - (before.find(b => b.name === m.name)?.value ?? 0)).toFixed(4)]));
      const events = {}, reasons = {};
      for (const event of trace.traceEvents ?? []) {
        if (event.name === 'StyleRecalcInvalidationTracking') {
          const d = event.args?.data ?? {};
          const key = `${d.reason}|${d.nodeName}|${d.extraData ?? ''}`.slice(0, 120);
          reasons[key] = (reasons[key] ?? 0) + 1;
        }
        if (!TRACED.includes(event.name) || event.ph !== 'X') continue;
        const row = events[event.name] ??= { count: 0, ms: 0 };
        row.count++;
        row.ms += (event.dur ?? 0) / 1000;
      }
      for (const row of Object.values(events)) row.ms = +row.ms.toFixed(2);
      const top = Object.entries(audit.byTarget).sort((a, b) => b[1].n - a[1].n).slice(0, 25);
      const result = { profile: profile.name, environment: process.env.HUD_ENV ?? 'local-chromium', windowMs: WINDOW_MS, frames: audit.frames,
        domRecords: audit.records, redundantRecords: audit.redundant,
        metrics: Object.fromEntries(['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'RecalcStyleDuration', 'ScriptDuration', 'TaskDuration'].map(k => [k, delta[k]])),
        trace: events, ...(invalidation && { invalidations: Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 25) }), layers, topTargets: Object.fromEntries(top) };
      console.log(`HUD_BENCH ${JSON.stringify(result)}`);
      if (process.env.HUD_BENCH_OUT) {
        const path = `${process.env.HUD_BENCH_OUT}.${profile.name}.json`;
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(result, null, 2));
      }
      expect(audit.frames).toBeGreaterThan(5);
      // Same-value writes: steady racing HUD attributes are written only when they change (race-hud.ts setHudAttr).
      const redundantHot = Object.entries(audit.byTarget).filter(([key, row]) => row.redundant && /aria-pressed|fuel-meter|nitro-meter|boost-status/.test(key));
      expect(redundantHot, 'unchanged HUD attribute writes').toEqual([]);
      // Skipping unchanged writes must not leave the meters' accessible values stale.
      const fuel = page.locator('#fuel-meter');
      expect(Number(await fuel.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);
      await expect(fuel).toHaveAttribute('aria-valuetext', /\S/);
      await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuenow', /^\d+$/);
      // High-frequency custom properties live on the element that reads them, never on <body>.
      expect(audit.byTarget['body[style]'], 'body inline style writes').toBeUndefined();
      // No boost in this scenario: the faded-out speed streaks must not keep 18 infinite animations running.
      await expect(page.locator('.speed-streaks')).toHaveAttribute('data-idle', '');
      expect(await page.evaluate(() => document.getAnimations().filter(a => a.animationName === 'wind-rush' && a.playState === 'running').length)).toBe(0);
    });
  });
}
