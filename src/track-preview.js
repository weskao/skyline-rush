// Showcase art direction: the player and a rival hover with animated jets,
// like the original Skyline Rush launch screen. Other rivals ground the shot.
// Keep the 50° FOV / three-quarter chase camera at the ORIGINAL home-screen
// distance and scale; cameraHeight is the offset ABOVE the hovering car. Use each 3D road's own tangent to avoid looking off-track.
export const HERO_PREVIEWS = Object.freeze({
  // Signature-landmark shots: the same chase camera pitched up (lookHeight)
  // to frame the landmark ahead, right of the home UI panel.
  taipei: { distance: 1250, landmark: 'office', cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 3.5,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 5 },
  tokyo: { distance: 3075, landmark: 'tower', cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 3.5,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 8 },
  alpine: { distance: 5660, landmark: 'mountain', cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 3.5,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 9 },
  coastal: { distance: 800, landmark: 'lighthouse', cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 3.5,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 6 },
  cosmic: { distance: 3700, landmark: 'cosmic-gate', cameraSide: 8.3, cameraBack: 11.8, cameraHeight: 3.5,
    lookSide: -1.4, lookAhead: 3.5, lookHeight: 5 },
});
export const previewDistance = id => HERO_PREVIEWS[id]?.distance ?? 340;
export const isCuratedPreview = id => !!HERO_PREVIEWS[id];

export function previewPlayer(id,car,idleTime=0,reducedMotion=false,groundedShowcase=false) {
  // Curated World Tour views differ in landmark framing, never in AIRFLOW pose:
  // every existing or future track rests on its own road when AIRFLOW is on.
  return { ...car,
    altitude:groundedShowcase ? 0
      : 1.6+(reducedMotion?0:Math.sin(idleTime*1.1)*.12),
    thrusting:!groundedShowcase&&!reducedMotion,
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

/** Shared home-camera poses: only landmark art direction varies by track. */
export function showcaseCameraPose(id, view = 'drive', time = 0, portrait = false) {
  const info = HERO_PREVIEWS[id];
  const drive = {
    cameraSide: portrait ? 7.8 : (info?.cameraSide ?? 8.3),
    cameraBack: portrait ? 13.8 : (info?.cameraBack ?? 11.8),
    cameraHeight: portrait ? 4.3 : (info?.cameraHeight ?? 3.5),
    lookSide: portrait ? 1 : (info?.lookSide ?? -1.4),
    lookAhead: info?.lookAhead ?? 3.5,
    lookHeight: info?.lookHeight ?? 1.6,
  };
  if (view === 'drive') return drive;
  const angle = view === 'orbit' ? time * .18 : {front:Math.PI,rear:0,left:-Math.PI/2,right:Math.PI/2}[view];
  if (angle === undefined) return drive;
  return { cameraSide:Math.sin(angle)*9, cameraBack:Math.cos(angle)*9,
    cameraHeight:3.6, lookSide:0, lookAhead:0, lookHeight:2.4 };
}
