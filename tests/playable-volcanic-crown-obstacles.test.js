import test from 'node:test';
import * as hazards from '../src/courses/volcanic-crown-obstacles.ts';
import assert from 'node:assert/strict';
import { sampleVolcanicRoute } from '../src/courses/volcanic-crown.ts';
import {
  VOLCANIC_OBSTACLES, volcanicObstaclePose, volcanicObstacleContact,
  volcanicAIChooseLateral, validateVolcanicObstacles,
} from '../src/courses/volcanic-crown-obstacles.ts';

test('every solid obstacle has a valid, visible-sized authored contact on its route',()=>{
  assert.equal(validateVolcanicObstacles(),true);
  for(const obstacle of VOLCANIC_OBSTACLES){
    const pose=volcanicObstaclePose(obstacle,5);
    assert.ok(pose.point.every(Number.isFinite));
    assert.ok(obstacle.radius>=3);
    if(obstacle.kind!=='rockfall'){
      assert.equal(volcanicObstacleContact(obstacle.edgeId,obstacle.s,obstacle.lateral,0,5)?.id,obstacle.id);
      assert.equal(volcanicObstacleContact(obstacle.edgeId,obstacle.s,obstacle.lateral,60,5),null);
    }
  }
});
test('falling rock has deterministic warned, falling, impact and cleared phases',()=>{
  const rock=VOLCANIC_OBSTACLES.find(o=>o.kind==='rockfall');
  assert.equal(volcanicObstaclePose(rock,1).warning,true);
  assert.equal(volcanicObstaclePose(rock,1).active,false);
  assert.ok(volcanicObstaclePose(rock,3.5).point[1]>volcanicObstaclePose(rock,5.5).point[1]);
  assert.equal(volcanicObstacleContact(rock.edgeId,rock.s,rock.lateral,0,1),null);
  assert.equal(volcanicObstacleContact(rock.edgeId,rock.s,rock.lateral,0,5.5)?.id,rock.id);
  assert.equal(volcanicObstaclePose(rock,9).active,false);
  assert.deepEqual(volcanicObstaclePose(rock,5.5),volcanicObstaclePose(rock,17.5));
});
test('steam vents signal before physically active eruption and stay deterministic',()=>{
  const vent=VOLCANIC_OBSTACLES.find(o=>o.kind==='vent');
  assert.equal(volcanicObstaclePose(vent,1).warning,true);
  assert.equal(volcanicObstaclePose(vent,1).active,false);
  assert.equal(volcanicObstacleContact(vent.edgeId,vent.s,vent.lateral,0,1),null);
  assert.equal(volcanicObstacleContact(vent.edgeId,vent.s,vent.lateral,0,5)?.id,vent.id);
  assert.equal(volcanicObstaclePose(vent,8).active,false);
  assert.deepEqual(volcanicObstaclePose(vent,5),volcanicObstaclePose(vent,17));
});
test('AI picks a lane that avoids upcoming physical rock/fissure, never a hidden collider',()=>{
  for(const rock of VOLCANIC_OBSTACLES.filter(o=>o.kind==='rockfall')){
    const lane=volcanicAIChooseLateral(rock.edgeId,rock.s-42,rock.lateral,5.5);
    assert.ok(Math.abs(lane-rock.lateral)>rock.radius+2.3);
    assert.ok(Math.abs(lane)<16);
  }
  assert.throws(()=>volcanicAIChooseLateral('invalid',0,0,0),/Unknown/);
});
test('physically nearby other branch is not an obstacle hit; sampling stable at 30/60/120 Hz',()=>{
  const obstacle=VOLCANIC_OBSTACLES.find(o=>o.kind==='fissure');
  assert.equal(volcanicObstacleContact('rift-flight',obstacle.s,obstacle.lateral,0,5),null);
  for(const fps of [30,60,120]){
    let last=null;
    for(let i=0;i<=fps*6;i++){
      const time=i/fps;
      const pose=volcanicObstaclePose(obstacle,time);
      assert.ok(pose.point.every(Number.isFinite));
      last=pose;
    }
    assert.deepEqual(last,volcanicObstaclePose(obstacle,6));
  }
  assert.ok(sampleVolcanicRoute('ground-6',600).point.every(Number.isFinite));
});

test('surface vents use local road clearance on rising slopes, not world Y',()=>{
  const vent=VOLCANIC_OBSTACLES.find(o=>o.id==='heat-vent');
  assert.equal(volcanicObstacleContact(vent.edgeId,vent.s+3,vent.lateral,1.6,5)?.id,
    vent.id,'near-surface car must contact the visible sloped vent');
  const crack=VOLCANIC_OBSTACLES.find(o=>o.id==='crack-01');
  assert.equal(volcanicObstacleContact(crack.edgeId,crack.s+3,crack.lateral,1.75,5),null,
    'car above the sloped crack must clear it despite world-Y proximity');
});

test('map-local AI descriptors share visible physics poses and safe passing corridors',()=>{
  assert.equal(typeof hazards.volcanicAIAvoidanceHints,'function');
  const rock=VOLCANIC_OBSTACLES.find(o=>o.id==='rockfall-01');
  const hint=hazards.volcanicAIAvoidanceHints(rock.edgeId,rock.s-35,1)
    .find(item=>item.id===rock.id);
  assert.ok(hint,'warned falling rock must be visible to AI before impact');
  assert.equal(hint.edgeId,rock.edgeId);
  assert.equal(hint.distanceAhead,35);
  assert.equal(hint.warning,true);
  assert.equal(hint.active,false);
  assert.deepEqual(hint.point,volcanicObstaclePose(rock,1).point);
  assert.equal(hint.clearanceRadius,rock.radius+2.3);
  assert.ok(hint.passLeft[0]<hint.passLeft[1],'left driving corridor must remain');
  assert.ok(hint.passRight[0]<hint.passRight[1],'right driving corridor must remain');
  assert.ok(hint.passLeft[1]<rock.lateral-hint.clearanceRadius+.001);
  assert.ok(hint.passRight[0]>rock.lateral+hint.clearanceRadius-.001);
  assert.deepEqual(hazards.volcanicAIAvoidanceHints('ground-5',rock.s-35,1),[],
    'different road layer never inherits this hazard');
  assert.equal(hazards.volcanicAIAvoidanceHints(rock.edgeId,rock.s-35,8)
    .some(item=>item.id===rock.id),false,'cleared rock must not block AI');
  assert.throws(()=>hazards.volcanicAIAvoidanceHints('bad-edge',0,0),/Unknown/);
});

test('AI obstacle hints never advertise zero-width passing corridors',()=>{
  const leftEdge=VOLCANIC_OBSTACLES.find(o=>o.id==='basalt-02');
  const rightEdge=VOLCANIC_OBSTACLES.find(o=>o.id==='basalt-01');
  const leftHint=hazards.volcanicAIAvoidanceHints(leftEdge.edgeId,leftEdge.s-30,5)
    .find(item=>item.id===leftEdge.id);
  const rightHint=hazards.volcanicAIAvoidanceHints(rightEdge.edgeId,rightEdge.s-30,5)
    .find(item=>item.id===rightEdge.id);
  assert.equal(leftHint.passLeft,null,'rock at left edge leaves no safe left corridor');
  assert.equal(rightHint.passRight,null,'rock at right edge leaves no safe right corridor');
  assert.ok(leftHint.passRight[0]<leftHint.passRight[1]);
  assert.ok(rightHint.passLeft[0]<rightHint.passLeft[1]);
  for(const obstacle of VOLCANIC_OBSTACLES){
    const hint=hazards.volcanicAIAvoidanceHints(obstacle.edgeId,obstacle.s,5)
      .find(item=>item.id===obstacle.id);
    if(!hint)continue;
    for(const bounds of [hint.passLeft,hint.passRight]){
      if(bounds)assert.ok(bounds[1]-bounds[0]>0.001,
        `${obstacle.id} must not expose a zero-width corridor`);
    }
  }
});
