import { test } from './helpers/gameplay-browser.js';
import { expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

const IDS=['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic'];
const TOUR=new Set(['taipei','tokyo','alpine','coastal','cosmic']);

for(const id of IDS){
  test(`Endless ${id}: unlocked route, true continuation, bounded graphics and original scenery style`,
    async({gameplayPage:page},info)=>{
      test.setTimeout(ciTimeout(120000));
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.evaluate(ids=>localStorage.setItem('skyline-rush-unlocked',JSON.stringify(ids)),IDS);
      await page.reload();
      if(await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await page.locator('button[data-race-mode="endless"]').click();
      const choice=page.locator(`[data-track="${id}"]`);
      await expect(choice).toBeEnabled();
      await choice.click();
      await expect(choice).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('#track-length')).toContainText('ENDLESS');
      await expect(page.locator('#start-button')).toBeEnabled();
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase','racing',{timeout:ciTimeout(15000)});
      const observations=[];
      for(const distance of [25000,50000,85000]){
        await page.evaluate(d=>{
          const car=window.gameplay.race.player;
          Object.assign(car,{distance:d,speed:60,x:0,altitude:0,cooldown:3});
        },distance);
        await expect.poll(()=>page.evaluate(()=>window.gameplay.race.player.distance)).toBeGreaterThan(distance);
        await page.waitForTimeout(140);
        observations.push(await page.evaluate(()=>{
          const race=window.gameplay.race,{scene,renderer}=window.gameScene;
          let nodes=0,chunkCount=0,visibleScenery=0;
          scene.traverse(obj=>{
            nodes++;
            if(obj.name?.includes('chunk-') && obj.name?.includes('world-tour-'))chunkCount++;
            if(obj.visible && obj.isMesh && obj.parent?.name?.includes('world-tour-'))visibleScenery++;
          });
          const trafficRendered=scene.children.filter(obj=>obj.visible &&
            Number.isFinite(obj.userData?.roadDistance) &&
            obj.userData.roadDistance>race.player.distance+5 &&
            obj.userData.roadDistance<race.player.distance+900).length;
          return {nodes,chunkCount,visibleScenery,trafficRendered,geometries:renderer.info.memory.geometries,
            textures:renderer.info.memory.textures,programs:renderer.info.programs?.length,
            props:race.props?.length||0,traffic:race.traffic.length,pickups:race.pickups.length,rings:race.rings.length,
            phase:race.phase,trackId:race.trackId};
        }));
      }
      expect(observations.every(o=>o.phase==='racing'&&o.trackId===id)).toBe(true);
      expect(observations.every(o=>o.traffic<=40&&o.pickups<=20&&o.rings<=15)).toBe(true);
      expect(observations.every(o=>o.trafficRendered>0),
        `${id} must draw actual NPC cars past the finite sprint finish`).toBe(true);
      if(TOUR.has(id)){
        expect(observations.every(o=>o.chunkCount>0&&o.chunkCount<=15),`${id} scenes must keep streaming beyond finish`).toBe(true);
        expect(observations.every(o=>o.props<150),`${id} solid props must be bounded`).toBe(true);
      }
      const first=observations[1],last=observations[2];
      // Different 120 m scenery windows contain different numbers of authored
      // meshes. Node counts can fluctuate slightly even when old chunks are
      // evicted; GPU resources must still stay within the strict fixed budget.
      await page.screenshot({path:`test-results/race-mode-endless-${id}-85km.png`,animations:'disabled'});
      expect(last.nodes,`${id} scene nodes must remain bounded despite scenery variation`)
        .toBeLessThanOrEqual(Math.ceil(first.nodes*1.03));
      for(const field of ['geometries','textures','programs'])
        expect(last[field],`${id} ${field} must remain bounded as distance grows`).toBeLessThanOrEqual(first[field]+12);
      expect(errors).toEqual([]);
    });
}
