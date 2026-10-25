import { test,expect } from './helpers/test.js';

for(const id of ['taipei','tokyo','alpine','coastal','cosmic']) {
  test(`${id}: home preview is a full, dynamic four-car airborne showcase with matching scale`,async({page},info)=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    const result=await page.evaluate(async id=>{
      // Compare to the real original course preview rendered by exactly the
      // same world, geometry and camera. Then switch to a World Tour course.
      const baseline=window.worldTourPreviewProbe('coast').actors[0];
      await new Promise(requestAnimationFrame);
      const first=window.worldTourPreviewProbe(id).actors;
      await new Promise(resolve=>setTimeout(resolve,200));
      const later=window.worldTourPreviewProbe(id).actors;
      return {baseline,first,later};
    },id);
    expect(result.first).toHaveLength(4);
    expect(result.first.every(car=>car.visible)).toBe(true);
    expect(result.first.filter(car=>Math.abs(car.x)<1 && Math.abs(car.y)<1 &&
      car.z>-1 && car.z<1).length).toBeGreaterThanOrEqual(3);
    expect(result.first[0].jetsVisible).toBe(true);
    expect(result.first[1].jetsVisible).toBe(true);
    // The player is the original vehicle model: same three-quarter home
    // camera distance => comparable projected on-screen vehicle width.
    const ratio=result.first[0].screenWidth/result.baseline.screenWidth;
    expect(ratio,'player car should be about the same size as other maps').toBeGreaterThan(.65);
    expect(ratio,'player car should not dominate the preview').toBeLessThan(1.5);
    expect(result.later[0].screenWidth).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath(`world-tour-${id}-flying-showcase.png`)});
  });
}

for(const [id,kind] of [['taipei','office'],['tokyo','tower'],['alpine','mountain'],['coastal','lighthouse'],['cosmic','cosmic-gate']]) {
  for(const [layout,viewport] of [['landscape',{width:640,height:360}],['portrait',{width:390,height:844}]]) {
    test(`${id}: ${layout} home preview frames its signature landmark`,async({page},info)=>{
      await page.setViewportSize(viewport);
      await page.goto('/tests/fixtures/world-tour-mid-race.html');
      await page.waitForFunction(()=>window.worldTourReady===true);
      const landmark=await page.evaluate(([id,kind])=>{
        let probe;for(let i=0;i<3;i++)probe=window.worldTourPreviewProbe(id);
        return probe.landmarks.find(entry=>entry.kind===kind);
      },[id,kind]);
      expect(landmark.visible&&landmark.inFront).toBe(true);
      expect(landmark.maxY,'landmark top stays in frame').toBeLessThan(.98);
      // Landscape home UI covers the left half: the landmark sits right of it.
      if(layout==='landscape'){
        expect(landmark.minX).toBeGreaterThan(.04);
        expect(landmark.maxX).toBeLessThan(.98);
      }else expect(Math.abs((landmark.minX+landmark.maxX)/2)).toBeLessThan(1);
      expect(landmark.unobstructed,'roadside props must not hide the landmark').toBeGreaterThan(.6);
      await page.screenshot({path:info.outputPath(`world-tour-${id}-${layout}-landmark-showcase.png`)});
    });
  }
}

// Each World Tour road uses a curved/elevated local tangent. Probe the actual
// WebGL vehicle, not just the shared camera helper, when AIRFLOW is enabled.
for (const id of ['taipei','tokyo','alpine','coastal','cosmic']) {
  test(`${id}: AIRFLOW grounds the hero and keeps all six preview camera angles usable`,async({page})=>{
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    const result=await page.evaluate(id=>{
      const flying=window.worldTourPreviewProbe(id,{airflow:false,view:'drive'}).actors[0];
      const grounded=window.worldTourPreviewProbe(id,{airflow:true,view:'drive'},24).actors[0];
      const angles={};
      for(const view of ['drive','front','rear','left','right','orbit']) {
        angles[view]=window.worldTourPreviewProbe(id,{airflow:true,view},18).actors[0];
      }
      return {flying,grounded,angles};
    },id);
    expect(result.flying.jetsVisible).toBe(true);
    expect(result.flying.worldY-result.grounded.worldY,'AIRFLOW must lower the car to the road surface').toBeGreaterThan(.8);
    expect(result.grounded.jetsVisible).toBe(false);
    expect(result.grounded.bodyClearShare,`${id}: unobstructed grounded showroom vehicle`).toBeGreaterThanOrEqual(.75);
    for(const [view,actor] of Object.entries(result.angles)) {
      expect(actor.bodyClearShare,`${id}/${view}: vehicle body must not be blocked or offscreen`).toBeGreaterThanOrEqual(.75);
      expect(actor.visible,`${id}/${view}: hero still visible`).toBe(true);
      expect(actor.jetsVisible,`${id}/${view}: no flying jets in AIRFLOW`).toBe(false);
      expect(actor.screenWidth,`${id}/${view}: valid projected car`).toBeGreaterThan(0);
      expect(Number.isFinite(actor.x)&&Number.isFinite(actor.y),`${id}/${view}: valid camera projection`).toBe(true);
    }
  });
}

// Follow the actual image visibility for both presentation modes: a car can
// have a positive projected width while scenery hides most of its body.
for (const id of ['taipei','tokyo','alpine','coastal','cosmic']) {
  for (const airflow of [false,true]) {
    test(`${id}: ${airflow?'AIRFLOW':'hovering'} showcase is not occluded across six camera angles`,async({page})=>{
      await page.goto('/tests/fixtures/world-tour-mid-race.html');
      await page.waitForFunction(()=>window.worldTourReady===true);
      const actors=await page.evaluate(({id,airflow})=>{
        const out={};
        for (const view of ['drive','front','rear','left','right','orbit']) {
          out[view]=window.worldTourPreviewProbe(id,{airflow,view},18).actors[0];
        }
        return out;
      },{id,airflow});
      for(const [view,actor] of Object.entries(actors)) {
        expect(actor.bodyClearShare,`${id}/${view}/AIRFLOW=${airflow}: avoid scenery + viewport clipping`).toBeGreaterThanOrEqual(.75);
        expect(actor.screenWidth,`${id}/${view}: full car must have usable size`).toBeGreaterThan(.035);
      }
    });
  }
}

// In-race approach: the chase camera keeps the signature landmark in view and
// clear of roadside props on its kerb (the plaza), not just on the home screen.
for(const [id,kind,stops] of [['taipei','office',[1250,1400,1550]],['tokyo','tower',[2980,3080,3180]],
  ['alpine','mountain',[5750,5900]],['coastal','lighthouse',[850,950]],['cosmic','cosmic-gate',[3820,3920]]]) {
  test(`${id}: racing toward the ${kind} keeps it in view and unobstructed`,async({page})=>{
    await page.setViewportSize({width:1280,height:720});
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    for(const at of stops){
      const landmark=await page.evaluate(async([id,kind,at])=>{
        for(let i=0;i<40;i++){await new Promise(requestAnimationFrame);window.worldTourProbe(id,at);}
        return window.worldTourLandmarks().find(entry=>entry.kind===kind);
      },[id,kind,at]);
      expect(landmark.visible&&landmark.inFront,`${id} @${at}m`).toBe(true);
      expect(landmark.minX,`${id} @${at}m on screen`).toBeLessThan(1);
      expect(landmark.maxX,`${id} @${at}m on screen`).toBeGreaterThan(-1);
      expect(landmark.unobstructed,`${id} @${at}m unobstructed`).toBeGreaterThan(.6);
    }
  });
}

// The road ends at the arch, so rivals past it must leave instead of parking there.
test('rivals that crossed the finish do not stay parked at the arch',async({page})=>{
  await page.goto('/tests/fixtures/world-tour-mid-race.html');
  await page.waitForFunction(()=>window.worldTourReady===true);
  for(const id of ['taipei','tokyo','alpine','coastal','cosmic','spiral']){
    const actors=await page.evaluate(id=>window.worldTourFinishProbe(id),id);
    expect(actors[0].visible,`${id} player`).toBe(true);
    expect(actors.slice(1).filter(a=>a.visible).map(a=>a.name),`${id} rivals past the finish`).toEqual([]);
  }
});

test('World Tour selection keeps the actual 3D showroom animated, not a static card',async({page},info)=>{
  await page.addInitScript(()=>{
    localStorage.setItem('skyline-rush-unlocked',JSON.stringify(['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']));
    localStorage.setItem('skyline-rush-music','off');
  });
  await page.goto('/');
  for(const id of ['taipei','tokyo','alpine','coastal','cosmic']) {
    await page.locator(`[data-track="${id}"]`).click();
    await page.waitForTimeout(650);
    await expect(page.locator('#start-button')).toBeVisible();
    await page.screenshot({path:info.outputPath(`world-tour-${id}-homepage-showcase.png`)});
  }
});


// Regression: the showroom needs the *whole* car, not just its center and
// a few roof points, inside the desktop viewport (including the wheels).
for (const id of ['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']) {
  for (const viewport of [{width:1777,height:863},{width:1440,height:900},{width:390,height:844}]) {
    test(`${id}: full showcase car stays framed at ${viewport.width}x${viewport.height}`,async({page})=>{
      await page.setViewportSize(viewport);
      await page.goto('/tests/fixtures/world-tour-mid-race.html');
      await page.waitForFunction(()=>window.worldTourReady===true);
      const result=await page.evaluate(id=>{
        const frames={};
        for(const airflow of [false,true]) {
          const probe=window.worldTourPreviewProbe(id,{airflow,view:'drive'},90);
          frames[airflow?'grounded':'hovering']=probe.actors[0].carBounds;
        }
        return frames;
      },id);
      for(const [mode,bounds] of Object.entries(result)) {
        expect(bounds,`${id}/${mode}: projected full car bounds are measured`).toBeTruthy();
        for(const side of ['minX','maxX','minY','maxY']) {
          expect(Number.isFinite(bounds[side]),`${id}/${mode}/${side}`).toBe(true);
        }
        expect(bounds.minX,`${id}/${mode}: left edge`).toBeGreaterThan(-.94);
        expect(bounds.maxX,`${id}/${mode}: right edge`).toBeLessThan(.94);
        expect(bounds.minY,`${id}/${mode}: bottom edge`).toBeGreaterThan(-.90);
        expect(bounds.maxY,`${id}/${mode}: top edge`).toBeLessThan(.90);
      }
    });
  }
}
