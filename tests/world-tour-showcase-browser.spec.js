import { test,expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { openWorldTour,homePreview,previewLandmark,airflowAngles,landmarkAt } from './helpers/showcase-world-tour.js';

// CI: one page boot per family of maps (about 11 s each on software WebGL) instead of one per map; every map keeps its own
// test.step with the assertions it had as a test of its own. Values read by the old fresh-boot tests match the folded ones to
// < 1e-3 (compared once; see tests/helpers/showcase-world-tour.js for the shared probes).
const MAPS=['taipei','tokyo','alpine','coastal','cosmic'];

test('every World Tour home preview is a full, dynamic four-car airborne showcase with matching scale',async({page},info)=>{
  test.setTimeout(ciTimeout(100000));
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await openWorldTour(page);
  for(const id of MAPS) await test.step(id,async()=>{
    const result=await homePreview(page,id);
    expect(result.first,`${id} actors`).toHaveLength(4);
    expect(result.first.every(car=>car.visible),`${id} all cars visible`).toBe(true);
    expect(result.first.filter(car=>Math.abs(car.x)<1 && Math.abs(car.y)<1 &&
      car.z>-1 && car.z<1).length,`${id} cars in frustum`).toBeGreaterThanOrEqual(3);
    expect(result.first[0].jetsVisible,`${id} player jets`).toBe(true);
    expect(result.first[1].jetsVisible,`${id} rival jets`).toBe(true);
    // The player is the original vehicle model: same three-quarter home
    // camera distance => comparable projected on-screen vehicle width.
    const ratio=result.first[0].screenWidth/result.baseline.screenWidth;
    expect(ratio,`${id}: player car should be about the same size as other maps`).toBeGreaterThan(.65);
    expect(ratio,`${id}: player car should not dominate the preview`).toBeLessThan(1.5);
    expect(result.later[0].screenWidth,`${id} later screen width`).toBeGreaterThan(0);
    await page.screenshot({path:info.outputPath(`world-tour-${id}-flying-showcase.png`)});
  });
  expect(errors).toEqual([]);
});

const LANDMARKS=[['taipei','office'],['tokyo','tower'],['alpine','mountain'],['coastal','lighthouse'],['cosmic','cosmic-gate']];
for(const [layout,viewport] of [['landscape',{width:640,height:360}],['portrait',{width:390,height:844}]]) {
  test(`every World Tour ${layout} home preview frames its signature landmark`,async({page},info)=>{
    test.setTimeout(ciTimeout(100000));
    await openWorldTour(page,viewport);
    for(const [id,kind] of LANDMARKS) await test.step(id,async()=>{
      const landmark=await previewLandmark(page,id,kind);
      expect(landmark.visible&&landmark.inFront,`${id} ${layout} visible in front`).toBe(true);
      expect(landmark.maxY,`${id} ${layout} landmark top stays in frame`).toBeLessThan(.98);
      // Landscape home UI covers the left half: the landmark sits right of it.
      if(layout==='landscape'){
        expect(landmark.minX,`${id} landscape right of the home UI`).toBeGreaterThan(.04);
        expect(landmark.maxX,`${id} landscape inside the frame`).toBeLessThan(.98);
      }else expect(Math.abs((landmark.minX+landmark.maxX)/2),`${id} portrait centred`).toBeLessThan(1);
      expect(landmark.unobstructed,`${id} ${layout}: roadside props must not hide the landmark`).toBeGreaterThan(.6);
      await page.screenshot({path:info.outputPath(`world-tour-${id}-${layout}-landmark-showcase.png`)});
    });
  });
}

// Each World Tour road uses a curved/elevated local tangent. Probe the actual
// WebGL vehicle, not just the shared camera helper, when AIRFLOW is enabled.
test('every World Tour map: AIRFLOW grounds the hero and keeps all six preview camera angles usable',async({page})=>{
  test.setTimeout(ciTimeout(60000));
  await openWorldTour(page);
  for(const id of MAPS) await test.step(id,async()=>{
    const result=await airflowAngles(page,id);
    expect(result.flying.jetsVisible,`${id} flying jets`).toBe(true);
    expect(result.flying.worldY-result.grounded.worldY,`${id}: AIRFLOW must lower the car to the road surface`).toBeGreaterThan(.8);
    expect(result.grounded.jetsVisible,`${id} grounded jets`).toBe(false);
    expect(result.grounded.bodyClearShare,`${id}: unobstructed grounded showroom vehicle`).toBeGreaterThanOrEqual(.75);
    for(const [view,actor] of Object.entries(result.angles)) {
      expect(actor.bodyClearShare,`${id}/${view}: vehicle body must not be blocked or offscreen`).toBeGreaterThanOrEqual(.75);
      expect(actor.visible,`${id}/${view}: hero still visible`).toBe(true);
      expect(actor.jetsVisible,`${id}/${view}: no flying jets in AIRFLOW`).toBe(false);
      expect(actor.screenWidth,`${id}/${view}: valid projected car`).toBeGreaterThan(0);
      expect(Number.isFinite(actor.x)&&Number.isFinite(actor.y),`${id}/${view}: valid camera projection`).toBe(true);
    }
  });
});

// In-race approach: the chase camera keeps the signature landmark in view and
// clear of roadside props on its kerb (the plaza), not just on the home screen.
// Two pages: five maps in one outran the folded-test budget (about 150 CI seconds).
const APPROACHES=[['taipei','office',[1250,1400,1550]],['tokyo','tower',[2980,3080,3180]],
  ['alpine','mountain',[5750,5900]],['coastal','lighthouse',[850,950]],['cosmic','cosmic-gate',[3820,3920]]];
for(const group of [APPROACHES.slice(0,2),APPROACHES.slice(2)]) {
  test(`racing toward the landmark keeps it in view and unobstructed: ${group.map(([id])=>id).join(', ')}`,async({page})=>{
    test.setTimeout(ciTimeout(100000));
    await openWorldTour(page,{width:1280,height:720});
    for(const [id,kind,stops] of group) await test.step(id,async()=>{
      for(const at of stops){
        const landmark=await landmarkAt(page,id,kind,at);
        expect(landmark.visible&&landmark.inFront,`${id} @${at}m`).toBe(true);
        expect(landmark.minX,`${id} @${at}m on screen`).toBeLessThan(1);
        expect(landmark.maxX,`${id} @${at}m on screen`).toBeGreaterThan(-1);
        expect(landmark.unobstructed,`${id} @${at}m unobstructed`).toBeGreaterThan(.6);
      }
    });
  });
}

// The road ends at the arch, so rivals past it must leave instead of parking there.
test('rivals that crossed the finish do not stay parked at the arch',async({page})=>{
  await openWorldTour(page);
  for(const id of ['taipei','tokyo','alpine','coastal','cosmic','spiral']){
    const actors=await page.evaluate(id=>window.worldTourFinishProbe(id),id);
    expect(actors[0].visible,`${id} player`).toBe(true);
    expect(actors.slice(1).filter(a=>a.visible).map(a=>a.name),`${id} rivals past the finish`).toEqual([]);
  }
});
