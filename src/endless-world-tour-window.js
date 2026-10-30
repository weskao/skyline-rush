// A fixed number of absolute chunks mirrors the visible Endless scenery;
// never cache every kilometre or retain objects from far behind the player.
export function createEndlessObstacleWindow(themes,plan,solid,metres){
  return (id,distance)=>{
    if(!themes[id])return [];
    const current=Math.floor(Math.max(0,distance)/metres),parts=[];
    for(let chunk=Math.max(0,current-2);chunk<=current+10;chunk++)
      for(const item of plan(id,chunk,false,true))parts.push(...solid(id,item));
    return parts.sort((a,b)=>a.from-b.from);
  };
}
