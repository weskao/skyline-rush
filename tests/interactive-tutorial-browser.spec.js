import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { DRIFT_ENTRY_KMH } from './helpers/tutorial-practice.js';

// Keep tutorial input/physics tests on real browser controls, but avoid software-WebGL
// frame starvation on shared CI runners. Renderer/quality coverage lives in separate specs.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, get: () => 2 });
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, get: () => 2 });
  });
});

const coach = page => page.locator('#tutorial-coach');
const step = (page, name) => expect(coach(page)).toHaveAttribute('data-step', name);
const begin = async page => {
  await page.goto('/');
  await page.locator('#controls-button').click();
  await expect(page.locator('#tutorial-open')).toBeVisible();
  await page.locator('#tutorial-open').click();
  await step(page, 'throttle');
};
const career = page => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => /history|best|unlocked|stars|medals|ghost|daily/.test(key))));
const keyStep = async (page, key, next) => {
  await page.keyboard.down(key);
  await step(page, next);
  await page.keyboard.up(key);
};

// Engine-judged lessons leave fractions of a second of game time: the 0.3 s flick window, the height for a soft
// landing, 0.2 s before a held drift reaches the rail. One harness round trip under CI load took 17 frames
// (0.38 s), so the page sends each time-critical key edge on the frame its cue appears. Opening presses stay
// real keyboard input, and the engine still judges every lesson.
const keysOnCue = (page, cue, edges) => page.evaluate(({ cue, edges }) => new Promise(resolve => {
  const ready = () => typeof cue === 'string'
    ? document.querySelector('#tutorial-instruction')?.textContent?.includes(cue)
    : Number(document.querySelector(cue.selector)?.[cue.prop ?? 'textContent']) >= cue.min;
  const poll = () => {
    if (!ready()) return requestAnimationFrame(poll);
    for (const [type, code] of edges) dispatchEvent(new KeyboardEvent(type, { code }));
    resolve();
  };
  poll();
}), { cue, edges });
// The brake lesson's held key can slow the car, so wait for auto-throttle to reach a drift that outlasts 1 s.
const driftReady = page => page.waitForFunction(kmh => Number(document.querySelector('#speed')?.textContent) >= kmh, DRIFT_ENTRY_KMH, { polling: 'raf' });
// The coach progress bar reaches the next whole step once the drift lasts 1 s (the first payout tier).
const DRIFT_CHARGED = { selector: '#tutorial-progress', prop: 'value', min: 5 };
const driftCharged = page => page.waitForFunction(min => Number(document.querySelector('#tutorial-progress')?.value) >= min, DRIFT_CHARGED.min, { polling: 'raf' });
const keyboardDrift = async page => {
  await driftReady(page);
  // Sent together: steering alone drifts the car toward the rail, braking alone sheds the entry speed.
  await Promise.all([page.keyboard.down('a'), page.keyboard.down('s')]);
  await keysOnCue(page, DRIFT_CHARGED, [['keyup', 'KeyS'], ['keyup', 'KeyA']]);
  await page.keyboard.up('s');
  await page.keyboard.up('a');
  await step(page, 'fly');
};

const keyboardChain = async page => {
  await Promise.all([page.keyboard.down('Space'), page.keyboard.down('Shift')]);
  // Release FLY and BOOST once the chain is earned; holding thrust climbs into a hard landing.
  await keysOnCue(page, 'Powered flight detected', [['keyup', 'Space'], ['keyup', 'ShiftLeft']]);
  await page.keyboard.up('Space');
  await page.keyboard.up('Shift');
  await step(page, 'barrelRoll');
};
const keyboardRoll = async page => {
  await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeLessThan(.1);
  await page.keyboard.down('Space');
  // Release FLY at a safe height before the steering flick: the engine allows a roll while gliding.
  await keysOnCue(page, { selector: '#altitude', min: 1.5 }, [['keyup', 'Space']]);
  await page.keyboard.up('Space');
  await page.keyboard.down('a');
  await keysOnCue(page, 'First airborne steering press detected', [['keyup', 'KeyA'], ['keydown', 'KeyD']]);
  await page.keyboard.up('a');
  // Release RIGHT once spinning: held steering carries the car into the rail as it lands.
  await keysOnCue(page, 'BARREL ROLL spinning', [['keyup', 'KeyD']]);
  await step(page, 'nitro');
};

const keyboardToNitro = async page => {
  await keyStep(page, 'w', 'left');
  await keyStep(page, 'a', 'right');
  await keyStep(page, 'd', 'brake');
  await keyStep(page, 's', 'drift');
  await keyboardDrift(page);
  await keyStep(page, 'Space', 'land');
  await step(page, 'boost');
  await keyStep(page, 'Shift', 'airChain');
  await keyboardChain(page);
  await keyboardRoll(page);
};

test('practice opens with the race countdown, and FLY answers the moment GO shows', async ({ page }) => {
  await page.goto('/');
  await page.locator('#controls-button').click();
  await page.locator('#tutorial-open').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
  await expect(page.locator('#countdown')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(6000) });
  await page.keyboard.down('Space');
  await expect.poll(async () => Number(await page.locator('#altitude').textContent()), { timeout: ciTimeout(1500) }).toBeGreaterThan(0);
  await page.keyboard.up('Space');
});

test('keyboard practice requires real actions, completes all ten steps and preserves career', async ({ page }) => {
  await begin(page);
  const before = await career(page);
  await page.waitForTimeout(800);
  await step(page, 'throttle');
  await keyboardToNitro(page);
  await keyStep(page, 'e', 'complete');
  await expect(page.locator('#tutorial-retry')).toBeVisible();
  await expect(page.locator('#tutorial-done')).toHaveText('Back to game');
  await expect(page.locator('#tutorial-exit')).toBeHidden(); // Back to game already leaves practice
  // Completion must not freeze the world: the race stays live as a free cruise and a banner confirms the finish.
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await expect(page.locator('.tutorial-celebration')).toContainText('Free drive');
  await page.keyboard.down('a');
  await expect.poll(async () => page.evaluate(() => document.querySelector('#speed')?.textContent)).not.toBe('0');
  await page.keyboard.up('a');
  expect(await career(page)).toEqual(before);
  await page.locator('#tutorial-retry').click();
  await step(page, 'throttle');
  await page.locator('#tutorial-exit').click();
  await expect(coach(page)).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await expect(page.locator('#guide-practice')).toHaveText('Practice again');
});

test('NITRO practice recovers after braking and demands a fresh charged sprint', async ({ page }) => {
  await begin(page);
  await keyboardToNitro(page);
  await page.keyboard.down('s');
  await page.keyboard.down('e');
  await expect(page.locator('#tutorial-instruction')).toContainText('Sprint interrupted', {timeout: ciTimeout(30000)});
  await step(page, 'nitro');
  // The held key never receives another charge while pressed.
  await expect(page.locator('#tutorial-instruction')).toContainText('Release NITRO');
  await page.keyboard.up('e');
  await page.keyboard.up('s');
  await expect(page.locator('#tutorial-instruction')).toContainText('Activate NITRO');
  await keyStep(page, 'e', 'complete');
  await expect(page.locator('#tutorial-retry')).toBeVisible();
});

test.describe('touch NITRO interruption', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('brake and NITRO touches interrupt practice and a new touch spends a fresh charge', async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem('skyline-rush-controls', JSON.stringify({ version: 1, mode: 'buttons', flyMode: 'hold' })));
    await begin(page);
    // Skipping FLY leaves the car on the road, so LAND passes by itself within a frame: tapping Skip there would
    // race it and skip BOOST instead. Wait for BOOST directly.
    for (const next of ['left', 'right', 'brake', 'drift', 'fly', 'boost', 'airChain', 'barrelRoll', 'nitro']) {
      await page.locator('#tutorial-skip-step').tap();
      await step(page, next);
    }
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode', 'buttons');
    const session = await context.newCDPSession(page);
    const point = async (action, id) => {
      const box = await page.locator('#touch-controls [data-control="' + action + '"]').boundingBox();
      return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };
    // CDP rejects a touchEnd with no touch down, so the cleanup only lifts a touch the test left pressed.
    let down = false;
    const touch = async (type, points) => { await session.send('Input.dispatchTouchEvent', { type, touchPoints: points }); down = type === 'touchStart'; };
    try {
      await touch('touchStart', [await point('brake', 1), await point('nitro', 2)]);
      await expect(page.locator('#tutorial-instruction')).toContainText('Sprint interrupted', { timeout: ciTimeout(15000) });
      await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuenow', '0');
      await touch('touchEnd', []);
      await expect(page.locator('#tutorial-instruction')).toContainText('Activate NITRO');
      await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuenow', '1');
      await touch('touchStart', [await point('nitro', 3)]);
      await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuenow', '0');
      await touch('touchEnd', []);
      await step(page, 'complete');
    } finally {
      if (down) await touch('touchEnd', []);
      await session.detach();
    }
  });
});

test('practice restores a paused race and uses the current custom throttle key', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-keymap', JSON.stringify({throttle:['KeyZ'],brake:['KeyS'],left:['KeyA'],right:['KeyD'],fly:['Space'],boost:['ShiftLeft'],nitro:['KeyE']})));
  await page.goto('/');
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.keyboard.press('Escape');
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  const distance = await page.locator('#distance').textContent();
  await page.locator('#controls-button').click();
  await page.locator('#tutorial-open').click();
  await expect(page.locator('#tutorial-input')).toContainText('Z');
  await keyStep(page, 'z', 'left');
  await page.locator('#pause-button').click();
  await page.keyboard.down('a');
  await page.waitForTimeout(650);
  await page.keyboard.up('a');
  await step(page, 'left');
  await page.locator('#tutorial-exit').click();
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await expect(page.locator('#distance')).toHaveText(distance);
});

test('the gate arrow points the way and Skip step moves on by a real click', async ({ page }) => {
  await begin(page);
  const skip = page.locator('#tutorial-skip-step');
  await expect(skip).toBeVisible();
  await expect(page.locator('#tutorial-guide')).toHaveCount(0); // settled: the throttle lesson has no gate
  await skip.click();
  await step(page, 'left');
  await expect(page.locator('#tutorial-guide')).toHaveAttribute('data-dir', 'left');
  await expect(page.locator('#tutorial-instruction')).toContainText('gate');
  await page.locator('#pause-button').click();
  await expect(skip).toBeHidden();
  await page.locator('#resume-button').click();
  await expect(skip).toBeVisible();
  await skip.click();
  await step(page, 'right');
  await expect(page.locator('#tutorial-guide')).toHaveAttribute('data-dir', 'right');
  await expect(skip).not.toBeFocused(); // a focused skip button would re-fire on Space or Enter
});

test('switching language updates the active and paused lesson immediately', async ({ page }) => {
  await begin(page);
  await page.locator('#pause-button').click();
  await selectLocale(page,'zh-TW');
  await expect(page.locator('#tutorial-title')).toContainText('油門');
  await expect(page.locator('#overlay-copy')).toHaveText('練習已暫停，暫停時的操作不會計入。按下方按鈕繼續練習。');
  await selectLocale(page,'en');
  await expect(page.locator('#overlay-copy')).toContainText('Practice is paused');
});

test('the coach offers one control per action: no second pause, no second exit after completion', async ({ page }) => {
  await begin(page);
  const actions = page.locator('#tutorial-coach button:visible');
  await expect(actions).toHaveText(['Skip step', 'Exit']); // pausing is the top bar's ⏸ (Esc), as in every race
  await expect(page.locator('#pause-button')).toBeVisible();
  await expect(page.locator('#tutorial-pause')).toHaveCount(0); // settled: removed from the coach markup
});

// The full coach and the pause screen's title, copy and resume button never overlap, all inside the pause screen's
// visible box (it scrolls, so a button past its bottom edge is hidden from the player).
const pauseLayoutClear = page => page.evaluate(() => {
  const coach = document.querySelector('#tutorial-coach').getBoundingClientRect();
  const box = document.querySelector('#race-overlay').getBoundingClientRect();
  return [...document.querySelectorAll('#overlay-title, #overlay-copy, #resume-button')].every(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom <= Math.min(innerHeight, box.bottom) && r.right <= innerWidth && (r.top >= coach.bottom || r.bottom <= coach.top || r.left >= coach.right || r.right <= coach.left);
  });
});
for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 750, height: 342 }]) {
  test.describe(`paused practice ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true, isMobile: true });
    test('the pause screen is readable beside the full coach', async ({ page }) => {
      await begin(page);
      for (const next of ['left', 'right', 'brake', 'drift']) {
        await page.locator('#tutorial-skip-step').tap();
        await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', next);
      }
      await page.locator('#pause-button').tap();
      await selectLocale(page, 'zh-TW'); // the drift lesson in zh-TW is the tallest coach card
      await expect(page.locator('#race-overlay')).toBeVisible();
      // Paused, the coach keeps its lesson and progress; Exit is its only button.
      for (const id of ['#tutorial-title', '#tutorial-progress', '#tutorial-instruction']) await expect(page.locator(id)).toBeVisible();
      await expect(page.locator('#tutorial-coach button:visible')).toHaveText(['退出']);
      await expect.poll(() => pauseLayoutClear(page)).toBe(true);
      await page.locator('#resume-button').tap();
      await expect(page.locator('#tutorial-instruction')).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    });
  });
}

test('paused practice shows the pause screen and how to resume, including the auto-pause on leaving the tab', async ({ page }) => {
  await begin(page);
  const overlay = page.locator('#race-overlay'), resume = page.locator('#resume-button');
  await page.locator('#pause-button').click();
  await expect(overlay).toBeVisible();
  await expect(page.locator('#overlay-copy')).toContainText('Practice is paused');
  await expect(resume).toBeVisible();
  await expect(page.locator('#again-button')).toBeHidden(); // "Race again" has no meaning inside practice
  await expect(page.locator('#tutorial-title')).toBeVisible();
  await expect.poll(() => pauseLayoutClear(page)).toBe(true);
  await resume.click();
  await expect(overlay).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  // Switching tab/app auto-pauses: coming back must show the same pause screen, not a frozen road.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(overlay).toBeVisible();
  await expect(resume).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
  await expect(page.locator('#race-status')).toHaveText('RACING');
});

test.describe('first visit without storage', () => {
  test.use({guideSeen:false});
  test('first Start completes practice without storage, then starts the race', async ({page}) => {
    await page.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    await page.goto('/');
    await page.locator('#start-button').click();
    await keyboardToNitro(page);
    await keyStep(page,'e','complete');
    await expect(page.locator('#tutorial-done')).toHaveText('Start race');
    await page.locator('#tutorial-done').click();
    await expect(coach(page)).toBeHidden();
    await expect(page.locator('#race-status')).toHaveText('RACING');
  });
});

test.describe('granted tilt and rotation', () => {
  test.use({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  test('orientation input advances steering and survives a viewport rotation', async ({page}) => {
    await page.goto('/');
    await page.locator('#controls-button').click();
    await page.locator('[data-controls="mode"][value="tilt"]').check();
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode','tilt');
    const tilt = value => page.evaluate(value => {
      clearInterval(window.tutorialTestSensor);
      const send=()=>{
        const angle=screen.orientation.angle*Math.PI/180;
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{gamma:value*Math.cos(angle),beta:value*Math.sin(angle)}));
      };
      send(); window.tutorialTestSensor=setInterval(send,50);
    },value);
    await tilt(0);
    await page.locator('#tutorial-open').click();
    await tilt(0);
    await keyStep(page,'w','left');
    await tilt(-25);
    await step(page,'right');
    await page.evaluate(() => {
      clearInterval(window.tutorialTestSensor);
      window.tutorialRotated=false;
      window.addEventListener('resize',()=>{window.tutorialRotated=true;},{once:true});
    });
    await page.setViewportSize({width:844,height:390});
    await expect.poll(()=>page.evaluate(()=>window.tutorialRotated)).toBe(true);
    await tilt(0);
    await tilt(25);
    await step(page,'brake');
    await expect(page.locator('#tutorial-input')).toContainText(/brake/i);
    await page.locator('#tutorial-exit').tap();
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode','tilt');
  });
});

for (const [width,height,mode,flyMode,custom] of [[390,844,'slide','hold'],[320,568,'slide','hold'],[844,390,'buttons','toggle'],[768,1024,'buttons','hold'],[1024,768,'tilt','hold'],[390,844,'buttons','hold',true]]) {
  test.describe(`touch practice ${width}x${height} ${mode} ${flyMode}${custom?' custom layout':''}`, () => {
    test.use({viewport:{width,height},hasTouch:true,isMobile:true});
    test('real touch controls finish practice without the coach blocking actions', async ({ page, context }) => {
      // Up to five air-chain and three barrel-roll engine-judged attempts need more than
      // the default budget on CPU-only WebGL.
      test.setTimeout(ciTimeout(240000));
      const prefs = {version:1,mode,flyMode,...(custom?{layout:{throttle:{x:.15,y:.18}}}:{})};
      await page.addInitScript(prefs => localStorage.setItem('skyline-rush-controls',JSON.stringify(prefs)), prefs);
      await begin(page);
      await page.waitForTimeout(650);
      await step(page, 'throttle');
      // The coach must not cover the global AIRFLOW/VFX tool row (it sat over it on phones).
      for (const tool of await page.locator('.aero-tools > :visible').all())
        expect(await tool.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.bottom - 2)); })).toBe(true);
      const effectiveMode = mode === 'tilt' ? 'slide' : mode;
      await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode', effectiveMode);
      if(mode==='tilt') {
        await page.evaluate(() => {
          window.tutorialResizeCount=0;
          window.addEventListener('resize',()=>window.tutorialResizeCount++);
        });
        await page.setViewportSize({width:height,height:width});
        await expect.poll(()=>page.evaluate(()=>window.tutorialResizeCount)).toBeGreaterThan(0);
        await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode','slide');
        await page.setViewportSize({width,height});
        await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode','slide');
      }
      if(custom) await expect(page.locator('[data-control="throttle"]')).not.toHaveClass(/is-positioned/);
      if (effectiveMode === 'slide') {
        const [c,p]=await Promise.all([coach(page).boundingBox(),page.locator('.touch-pad').boundingBox()]);
        expect(c.y+c.height).toBeLessThan(p.y);
      }
      const session = await context.newCDPSession(page);
      const gesture = async (locator, next, dx=0,dy=0) => {
        const b=await locator.boundingBox();
        const p={id:1,x:b.x+b.width/2,y:b.y+b.height*.25};
        await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
        if(dx||dy) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,x:p.x+dx,y:p.y+dy}]});
        await step(page,next);
        await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      };
      const point = async (target, id) => {
        const b = await target.boundingBox();
        return { id, x: b.x + b.width / 2, y: b.y + b.height / 2 };
      };
      const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      const button = action => page.locator(`#touch-controls [data-control="${action}"]`);
      // A CDP touch pair avoids Playwright's actionability delay while FLY is
      // latched; that delay can turn a clean AIR→ROAD landing into a hard one
      // on software-WebGL runners. These are real browser pointer events.
      const tapTouch = async target => {
        const p = await point(target, 9);
        await touch('touchStart', [p]);
        await touch('touchEnd', []);
      };
      const waitForCoachText = (text, timeout = ciTimeout(15000)) => page.waitForFunction(
        text => document.querySelector('#tutorial-instruction')?.textContent?.includes(text),
        text, { polling: 'raf', timeout },
      );
      await gesture(button('throttle'),'left');
      await gesture(effectiveMode==='slide'?page.locator('.touch-pad'):button('left'),'right',effectiveMode==='slide'?-55:0);
      await gesture(effectiveMode==='slide'?page.locator('.touch-pad'):button('right'),'brake',effectiveMode==='slide'?55:0);
      await gesture(effectiveMode==='slide'?page.locator('.touch-pad'):button('brake'),'drift',0,effectiveMode==='slide'?55:0);
      await driftReady(page);
      if (effectiveMode === 'slide') {
        // One thumb: slide down (brake) and sideways (steer) on the pad.
        const b = await page.locator('.touch-pad').boundingBox();
        const p = { id: 1, x: b.x + b.width / 2, y: b.y + b.height * .25 };
        await touch('touchStart', [p]);
        await touch('touchMove', [{ ...p, x: p.x - 55, y: p.y + 55 }]);
      } else await touch('touchStart', [await point(button('left'), 1), await point(button('brake'), 2)]);
      await driftCharged(page);
      await touch('touchEnd', []);
      await step(page,'fly');
      await gesture(button('fly'),'land');
      if(flyMode==='toggle') await tapTouch(button('fly'));
      await step(page,'boost');
      await gesture(button('boost'),'airChain');
      // Begin both real touch pointers together: a second touchStart can
      // cancel the first pointer's capture on Chromium software-WebGL runners.
      // The coach must still observe powered flight and the engine must award
      // an actual soft landing before the lesson advances.
      const chainEvidence = [];
      const attemptChain = async () => {
        const fly = await point(button('fly'), 1), boost = await point(button('boost'), 2);
        let flightDetected = false;
        try {
          if (flyMode === 'toggle') {
            await tapTouch(button('fly'));
            await touch('touchStart', [boost]);
          } else {
            await touch('touchStart', [fly, boost]);
          }
          try {
            await waitForCoachText('Powered flight detected', ciTimeout(1800));
            flightDetected = true;
          } catch (error) {
            if (error.name !== 'TimeoutError') throw error;
          }
        } finally {
          // Unlatch FLY in the same dispatch as the boost hold: on slow software-WebGL
          // frames every extra round trip lets the car climb past a soft-landing height.
          if (flyMode === 'toggle') await touch('touchStart', [boost, fly]);
          await touch('touchEnd', []);
        }
        await page.waitForFunction(
          () => Number(document.querySelector('#altitude')?.textContent) <= 0.15,
          null, { polling: 'raf', timeout: ciTimeout(20000) },
        );
        chainEvidence.push({ flightDetected, ...(await page.evaluate(() => ({
          step: document.querySelector('#tutorial-coach')?.dataset.step,
          instruction: document.querySelector('#tutorial-instruction')?.textContent,
          altitude: document.querySelector('#altitude')?.textContent,
        }))) });
      };
      for (let retry = 0; retry < 5 && await coach(page).getAttribute('data-step') === 'airChain'; retry++) {
        await attemptChain();
      }
      await expect(coach(page), JSON.stringify(chainEvidence)).toHaveAttribute('data-step', 'barrelRoll');
      const steerTarget = effectiveMode === 'slide' ? page.locator('.touch-pad') : button('left');
      const left = await point(steerTarget, 2);
      const right = effectiveMode === 'slide' ? null : await point(button('right'), 3);
      const pad = effectiveMode === 'slide' ? left : null;
      // The 0.3s engine flick window can elapse without a visible "spinning"
      // message on slower renderers. Observe the real payout/landing instead,
      // and repeat physical steering if the engine reports a missed roll.
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeLessThan(.1);
        if (flyMode === 'toggle') await tapTouch(button('fly'));
        else await touch('touchStart', [await point(button('fly'), 1)]);
        await page.waitForFunction(
          () => Number(document.querySelector('#altitude')?.textContent) > 1.5,
          null, { polling: 'raf' },
        );
        if (flyMode === 'toggle') await tapTouch(button('fly'));
        else await touch('touchEnd', []);
        if (pad) {
          await touch('touchStart', [pad]);
          await touch('touchMove', [{...pad,x:pad.x-55}]);
          await waitForCoachText('First airborne steering press detected');
          await touch('touchMove', [{...pad,x:pad.x+55}]);
          // Keep the opposite steering input active until a simulation frame
          // samples it; ending it in the same CDP turn can erase the flick.
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          await touch('touchEnd', []);
        } else {
          await touch('touchStart', [left]);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          // Release LEFT and press RIGHT with no round trip between them: each awaited
          // CDP call can cost a slow software-WebGL frame, and the window is ~6 frames.
          await Promise.all([touch('touchEnd', []), touch('touchStart', [right])]);
          // The fixed-step game reads touch state on rAF, not at CDP dispatch.
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
          await touch('touchEnd', []);
        }
        await page.waitForFunction(() => {
          const step = document.querySelector('#tutorial-coach')?.getAttribute('data-step');
          const instruction = document.querySelector('#tutorial-instruction')?.textContent ?? '';
          return step === 'nitro' || (step === 'barrelRoll' && instruction.includes('Roll missed'));
        }, null, { polling: 'raf', timeout: ciTimeout(25000) });
        if (await coach(page).getAttribute('data-step') === 'nitro') break;
        if (attempt === 2) throw new Error('BARREL ROLL did not earn a real landing payout after three attempts');
      }
      // The actual engine must finish the roll and pay NITRO on a gentle
      // landing before the coach can advance to the next lesson.
      await step(page, 'nitro');
      await gesture(button('nitro'),'complete');
      await expect(page.locator('#tutorial-exit')).toBeHidden(); // completed practice leaves through Back to game
      const box=await page.locator('#tutorial-done').boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await page.locator('#tutorial-done').tap();
      await expect(coach(page)).toBeHidden();
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')).mode)).toBe(mode);
      if(custom) {
        await expect(button('throttle')).toHaveClass(/is-positioned/);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')).layout)).toEqual(prefs.layout);
      }
      await session.detach();
    });
  });
}
