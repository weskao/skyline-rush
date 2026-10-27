import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModeAudioState, modeAudioCues, musicForMode } from '../src/mode-audio.ts';

const race = (mode, additions = {}) => ({ mode, phase:'racing', trackId:'coast', player:{distance:0}, ...additions });
test('menu and track music retain the originals; new modes have distinct themes', () => {
 assert.equal(musicForMode(race('classic',{phase:'ready'})), 'intro');
 assert.equal(musicForMode(race('classic',{trackId:'spiral'})), 'spiral');
 assert.equal(musicForMode(race('checkpoint')), 'checkpoint');
 assert.equal(musicForMode(race('stunt')), 'stunt');
 assert.equal(musicForMode(race('gauntlet')), 'gauntlet');
 assert.equal(musicForMode(race('cup')), 'cup');
 assert.equal(musicForMode(race('free')), 'cruise');
 assert.equal(musicForMode(race('time',{trackId:'tokyo'})), 'tokyo');
});
test('checkpoint gate pass, miss and clock warning each cue once', () => {
 const state=createModeAudioState(); const r=race('checkpoint',{checkpoint:{passed:0,missed:0,timeLeft:20}});
 assert.deepEqual(modeAudioCues(r,state), []);
 r.checkpoint.passed=1;
 assert.deepEqual(modeAudioCues(r,state),['gate-clear']);
 assert.deepEqual(modeAudioCues(r,state),[]);
 r.checkpoint.missed=1;
 assert.deepEqual(modeAudioCues(r,state),['gate-miss']);
 r.checkpoint.timeLeft=8;
 assert.deepEqual(modeAudioCues(r,state),['countdown-urgent']);
 assert.deepEqual(modeAudioCues(r,state),[]);
 r.checkpoint.timeLeft=21;
 modeAudioCues(r,state);
 r.checkpoint.timeLeft=7;
 assert.deepEqual(modeAudioCues(r,state),['countdown-urgent']);
});
test('gauntlet warning, clear and impact are distinct and cannot replay each frame', () => {
 const state=createModeAudioState(); const h={distance:110,hit:false,passed:false},r=race('gauntlet',{hazards:[h]});
 modeAudioCues(r,state);
 assert.deepEqual(modeAudioCues(r,state),['hazard-warning']);
 assert.deepEqual(modeAudioCues(r,state),[]);
 h.passed=true;
 assert.deepEqual(modeAudioCues(r,state),['hazard-clear']);
 h.hit=true;
 assert.deepEqual(modeAudioCues(r,state),['hazard-impact']);
 assert.deepEqual(modeAudioCues(r,state),[]);
});
test('stunt high combos, clean landing, reset and new session do not double-trigger', () => {
 const state=createModeAudioState(); const r=race('stunt',{styleAttack:{combo:0},player:{distance:0,trickPayout:null}});
 modeAudioCues(r,state);
 r.styleAttack.combo=3;
 assert.deepEqual(modeAudioCues(r,state),['combo-up']);
 assert.deepEqual(modeAudioCues(r,state),[]);
 r.player.trickPayout={time:3,hard:false};
 assert.deepEqual(modeAudioCues(r,state),['clean-landing']);
 r.styleAttack.combo=0;
 assert.deepEqual(modeAudioCues(r,state),['combo-break']);
 const next=race('stunt',{styleAttack:{combo:3},player:{distance:0,trickPayout:{time:3,hard:false}}});
 assert.deepEqual(modeAudioCues(next,state),[]);
});
test('mode finish and missed checkpoint use different cues', () => {
 const state=createModeAudioState(),r=race('checkpoint',{checkpoint:{passed:0,missed:0,timeLeft:9}});
 modeAudioCues(r,state);
 r.phase='finished';r.result={success:false};
 assert.deepEqual(modeAudioCues(r,state),['mode-failed']);
 assert.deepEqual(modeAudioCues(r,state),[]);
 const cup=race('cup');modeAudioCues(cup,state);
 cup.phase='finished';cup.result={success:true};
 assert.deepEqual(modeAudioCues(cup,state),['cup-stage']);
});

test('pausing consumes checkpoint state without replaying missed events on resume', () => {
 const state=createModeAudioState(),r=race('checkpoint',{checkpoint:{passed:0,missed:0,timeLeft:20}});
 modeAudioCues(r,state);
 r.phase='paused';r.checkpoint.passed=1;
 assert.deepEqual(modeAudioCues(r,state),[]);
 r.phase='racing';
 assert.deepEqual(modeAudioCues(r,state),[]);
});


test('each validated circuit lap cues once and pause or retry never replays it', () => {
 const state = createModeAudioState(), r = race('circuit', { circuit: { player: { completed: 0 } } });
 modeAudioCues(r, state);
 r.circuit.player.completed = 1;
 assert.deepEqual(modeAudioCues(r, state), ['gate-clear']);
 assert.deepEqual(modeAudioCues(r, state), []);
 r.phase = 'paused'; r.circuit.player.completed = 2;
 assert.deepEqual(modeAudioCues(r, state), []);
 r.phase = 'racing'; assert.deepEqual(modeAudioCues(r, state), []);
 r.circuit.player.completed = 3; assert.deepEqual(modeAudioCues(r, state), ['gate-clear']);
 assert.deepEqual(modeAudioCues(race('circuit', { circuit: { player: { completed: 0 } } }), state), []);
});
