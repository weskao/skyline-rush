import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

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

test('keyboard practice requires real actions, completes all eight steps and preserves career', async ({ page }) => {
  await begin(page);
  const before = await career(page);
  await page.waitForTimeout(800);
  await step(page, 'throttle');
  await keyStep(page, 'w', 'left');
  await keyStep(page, 'a', 'right');
  await keyStep(page, 'd', 'brake');
  await keyStep(page, 's', 'fly');
  await keyStep(page, 'Space', 'land');
  await step(page, 'boost');
  await keyStep(page, 'Shift', 'nitro');
  await keyStep(page, 'e', 'complete');
  await expect(page.locator('#tutorial-retry')).toBeVisible();
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
  test('guide entry completes practice even when storage is unavailable', async ({page}) => {
    await page.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    await page.goto('/');
    await page.locator('#guide-practice').click();
    await keyStep(page,'w','left');
    await keyStep(page,'a','right');
    await keyStep(page,'d','brake');
    await keyStep(page,'s','fly');
    await keyStep(page,'Space','land');
    await step(page,'boost');
    await keyStep(page,'Shift','nitro');
    await keyStep(page,'e','complete');
    await page.locator('#tutorial-done').click();
    await expect(page.locator('#start-button')).toBeFocused();
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
      const prefs = {version:1,mode,flyMode,...(custom?{layout:{throttle:{x:.15,y:.18}}}:{})};
      await page.addInitScript(prefs => localStorage.setItem('skyline-rush-controls',JSON.stringify(prefs)), prefs);
      await begin(page);
      await page.waitForTimeout(650);
      await step(page, 'throttle');
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
      const button = action => page.locator(`#touch-controls [data-control="${action}"]`);
      await gesture(button('throttle'),'left');
      await gesture(effectiveMode==='slide'?page.locator('.touch-pad'):button('left'),'right',effectiveMode==='slide'?-55:0);
      await gesture(effectiveMode==='slide'?page.locator('.touch-pad'):button('right'),'brake',effectiveMode==='slide'?55:0);
      await gesture(effectiveMode==='slide'?page.locator('.touch-pad'):button('brake'),'fly',0,effectiveMode==='slide'?55:0);
      await gesture(button('fly'),'land');
      if(flyMode==='toggle') await button('fly').tap();
      await step(page,'boost');
      await gesture(button('boost'),'nitro');
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
