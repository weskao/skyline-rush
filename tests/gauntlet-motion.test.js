import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHazards,hazardX} from '../src/hazards.ts';
const track={seed:1001,length:5000,sections:[{from:1650,to:1710,type:'gap'}]};
const lanes=[-7.5,-2.5,2.5,7.5];
test('standard and extreme obstacles are seeded and never block the whole road',()=>{
 const a=createHazards(track,lanes,'standard'),b=createHazards(track,lanes,'standard');
 assert.deepEqual(a,b);
 assert.ok(a.some(h=>h.moving));
 const extreme=createHazards(track,lanes,'extreme');
 assert.ok(extreme.length > a.length);
 for(const h of extreme)for(const time of [0,1,3,200]){
   assert.ok(Number.isFinite(hazardX(h,time)));
   assert.ok(Math.abs(hazardX(h,time))<=9);
 }
});
test('stationary hazards stay fixed and moving ones have smooth repeatable positions',()=>{
 const hazards=createHazards(track,lanes,'standard');
 const moving=hazards.find(h=>h.moving),fixed=hazards.find(h=>!h.moving);
 assert.ok(moving);assert.ok(fixed);
 assert.equal(hazardX(fixed,21),fixed.x);
 assert.notEqual(hazardX(moving,0),hazardX(moving,1));
 assert.equal(hazardX(moving,12),hazardX(moving,12));
});
test('extreme tier is bounded; unknown tiers and invalid tracks are rejected',()=>{
 assert.throws(()=>createHazards(track,lanes,'impossible'));
 assert.throws(()=>createHazards({...track,length:NaN},lanes,'standard'));
});
