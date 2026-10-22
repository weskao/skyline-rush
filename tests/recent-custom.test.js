import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saveRecentCustom, loadRecentCustom } from '../src/recent-custom.js';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) }; };
const config = (traffic='normal') => ({mode:'custom',rivals:2,traffic,difficulty:'normal',items:true});
test('stores the three most recent distinct custom setups, newest first',()=>{
 const storage=memory();
 for(const traffic of ['off','normal','light','heavy']) saveRecentCustom(storage,'coast',config(traffic));
 assert.deepEqual(loadRecentCustom(storage).map(x=>x.config.traffic),['heavy','light','normal']);
 saveRecentCustom(storage,'coast',config('light'));
 assert.deepEqual(loadRecentCustom(storage).map(x=>x.config.traffic),['light','heavy','normal']);
});
test('does not keep Classic sessions or invalid track IDs',()=>{
 const storage=memory();
 assert.deepEqual(saveRecentCustom(storage,'coast',{mode:'classic'}),[]);
 assert.deepEqual(saveRecentCustom(storage,'../coast',config()),[]);
 assert.deepEqual(loadRecentCustom(storage),[]);
});
test('corrupt or blocked localStorage never blocks game setup',()=>{
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked')}};
 assert.equal(saveRecentCustom(broken,'coast',config()).length,1);
 assert.deepEqual(loadRecentCustom(broken),[]);
 const corrupt={getItem(){return 'not-json'},setItem(){}};
 assert.deepEqual(loadRecentCustom(corrupt),[]);
});
