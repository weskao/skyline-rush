import { test, expect } from './helpers/test.js';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';
import { decodePngRgba } from './helpers/png-rgba.js';

const IDS = Object.keys(UPCOMING_TRACKS);
const HOME_VIEWS = ['front','rear','left','right','orbit','drive'];
const SCREEN_SIZES = [{ width:1440, height:900 }, { width:390, height:844 }];

async function assertDrawn(page, label, attach = false) {
  const canvas = page.locator('#world');
  await expect(canvas).toBeVisible();
  const png = await canvas.screenshot({ animations:'disabled' });
  const { pixels } = decodePngRgba(png);
  let samples=0, sum=0, square=0;
  for(let i=0;i<pixels.length;i+=4*157) {
    const value=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
    samples++; sum+=value; square+=value*value;
  }
  const variance=Math.max(0,square/samples-(sum/samples)**2);
  expect(Math.sqrt(variance),label+' WebGL canvas must not be blank').toBeGreaterThan(4);
  if(attach) await test.info().attach(label.replace(/[^a-z0-9-]/gi,'-')+'-WebGL',{body:png,contentType:'image/png'});
}

for(const id of IDS) for(const viewport of SCREEN_SIZES) {
  test('Coming Soon '+id+' preserves Home/Garage/Studio WebGL and START gating '+viewport.width+'px',async({page})=>{
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.addInitScript(id=>{
      localStorage.setItem('skyline-rush-unlocked',JSON.stringify(['coast',id]));
      localStorage.setItem('skyline-rush-music','off');
      localStorage.setItem('skyline-rush-locale','en');
    },id);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error' && /WebGL|GL_INVALID|THREE\./.test(m.text()))errors.push(m.text());});
    await page.goto('/');
    if(await page.locator('#music-prompt').isVisible())await page.locator('#music-no').click();
    const card=page.locator('[data-upcoming-track="'+id+'"]');
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#start-button')).toBeDisabled();
    await expect(page.locator('#start-button span')).toHaveText('COMING SOON');
    await card.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(page.locator('body')).toHaveAttribute('data-phase','ready');
    await expect(page.locator('#start-button')).toBeDisabled();

    const airflow=page.locator('#airflow-toggle');
    for(const enabled of (viewport.width===1440?[false,true]:[true])) {
      if((await airflow.getAttribute('aria-pressed'))!==String(enabled))await airflow.click();
      await expect(airflow).toHaveAttribute('aria-pressed',String(enabled));
      for(const view of HOME_VIEWS) {
        await page.locator('#showcase-camera-next').click();
        await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view',view);
        await assertDrawn(page,id+' Home '+view+' '+enabled,view==='drive');
      }
    }

    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page','home');
    for(const view of HOME_VIEWS) {
      await page.locator('#showcase-camera-next').click();
      await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view',view);
      await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame','true');
      await assertDrawn(page,id+' Garage '+view,view==='drive');
    }
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page','studio');
    const angles=await page.locator('[data-garage-angle]').evaluateAll(buttons=>buttons.map(b=>b.dataset.garageAngle));
    // Studio owns five camera presets, while Home/Garage use the six-view shared dock.
    const chosen=viewport.width===1440?angles:angles.slice(0,2);
    for(const angle of chosen) {
      const button=page.locator('[data-garage-angle="'+angle+'"]');
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame','true');
      await assertDrawn(page,id+' Studio '+angle,angle===chosen.at(-1));
    }
    await page.locator('#garage-studio-back').click();
    await page.locator('#garage-close').click();
    await expect(card).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#start-button')).toBeDisabled();
    await expect(page.locator('body')).toHaveAttribute('data-phase','ready');
    expect(errors,id+' page/WebGL errors').toEqual([]);
  });
}
