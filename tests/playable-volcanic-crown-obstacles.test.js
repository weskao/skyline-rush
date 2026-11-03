import test from 'node:test';
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
