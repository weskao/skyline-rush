import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseApprovals, parseEvidence } from './gates.mjs';
// Course ids whose race tests are named after the race module (develop renamed frostbite-canyon-race* to frostbite-race*).
const TEST_STEM = { 'frostbite-canyon': 'frostbite' };

export async function collectState(root = process.cwd()) {
  root = resolve(root);
  const moduleAt = path => import(pathToFileURL(join(root,path)).href);
  const [upcoming, tracks, scenes, production, development] = await Promise.all([
    moduleAt('src/upcoming-tracks.ts'), moduleAt('src/race-tracks.ts'),
    moduleAt('src/upcoming-scenes/index.ts'), moduleAt('src/access/production.ts'),
    moduleAt('src/access/dev-unlocked.ts'),
  ]);
  const optionalFile = async path => existsSync(join(root,path)) ? readFile(join(root,path)) : null;
  const todo = (await optionalFile('TODO.md'))?.toString('utf8') ?? '';
  const approvals = parseApprovals(todo);
  const upcomingIds = Object.keys(upcoming.UPCOMING_TRACKS);
  const raceTrackIds = Object.keys(tracks.RACE_TRACKS);
  const evidenceById = new Map(), courses=[];
  const storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try {
    for(const id of upcomingIds) {
      const meta = upcoming.UPCOMING_TRACKS[id];
      const evidenceText = (await optionalFile('docs/track-lifecycle/'+id+'.md'))?.toString('utf8');
      const evidence = evidenceText == null ? null : parseEvidence(evidenceText);
      if(evidence) evidenceById.set(id,evidence);
      const staleUnlocks = new Set([...raceTrackIds,id]);
      Object.defineProperty(globalThis,'localStorage',{
        configurable:true,
        value:{getItem:key => key==='skyline-rush-unlocked' ? JSON.stringify([...staleUnlocks]) : null,
          setItem(){},removeItem(){}}
      });
      const staleAvailable = production.availableTracks().includes(id);
      const runtime = tracks.raceTrack(id);
      let classicOnly = false;
      if (runtime) {
        let classicAccepted = false, otherRejected = false;
        try { tracks.assertTrackMode(id,'classic'); classicAccepted=true; } catch {}
        try { tracks.assertTrackMode(id,'custom'); } catch { otherRejected=true; }
        classicOnly = classicAccepted && otherRejected && !raceTrackIds.includes(id);
      }
      courses.push({
        id,stage:upcoming.upcomingReadiness(id),names:meta.names,
        teaserJpeg:await optionalFile('public/'+meta.image),
        routeSvgExists:existsSync(join(root,'public/'+meta.route)),
        hasEnvironment:typeof scenes.UPCOMING_ENVIRONMENTS[id]==='function',
        productionEnterable:production.isUpcomingEnterable(id),
        productionAvailableWithStaleUnlock:staleAvailable,
        homeStatuses:[upcoming.homeTrackStatus(id,new Set()),upcoming.homeTrackStatus(id,staleUnlocks)],
        raceTrackDefined:!!runtime,classicOnly,
        unitTestExists:existsSync(join(root,'tests/'+(TEST_STEM[id]??id)+'-race.test.js')),
        browserSpecExists:existsSync(join(root,'tests/'+(TEST_STEM[id]??id)+'-race-browser.spec.js')),
        developmentEnterable:development.isUpcomingEnterable(id),evidence,
      });
    }
  } finally {
    if(storageDescriptor) Object.defineProperty(globalThis,'localStorage',storageDescriptor);
    else delete globalThis.localStorage;
  }
  return {courses,raceTrackIds,upcomingIds,evidenceById,approvals};
}
