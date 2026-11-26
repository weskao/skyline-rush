// CPU-only Before/After probe for workstream 14: simulation, rival AI, audio update, allocation and GC.
// Not GPU, not frame pacing, not a device result. Label every number with the environment printed in `env`.
// Allocation: heapUsed deltas are unreliable (collections interleave), so run with a small fixed new space and count scavenges.
// scavengesPer1kTicks is a relative allocation-volume proxy (not bytes); gcMs is total scavenge+other pause over the run. Compare A/B at identical flags:
//   node --experimental-strip-types --expose-gc --min-semi-space-size=1 --max-semi-space-size=1 scripts/cpu-audio-bench.mjs
// Options: --ticks=3000 --reps=5 --tracks=coast,tokyo --out=file.json. Timings use process.cpuUsage (CPU time), so a loaded machine inflates them less
// than wall time, but compare only runs made alternately (A B A B) on the same machine.
import { performance, PerformanceObserver } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { createRace, startRace, stepRace } from '../src/game.js';
import { createSound } from '../src/audio.js';
import { seededRng } from '../src/rng.ts';
import { scriptedInput } from '../tests/helpers/cpu-replay.js';
import { installRecordingAudio } from '../tests/helpers/audio-recorder.js';

const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const TICKS = Number(arg('ticks', 3000)), REPS = Number(arg('reps', 5)), OUT = arg('out', ''), DT = 1 / 60;
const TRACKS = arg('tracks', 'coast,tokyo,dune-tempest,skyfall-archipelago').split(',');
const cpuMs = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const percentile = (values, ratio) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)];

let gcCount = 0, gcMs = 0, scavenges = 0;
// PerformanceObserver delivers gc entries on the event loop, so a synchronous run must yield once before reading the counters.
const tick = () => new Promise(resolve => setImmediate(resolve));
const flushGc = async () => { await tick(); await tick(); }; // entries arrive one macrotask after the first yield
new PerformanceObserver(list => { for (const e of list.getEntries()) { gcCount++; gcMs += e.duration; if (e.detail?.kind === 1) scavenges++; } }).observe({ entryTypes: ['gc'] });

function prepare(trackId) {
  const race = createRace(trackId); startRace(race);
  while (race.phase === 'countdown') stepRace(race, {}, DT);
  return race;
}

async function simRun(trackId) {
  const race = prepare(trackId), input = scriptedInput(seededRng(12345, 'cpu-replay')), per = [];
  globalThis.gc?.(); await flushGc();
  const gc0 = gcCount, gcMs0 = gcMs, sc0 = scavenges, cpu0 = cpuMs();
  let ticks = 0;
  for (; ticks < TICKS && race.phase === 'racing'; ticks++) {
    const t = performance.now(); stepRace(race, input(), DT); per.push((performance.now() - t) * 1000);
  }
  const cpu = cpuMs() - cpu0;
  await flushGc();
  return { ticks, cpuMsTotal: cpu, cpuUsPerTick: cpu * 1000 / ticks, wallP50Us: median(per), wallP95Us: percentile(per, 0.95),
    scavengesPer1kTicks: (scavenges - sc0) * 1000 / ticks, gcCount: gcCount - gc0, scavenges: scavenges - sc0, gcMs: gcMs - gcMs0 };
}

// Audio: real createSound against the recording Web Audio boundary, driven once per simulated 60 Hz frame.
async function audioRun(trackId) {
  const rec = installRecordingAudio();
  const race = prepare(trackId), input = scriptedInput(seededRng(12345, 'cpu-replay'));
  const sound = createSound(); sound.setEnabled(true); sound.setMusic(true);
  const ctx = rec.contexts.at(-1);
  globalThis.gc?.(); await flushGc();
  const gc0 = gcCount, gcMs0 = gcMs, sc0 = scavenges, cpu0 = cpuMs();
  const before = { calls: rec.stats.paramCalls, nodes: rec.stats.nodes };
  let ticks = 0, updateMs = 0;
  for (; ticks < TICKS && race.phase === 'racing'; ticks++) {
    stepRace(race, input(), DT); ctx.currentTime += DT;
    const t = cpuMs(); sound.update(race); updateMs += cpuMs() - t;
  }
  const totalCpu = cpuMs() - cpu0; await flushGc();
  const out = { ticks, audioUpdateCpuUsPerTick: updateMs * 1000 / ticks, totalCpuMs: totalCpu,
    paramCallsPerTick: (rec.stats.paramCalls - before.calls) / ticks, nodesPerTick: (rec.stats.nodes - before.nodes) / ticks,
    paramCallsByMethod: { ...rec.stats.paramCallsByMethod }, scavengesPer1kTicks: (scavenges - sc0) * 1000 / ticks,
    gcCount: gcCount - gc0, scavenges: scavenges - sc0, gcMs: gcMs - gcMs0 };
  sound.dispose(); rec.uninstall();
  return out;
}

const summarize = runs => Object.fromEntries(Object.keys(runs[0]).map(key =>
  [key, typeof runs[0][key] === "number" ? Number(median(runs.map(r => r[key])).toFixed(3)) : runs.at(-1)[key]]));
const result = { env: { label: arg('label', 'local-node'), node: process.version, cpu: cpus()[0]?.model, cores: cpus().length, gcExposed: typeof gc === 'function',
  ticks: TICKS, reps: REPS, note: 'CPU-only node probe; not GPU/frame/device. Medians of reps.' }, sim: {}, audio: {} };
for (const trackId of TRACKS) {
  await simRun(trackId); await audioRun(trackId); // warm-up, discarded
  const sim = [], audio = [];
  for (let i = 0; i < REPS; i++) { sim.push(await simRun(trackId)); audio.push(await audioRun(trackId)); }
  result.sim[trackId] = summarize(sim); result.audio[trackId] = summarize(audio);
}
const text = JSON.stringify(result, null, 2);
if (OUT) writeFileSync(OUT, text + '\n'); else process.stdout.write(text + '\n');
