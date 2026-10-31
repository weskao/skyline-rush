import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

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

// DRIFT needs >= 162 km/h on entry; the brake lesson's held key can slow the car, so wait for auto-throttle.
const driftReady = page => page.waitForFunction(() => Number(document.querySelector('#speed')?.textContent) >= 170, null, { polling: 'raf' });
// The coach progress bar reaches the next whole step once the drift lasts 1 s (the first payout tier).
const driftCharged = page => page.waitForFunction(() => Number(document.querySelector('#tutorial-progress')?.value) >= 5, null, { polling: 'raf' });
const keyboardDrift = async page => {
  await driftReady(page);
  await page.keyboard.down('a');
  await page.keyboard.down('s');
  await driftCharged(page);
  await page.keyboard.up('s');
  await page.keyboard.up('a');
  await step(page, 'fly');
};

const keyboardChain = async page => {
  await page.keyboard.down('Space');
  await page.keyboard.down('Shift');
  await expect(page.locator('#tutorial-instruction')).toContainText('Powered flight detected');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Space');
  await step(page, 'barrelRoll');
};
const keyboardRoll = async page => {
  await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeLessThan(.1);
  await page.keyboard.down('Space');
  // Release FLY at a safe height before the steering flick. The real engine
  // allows a roll while gliding; holding thrust through Playwright assertions
  // can lift the car too high for a soft landing on slow WebGL runners.
  await page.waitForFunction(
    () => Number(document.querySelector('#altitude')?.textContent) > 1.5,
    null, { polling: 'raf' },
  );
  await page.keyboard.up('Space');
  await page.keyboard.down('a');
  await page.waitForFunction(
    () => document.querySelector('#tutorial-instruction')?.textContent?.includes('First airborne steering press detected'),
    null, { polling: 'raf' },
  );
  await page.keyboard.up('a');
  await page.keyboard.down('d');
  await page.waitForFunction(
    () => document.querySelector('#tutorial-instruction')?.textContent?.includes('BARREL ROLL spinning'),
    null, { polling: 'raf' },
  );
  await page.keyboard.up('d');
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

test('keyboard practice requires real actions, completes all ten steps and preserves career', async ({ page }) => {
  await begin(page);
  const before = await career(page);
  await page.waitForTimeout(800);
  await step(page, 'throttle');
  await keyboardToNitro(page);
  await keyStep(page, 'e', 'complete');
  await expect(page.locator('#tutorial-retry')).toBeVisible();
  await expect(page.locator('#tutorial-done')).toHaveText('Back to game');
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
  await page.locator('#tutorial-pause').click();
  await page.keyboard.down('a');
  await page.waitForTimeout(650);
  await page.keyboard.up('a');
  await step(page, 'left');
  await page.locator('#tutorial-exit').click();
  await expect(page.locator('#race-status')).toHaveText('PAUSED');
  await expect(page.locator('#distance')).toHaveText(distance);
});

test('switching language updates the active and paused lesson immediately', async ({ page }) => {
  await begin(page);
  await page.locator('#tutorial-pause').click();
  await selectLocale(page,'zh-TW');
  await expect(page.locator('#tutorial-title')).toContainText('油門');
  await expect(page.locator('#tutorial-instruction')).toHaveText('練習已暫停。準備好後按繼續；暫停時的操作不會計入。');
  await expect(page.locator('#tutorial-pause')).toHaveText('繼續');
  await selectLocale(page,'en');
  await expect(page.locator('#tutorial-pause')).toHaveText('Resume');
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
      // Three bounded genuine retries need more than the generic single-attempt CI budget.
      test.setTimeout(ciTimeout(100000));
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
      const waitForCoachText = text => page.waitForFunction(
        text => document.querySelector('#tutorial-instruction')?.textContent?.includes(text),
        text, { polling: 'raf' },
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
      const fly = await point(button('fly'), 1), boost = await point(button('boost'), 2);
      // Software WebGL can advance several simulation frames between CDP commands.
      // Repeat a genuine powered takeoff after a missed landing; never credit a lesson
      // without the engine's chain event.
      for (let attempt = 0; attempt < 3; attempt++) {
        if (flyMode === 'toggle') {
          await tapTouch(button('fly'));
          const p = await point(button('boost'), 1);
          await touch('touchStart', [p]);
          await waitForCoachText('Powered flight detected');
          await touch('touchEnd', []);
          await tapTouch(button('fly'));
        } else {
          await touch('touchStart', [fly]);
          await touch('touchStart', [fly, boost]);
          // rAF polling releases thrust as soon as the engine confirms powered flight.
          await waitForCoachText('Powered flight detected');
          await touch('touchEnd', [fly]);
          await touch('touchEnd', []);
        }
        await page.waitForFunction(() => {
          const step = document.querySelector('#tutorial-coach')?.getAttribute('data-step');
          const instruction = document.querySelector('#tutorial-instruction')?.textContent ?? '';
          return step === 'barrelRoll' || (step === 'airChain' && instruction.includes('Chain missed'));
        }, null, { polling: 'raf', timeout: ciTimeout(25000) });
        if (await coach(page).getAttribute('data-step') === 'barrelRoll') break;
        if (attempt === 2) throw new Error('AIR→ROAD CHAIN did not earn a real landing after three attempts');
        await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeLessThan(.1);
      }
      await step(page, 'barrelRoll');
      const steerTarget = effectiveMode === 'slide' ? page.locator('.touch-pad') : button('left');
      const left = await point(steerTarget, 2);
      // Slide mode intentionally hides left/right buttons; never ask Playwright
      // for a bounding box of a hidden control.
      const right = effectiveMode === 'slide' ? null : await point(button('right'), 3);
      const pad = effectiveMode === 'slide' ? left : null;
      // The 0.3s engine flick window can elapse without a visible "spinning"
      // message on slower renderers. Observe the real payout/landing instead,
      // and repeat physical steering if the engine reports a missed roll.
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt) await expect.poll(async () => Number(await page.locator('#altitude').textContent())).toBeLessThan(.1);
        if (flyMode === 'toggle') await tapTouch(button('fly'));
        else await touch('touchStart', [fly]);
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
          await touch('touchEnd', []);
          await touch('touchStart', [right]);
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
      await step(page, 'nitro');
      await gesture(button('nitro'),'complete');
      const box=await page.locator('#tutorial-exit').boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await page.locator('#tutorial-exit').tap();
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
