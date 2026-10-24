import { test, expect } from './helpers/test.js';

const config = (mode, extra = {}) => ({
  rulesVersion: 1, mode, rivals: 0, traffic: mode === 'time' ? 'off' : 'normal',
  difficulty: 'normal', items: true, ...extra,
});
const raceRun = (mode, time, extra = {}, extras = {}) => {
  const rules = JSON.stringify(config(mode,extra));
  return {date:'2026-10-23T11:00:00.000Z', mode, track:'coast', rules, time,
    position:1, score:mode==='stunt' ? 9000 : 300, ...extras};
};

test('10C RED: challenge History filters modes and shows rule-scoped PBs, eligible Ghosts and personal-only disclaimer',async({page})=>{
  const normal=config('time'), clean=config('time',{clean:true});
  const runs=[
    raceRun('custom',82,{rivals:0,traffic:'off'}),
    raceRun('time',61),raceRun('time',57),raceRun('time',60,{clean:true}),
    raceRun('stunt',120,{duration:120},{score:9000,maxCombo:4,airTime:12}),
  ];
  const timeGhost={time:50,samples:Array.from({length:501},(_,i)=>[i*10,2.5,0])};
  await page.addInitScript(data=>{
    localStorage.setItem('skyline-rush-mode-history-v1',JSON.stringify(data.runs));
    localStorage.setItem('skyline-rush-mode-ghosts-v1',JSON.stringify({
      ['coast:'+JSON.stringify(data.normal)]: data.ghost,
    }));
  }, {runs,normal,clean,ghost:timeGhost});
  await page.goto('/');
  await page.waitForTimeout(700);
  if(await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('.history-button').click();
  await expect(page.locator('#mode-history-filter')).toHaveValue('all');
  await expect(page.locator('#mode-history-runs > p')).toHaveCount(5);
  await expect(page.locator('#mode-history-notice')).toContainText('Personal challenge');
  await page.locator('#mode-history-filter').evaluate(select=>{
    select.value='time';select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('#mode-history-runs > p')).toHaveCount(3);
  await expect(page.locator('#mode-history-runs [data-mode="time"]')).toHaveCount(3);
  await expect(page.locator('#mode-history-runs [data-personal-best="true"]')).toHaveCount(2);
  await expect(page.locator('#mode-history-runs [data-ghost="true"]')).toHaveCount(2);
  await expect(page.locator('#mode-history-runs')).toContainText('PERSONAL BEST');
  await expect(page.locator('#mode-history-runs')).toContainText('GHOST READY');
  await page.screenshot({path:'test-results/race-mode-history-filter.png'});
  await page.locator('#mode-history-filter').evaluate(select=>{
    select.value='stunt';select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('#mode-history-runs > p')).toHaveCount(1);
  await expect(page.locator('#mode-history-runs [data-personal-best="true"]')).toHaveCount(1);
  await page.locator('#history-track').evaluate(select=>{
    select.value='neon';select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('#mode-history-empty')).toBeVisible();
});


test('10C: filtered challenge records stay within a narrow phone-portrait History dialog',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    localStorage.setItem('skyline-rush-mode-history-v1',JSON.stringify([{
      mode:'time',track:'coast',rules:JSON.stringify({
        rulesVersion:1,mode:'time',rivals:0,traffic:'off',difficulty:'normal',items:true,
      }),time:67,score:150,position:1,date:'2026-10-23T11:00:00.000Z',
    }]));
  });
  await page.goto('/');
  await page.waitForTimeout(700);
  if(await page.locator('#music-prompt').isVisible())await page.locator('#music-no').click();
  await page.locator('.history-button').click();
  await expect(page.locator('#mode-history-notice')).toBeVisible();
  await page.locator('#mode-history-filter').evaluate(select=>{
    select.value='time';select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('#mode-history-runs > p')).toHaveCount(1);
  const overflow=await page.locator('#history-screen').evaluate(el=>el.scrollWidth-el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.screenshot({path:'test-results/race-mode-history-phone.png'});
});
