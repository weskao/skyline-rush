// Showcase art direction: the player and a rival hover with animated jets,
// like the original Skyline Rush launch screen. Other rivals ground the shot.
// Keep the 50° FOV / three-quarter chase camera at the ORIGINAL home-screen
// distance and scale; use each 3D road's own tangent to avoid looking off-track.
export const HERO_PREVIEWS = Object.freeze({
  alpine: { distance: 1510, cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 5.1,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 1.4 },
  cosmic: { distance: 3940, cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 5.1,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 1.4 },
});
export const previewDistance = id => HERO_PREVIEWS[id]?.distance ?? 340;
export const isCuratedPreview = id => !!HERO_PREVIEWS[id];

export function previewPlayer(id,car,idleTime=0,reducedMotion=false,groundedShowcase=false) {
  if(!isCuratedPreview(id)) return {
    ...car, altitude:groundedShowcase ? 0
      : 1.6+(reducedMotion?0:Math.sin(idleTime*1.1)*.12),
    thrusting:!groundedShowcase,
  };
  return { ...car,
    altitude:1.6+(reducedMotion?0:Math.sin(idleTime*1.1)*.12),
    thrusting:!reducedMotion,
  };
}

export function previewRival(id,index,rival,idleTime=0,reducedMotion=false) {
  const info=HERO_PREVIEWS[id];
  if(!info) return {...rival,
    distance:340+35+index*28,altitude:index===0?5:0,
    thrusting:index===0,
  };
  // Put three rivals in the same readable shot on curving, elevated roads.
  // Rival 0 visibly flies with its nozzles on; the remaining two show lane depth.
  const fly=index===0;
  return { ...rival,
    distance:info.distance+12+index*15,
    x:([-4,0,4][index] ?? 0),
    altitude:fly ? 4.5+(reducedMotion?0:Math.sin(idleTime*1.25+.6)*.22) : 0,
    thrusting:fly&&!reducedMotion,
  };
}
