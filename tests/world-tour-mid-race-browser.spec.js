import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/race-tracks.ts';
for(const id of ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']){
  const {length, sections} = RACE_TRACKS[id];
  const {from, to} = sections.find(s => s.type === 'boost-tunnel');
  test(`${id}: three-dimensional driving world remains live before, during, and after the tunnel`,async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tour-mid-race.html');
    await page.waitForFunction(()=>window.worldTourReady===true);
    const positions=[0,length*.25,from-40,from+6,(from+to)/2,to+5,to+200,length*.94];
    let programs;
    for(const distance of positions){
      const response=await page.evaluate(([name,d])=>window.worldTourProbe(name,d),[id,distance]);
      expect(response.id).toBe(id);
      expect(response.distance).toBeGreaterThanOrEqual(0);
      await page.waitForTimeout(90);
      // The track's first frame warms up every shader; entering or leaving the tunnel must not compile more
      // (a changing light count or a first-drawn material stalls WebKit and flashes black on iPhone).
      programs??=await page.evaluate(()=>window.worldTourPrograms());
      expect(await page.evaluate(()=>window.worldTourPrograms())).toBe(programs);
    }
    // Long-running RAF render checks the actual failure path around each
    // energy tunnel instead of taking only one isolated mid-race screenshot.
    const sweep=await page.evaluate(([name,from,to])=>
      window.worldTourSweep(name,from-180,to+180,180),[id,from,to]);
    expect(sweep.arrivedAt).toBe(to+180);
    expect(errors).toEqual([]);
    await page.screenshot({path:info.outputPath(`world-tour-${id}-mid-race.png`),animations:'disabled'});
  });
}

test('all seven reprofiled roads render at the sprint finish and beyond it in streaming modes', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/fixtures/world-tour-mid-race.html');
  await page.waitForFunction(() => window.worldTourReady === true);
  for (const id of ['aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']) {
    const { length } = RACE_TRACKS[id];
    for (const [mode, distance] of [['classic', length - 30], ['endless', length + 250], ['elimination', 2 * length + 250]]) {
      expect(await page.evaluate(([id, distance, mode]) => window.worldTourProbe(id, distance, mode),
        [id, distance, mode])).toEqual({ id, distance });
    }
  }
  expect(await page.evaluate(() => window.worldTourPrograms())).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
