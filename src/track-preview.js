// Separate scene compositions for the home screen; keep the *same* game
// cars, rivals, roadside landmarks and road renderer as in an active race.
export const HERO_PREVIEWS=Object.freeze({
  alpine:{distance:1240,rivalSpacing:15,cameraSide:8.7,cameraBack:20,cameraHeight:6.4},
  cosmic:{distance:1580,rivalSpacing:15,cameraSide:9.6,cameraBack:22,cameraHeight:6.8},
});
export const previewDistance=trackId=>HERO_PREVIEWS[trackId]?.distance??340;
export function previewRival(trackId,index,rival){
  const info=HERO_PREVIEWS[trackId];
  return {
    ...rival,
    distance: info?info.distance+12+index*info.rivalSpacing:340+35+index*28,
    x:info?[-4,0,4][index]??0:rival.x,
    altitude:info?0.18:index===0?5:0,
    thrusting:!info&&index===0,
  };
}
