import test from 'node:test';
import assert from 'node:assert/strict';
import { duneAvoidanceHint, duneRecoveryAdvice, duneLandingEnvelope } from '../src/courses/dune-tempest-safety.ts';
import { DUNE_TEMPEST_COURSE, DUNE_TEMPEST_AI_HINTS } from '../src/courses/dune-tempest.ts';

const rock={id:'rock-c',edgeId:'canyon-switchbacks',kind:'rock',
  atFraction:.17,lateralMeters:-8,collisionRadiusMeters:4,visualRadiusMeters:5.5,
  aiPreviewMeters:120,safePassSide:'right'};

test('AI path hint passes rock with vehicle collision margin', () => {
  const hint=duneAvoidanceHint(rock,26,1.5,2);
  assert.equal(hint.action,'dodge');
  assert.equal(hint.targetLateralMeters,-.5);
  assert.equal(hint.previewMeters,120);
  assert.ok(hint.targetLateralMeters-rock.lateralMeters>=rock.collisionRadiusMeters+1.5+2);
});
test('AI reduces speed instead of driving off road if authored safe side is blocked', () => {
  const blocked={...rock,lateralMeters:11,collisionRadiusMeters:6,safePassSide:'right'};
  const hint=duneAvoidanceHint(blocked,26,1.5,2);
  assert.equal(hint.action,'brake');
  assert.equal(hint.targetLateralMeters,null);
});
test('off-road warning and recovery candidate require later shared collision verification', () => {
  const zone={edgeId:'sunset-start',startFraction:.1,endFraction:.8,widthMeters:250,recoveryBufferMeters:35};
  const sample=(edgeId,s)=>({point:[s/2,8,-s],right:[1,0,0],up:[0,1,0]});
  assert.equal(duneRecoveryAdvice(zone,1000,500,100,sample).status,'safe');
  assert.equal(duneRecoveryAdvice(zone,1000,500,126,sample).status,'warn');
  const plan=duneRecoveryAdvice(zone,1000,500,161,sample);
  assert.equal(plan.status,'recover');
  assert.deepEqual(plan.candidatePosition,[250,8,-500]);
  assert.equal(plan.requiresCollisionClearanceCheck,true);
  assert.equal(duneRecoveryAdvice(zone,1000,900,200,sample).status,'outside-zone');
});
test('aerial landing remains on the last clear metres with specified ground fallback', () => {
  assert.deepEqual(duneLandingEnvelope('canyon-air-crossing',1000,
    {clearLengthMeters:105,recoveryEdgeId:'canyon-switchbacks'}),{
    edgeId:'canyon-air-crossing',startS:895,endS:1000,fallbackEdgeId:'canyon-switchbacks',
  });
  assert.throws(()=>duneLandingEnvelope('air',80,{clearLengthMeters:105,recoveryEdgeId:'safe'}),/length|landing/);
});
test('all authored Dune hazards produce an actionable avoidance or braking hint', () => {
  for (const hazard of DUNE_TEMPEST_COURSE.hazards) {
    const edge = DUNE_TEMPEST_COURSE.edges.find(e => e.id === hazard.edgeId);
    const hint = duneAvoidanceHint(hazard, edge.widthMeters);
    assert.ok(hint.action === 'dodge' || hint.action === 'brake');
    assert.ok(hint.previewMeters >= 80);
    if (hint.action === 'dodge')
      assert.ok(Math.abs(hint.targetLateralMeters) <= edge.widthMeters/2 - 3.5);
  }
});

test('all nine map-owned AI hazards export an opt-in hint on their actual edge', () => {
  assert.equal(DUNE_TEMPEST_AI_HINTS.length, 9);
  for (const [index, hint] of DUNE_TEMPEST_AI_HINTS.entries()) {
    assert.equal(hint.edgeId, DUNE_TEMPEST_COURSE.hazards[index].edgeId);
    assert.ok(hint.action === 'dodge' || hint.action === 'brake');
    assert.equal(hint.previewMeters, 120);
  }
});
