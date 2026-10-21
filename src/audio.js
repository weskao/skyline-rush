// 32-bar loops (intro ≈ 64 s, race ≈ 55 s, Sky Spiral ≈ 60 s, each World Tour course 56–70 s).
// Each chord is [bass root, three pad/arp tones]; lead is eight eighth-notes per chord bar (0 = rest).
// Layers enter at the listed bar so every pass builds up.
export const TRACKS = {
  intro: {
    bpm: 120, arp: 2, bass: [0, 6, 8, 14], enter: { bass: 8, drums: 16, lead: 16 },
    chords: [[45, 57, 60, 64], [41, 57, 60, 65], [48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [40, 56, 59, 64]],
    lead: [
      76, 0, 74, 76, 0, 72, 0, 0, 72, 0, 74, 72, 0, 69, 0, 0, 67, 0, 72, 0, 76, 0, 74, 72, 74, 0, 0, 0, 71, 0, 0, 0,
      76, 0, 74, 76, 0, 79, 0, 76, 77, 0, 76, 74, 0, 72, 0, 0, 74, 0, 72, 71, 0, 67, 0, 0, 68, 0, 71, 0, 74, 0, 0, 0,
    ],
  },
  race: {
    bpm: 140, arp: 1, bass: [0, 2, 4, 6, 8, 10, 12, 14], enter: { bass: 0, drums: 4, lead: 16 },
    chords: [[40, 55, 59, 64], [36, 55, 60, 64], [43, 55, 59, 62], [38, 54, 57, 62], [40, 55, 59, 64], [36, 55, 60, 64], [38, 54, 57, 62], [35, 54, 59, 63]],
    lead: [
      71, 0, 74, 0, 76, 0, 74, 71, 72, 0, 0, 71, 72, 0, 76, 0, 74, 0, 0, 0, 71, 0, 67, 0, 69, 0, 71, 0, 74, 0, 0, 0,
      76, 0, 79, 0, 76, 0, 74, 76, 79, 0, 0, 76, 72, 0, 76, 0, 78, 0, 76, 0, 74, 0, 69, 0, 71, 0, 75, 0, 78, 0, 75, 0,
    ],
  },
  // Sky Spiral only. Opening pad is MIDI 56, not the intro pad (57) or the race pad (55).
  spiral: {
    bpm: 128, arp: 2, bass: [0, 4, 8, 12], enter: { bass: 4, drums: 8, lead: 12 },
    chords: [[44, 56, 63, 68], [39, 56, 63, 70], [46, 58, 63, 67], [41, 53, 60, 65], [44, 56, 63, 68], [39, 56, 63, 70], [41, 53, 60, 65], [37, 56, 61, 68]],
    lead: [
      75, 0, 80, 0, 75, 0, 73, 0, 75, 0, 0, 68, 70, 0, 75, 0, 80, 0, 75, 0, 73, 0, 70, 0, 68, 0, 0, 0, 70, 0, 0, 0,
      82, 0, 80, 0, 75, 0, 73, 75, 80, 0, 0, 75, 70, 0, 75, 0, 77, 0, 75, 0, 73, 0, 68, 0, 70, 0, 73, 0, 75, 0, 68, 0,
    ],
  },
  // Taipei: D pentatonic, open fifths. Opening pad is MIDI 62.
  taipei: {
    bpm: 112, arp: 2, bass: [0, 8], enter: { bass: 4, drums: 8, lead: 8 },
    chords: [[38, 62, 69, 74], [43, 67, 71, 74], [45, 69, 71, 76], [40, 64, 66, 71], [38, 62, 69, 74], [43, 67, 69, 74], [47, 59, 66, 71], [45, 69, 74, 76]],
    lead: [
      74, 0, 76, 74, 0, 71, 0, 0, 69, 0, 71, 74, 0, 76, 0, 0, 76, 0, 74, 71, 69, 0, 71, 0, 66, 0, 0, 69, 71, 0, 74, 0,
      74, 0, 78, 0, 76, 74, 0, 71, 69, 0, 74, 0, 71, 69, 0, 0, 71, 0, 74, 71, 0, 66, 0, 0, 69, 0, 71, 0, 74, 0, 76, 74,
    ],
  },
  // Tokyo: C minor, dense arp. Opening pad is MIDI 63.
  tokyo: {
    bpm: 132, arp: 1, bass: [0, 4, 8, 12], enter: { bass: 0, drums: 4, lead: 8 },
    chords: [[36, 63, 67, 70], [41, 65, 68, 72], [44, 68, 72, 75], [46, 65, 70, 74], [36, 63, 67, 70], [43, 59, 62, 67], [44, 68, 72, 75], [46, 65, 70, 75]],
    lead: [
      75, 0, 79, 0, 82, 0, 79, 75, 77, 0, 0, 75, 72, 0, 75, 0, 80, 0, 75, 0, 72, 0, 68, 0, 70, 0, 72, 75, 0, 79, 0, 0,
      82, 0, 79, 75, 0, 72, 0, 75, 79, 0, 77, 0, 75, 0, 72, 0, 80, 0, 75, 0, 72, 75, 0, 79, 82, 0, 0, 79, 75, 0, 72, 0,
    ],
  },
  // Alpine: G dorian, wide leaps, rail-joint bass. Opening pad is MIDI 58.
  alpine: {
    bpm: 112, arp: 3, bass: [0, 4, 8, 12], enter: { bass: 2, drums: 8, lead: 4 },
    chords: [[43, 58, 62, 67], [46, 58, 65, 70], [41, 60, 65, 69], [36, 60, 63, 67], [43, 58, 62, 67], [38, 62, 66, 69], [41, 60, 65, 69], [46, 65, 70, 74]],
    lead: [
      67, 0, 0, 70, 0, 74, 0, 0, 70, 0, 74, 0, 77, 0, 74, 70, 69, 0, 65, 0, 0, 62, 0, 0, 67, 0, 70, 0, 74, 0, 0, 0,
      74, 0, 0, 79, 0, 77, 0, 74, 74, 0, 71, 0, 69, 0, 67, 0, 69, 0, 72, 0, 77, 0, 74, 0, 70, 0, 0, 67, 0, 62, 0, 58,
    ],
  },
  // Coastal: F major, rolling arp. Opening pad is MIDI 65.
  coastal: {
    bpm: 116, arp: 2, bass: [0, 8, 12], enter: { bass: 4, drums: 12, lead: 4 },
    chords: [[41, 65, 69, 72], [36, 64, 67, 72], [46, 65, 70, 74], [38, 62, 65, 69], [41, 65, 69, 72], [45, 64, 69, 72], [46, 70, 74, 77], [36, 67, 72, 76]],
    lead: [
      77, 0, 81, 0, 84, 81, 77, 0, 79, 0, 76, 0, 72, 0, 76, 79, 74, 0, 77, 0, 81, 0, 77, 74, 72, 0, 69, 0, 65, 0, 69, 72,
      77, 0, 81, 84, 0, 86, 0, 84, 81, 0, 77, 0, 76, 0, 72, 0, 74, 0, 77, 81, 0, 77, 0, 74, 72, 0, 76, 0, 79, 0, 84, 0,
    ],
  },
  // Cosmic: stacked fourths, sparse lead. Opening pad is MIDI 66.
  cosmic: {
    bpm: 110, arp: 4, bass: [0, 12], enter: { bass: 8, drums: 16, lead: 4 },
    chords: [[42, 66, 71, 78], [43, 67, 72, 79], [45, 69, 74, 81], [40, 64, 69, 76], [42, 66, 71, 78], [39, 63, 68, 75], [36, 65, 70, 77], [47, 71, 76, 83]],
    lead: [
      78, 0, 0, 0, 83, 0, 0, 0, 79, 0, 0, 84, 0, 0, 79, 0, 81, 0, 0, 0, 86, 0, 81, 0, 76, 0, 0, 81, 0, 0, 0, 76,
      78, 0, 83, 0, 0, 90, 0, 0, 75, 0, 0, 80, 0, 0, 75, 0, 77, 0, 0, 0, 82, 0, 0, 77, 83, 0, 0, 78, 0, 0, 71, 0,
    ],
  },
};
const COURSE_SONGS = { spiral: 'spiral', taipei: 'taipei', tokyo: 'tokyo', alpine: 'alpine', coastal: 'coastal', cosmic: 'cosmic' };
const LOOP_STEPS = 32 * 16;
// Race tempo multiplier: 1 until the last 500 m, then a linear ramp to 1.15 at the finish.
export const sprintFactor = (distance, length) => 1 + 0.15 * Math.min(1, Math.max(0, (distance - (length - 500)) / 500));
const pitch = note => 440 * 2 ** ((note - 69) / 12);

export function createSound() {
  let context, oscillator, gain, filter, master, noiseBuffer, thrustGain, windGain, skidGain;
  let music, warm, hats, snares, song = null, step = 0, nextStep = 0;
  let enabled = false, musicOn = false, previousRace, previousPhase, previousCount;
  // Slider levels map to gain on a squared curve so the lower half of the slider stays audibly useful.
  let effectsLevel = 1, musicLevel = 1;
  let lastImpact = null, lastLanding = null, lastNearMiss = null, lastTrick = null;
  let wasThrusting = false, wasBoosting = false, lowCharge = false;
  const voices = new Set();
  let collectedPickups = new WeakSet();

  function track(source, nodes, end, cue = true) {
    if (cue) voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()); };
    source.stop(end);
  }
  function silenceCues() {
    for (const voice of voices) voice.stop();
    voices.clear();
  }
  function voice(type, frequency, endFrequency, time, duration, volume, attack, destination, cue = true) {
    const source = context.createOscillator();
    const envelope = context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(volume, time + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(envelope).connect(destination);
    source.start(time);
    track(source, [envelope], time + duration + 0.02, cue);
  }
  function tone(frequency, endFrequency, duration, delay = 0, volume = 0.045) {
    if (!enabled || voices.size >= 24) return;
    voice('sine', frequency, endFrequency, context.currentTime + delay, duration, volume, 0.008, master);
  }
  function hit(destination, time, duration, volume) {
    const source = context.createBufferSource();
    const envelope = context.createGain();
    source.buffer = noiseBuffer;
    envelope.gain.setValueAtTime(volume, time);
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(envelope).connect(destination);
    source.start(time, Math.random() * 0.5);
    track(source, [envelope], time + duration + 0.02, false);
  }
  function playStep(tune, index, time) {
    const bar = Math.floor(index / 16), beat = index % 16, chord = tune.chords[bar % 8], sixteenth = 15 / tune.bpm;
    const note = (type, midi, length, volume, attack, destination = music) => voice(type, pitch(midi), pitch(midi), time, sixteenth * length, volume, attack, destination, false);
    if (beat === 0) chord.slice(1).forEach(midi => note('triangle', midi, 16, 0.022, 0.4));
    if (beat % tune.arp === 0) note('square', chord[1 + (beat / tune.arp) % 3] + 12, 1.5, 0.012, 0.005);
    if (bar >= tune.enter.bass && tune.bass.includes(beat)) note('sawtooth', chord[0], 1.8, 0.05, 0.01, warm);
    const lead = beat % 2 === 0 && bar >= tune.enter.lead && tune.lead[(bar % 8) * 8 + beat / 2];
    if (lead) note('square', lead, 3, 0.02, 0.02, warm);
    if (bar < tune.enter.drums) return;
    if (beat % 4 === 0) voice('sine', 140, 45, time, 0.22, 0.18, 0.004, music, false);
    if (beat === 4 || beat === 12) hit(snares, time, 0.14, 0.07);
    if (beat % 4 === 2) hit(hats, time, 0.045, 0.03);
  }
  function cue(name) {
    if (name === 'go') { tone(660, 880, 0.4); tone(990, 1320, 0.4, 0, 0.025); }
    else if (name === 'finish') [523, 659, 784, 1047].forEach((pitch, i) => tone(pitch, pitch, 0.35, i * 0.13));
    else if (name === 'boost' || name === 'whoosh') {
      if (name === 'boost') tone(95, 42, 0.23, 0, 0.045);
      if (enabled && voices.size < 24) {
        const source = context.createBufferSource();
        const band = context.createBiquadFilter(), envelope = context.createGain();
        const now = context.currentTime;
        source.buffer = noiseBuffer; band.type = 'bandpass'; band.Q.value = 0.5;
        band.frequency.setValueAtTime(2400, now); band.frequency.exponentialRampToValueAtTime(650, now + 0.32);
        envelope.gain.setValueAtTime(0, now); envelope.gain.linearRampToValueAtTime(0.1, now + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        source.connect(band).connect(envelope).connect(master); source.start(now);
        track(source, [band, envelope], now + 0.38);
      }
    }
    else if (name === 'lift') tone(260, 900, 0.35, 0, 0.03);
    else if (name === 'near') { tone(880, 1320, 0.12); tone(1320, 1760, 0.18, 0.1); }
    else if (name === 'pickup') { tone(1047, 1568, 0.14, 0, 0.03); tone(1568, 2093, 0.18, 0.07, 0.02); }
    else if (name === 'low') { tone(440, 330, 0.14); tone(440, 330, 0.14, 0.2); }
    else if (name === 'pause') tone(520, 220, 0.15);
    else tone(name === 'tick' ? 440 : 720, name === 'tick' ? 440 : 1040, name === 'tick' ? 0.18 : 0.12);
  }
  function impulse(intensity, landing, barrier = false) {
    if (voices.size >= 24) return;
    const source = context.createBufferSource();
    const envelope = context.createGain();
    const lowpass = context.createBiquadFilter();
    source.buffer = noiseBuffer;
    lowpass.type = 'lowpass';
    const now = context.currentTime;
    lowpass.frequency.setValueAtTime(landing ? 180 : barrier ? 2600 : 1400, now);
    lowpass.frequency.exponentialRampToValueAtTime(60, now + 0.3);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(intensity * (landing ? 0.09 : 0.18), now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    source.connect(lowpass).connect(envelope).connect(master);
    source.start(now);
    track(source, [lowpass, envelope], now + 0.38);
    tone(landing ? 75 : 130, 38, 0.22, 0, intensity * 0.07);
  }
  function noise(frequency, type) {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const band = context.createBiquadFilter();
    band.type = type;
    band.frequency.value = frequency;
    band.Q.value = 0.6;
    const level = context.createGain();
    level.gain.value = 0;
    source.connect(band).connect(level).connect(master);
    source.start();
    return level;
  }
  function filtered(type, frequency) {
    const node = context.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.connect(music);
    return node;
  }
  function open() {
    if (!context) {
      context = new AudioContext();
      oscillator = context.createOscillator();
      filter = context.createBiquadFilter();
      gain = context.createGain();
      master = context.createGain();
      master.gain.value = 0;
      music = context.createGain();
      music.gain.value = 0;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 8;
      master.connect(limiter).connect(context.destination);
      music.connect(limiter);
      oscillator.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      gain.gain.value = 0;
      oscillator.connect(filter).connect(gain).connect(master);
      oscillator.start();
      noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      thrustGain = noise(950, 'bandpass');
      windGain = noise(400, 'lowpass');
      skidGain = noise(2300, 'bandpass');
      warm = filtered('lowpass', 1800);
      hats = filtered('highpass', 7000);
      snares = filtered('bandpass', 1800);
    }
    // Not awaited: before the first user gesture resume() can stay pending; a later gesture retries it.
    context.resume().catch(() => {});
  }
  function fail() {
    enabled = musicOn = false;
    if (master) master.gain.value = 0;
    context?.close().catch(() => {});
    context = null;
  }
  function setEnabled(next, volume = 1) {
    effectsLevel = volume ** 2;
    try {
      if (next) open();
      if (context) {
        enabled = next;
        if (!enabled) silenceCues();
        master.gain.setTargetAtTime(enabled ? 0.8 * effectsLevel : 0, context.currentTime, 0.025);
      }
    } catch { fail(); }
    return enabled;
  }
  function setMusic(next, volume = 1) {
    musicLevel = volume ** 2;
    try {
      if (next) open();
      musicOn = next && !!context;
    } catch { fail(); }
    return musicOn;
  }
  return {
    cue,
    setEnabled,
    setMusic,
    running: () => context?.state === 'running',
    update(race) {
      const car = race.player;
      const active = race.phase === 'racing';
      const boosting = car.boosting || car.nitroTime > 0 || car.miniBoost > 0;
      const freshRace = race !== previousRace;
      const count = race.phase === 'countdown' ? Math.ceil(race.countdown) : null;
      if (race !== previousRace) {
        silenceCues();
        previousRace = race;
        previousPhase = previousCount = null;
        lastImpact = lastLanding = lastNearMiss = lastTrick = null;
        wasThrusting = wasBoosting = lowCharge = false;
        collectedPickups = new WeakSet();
      }
      if (race.phase === 'paused' && previousPhase !== 'paused') silenceCues();
      if (enabled) {
        if (count !== null && count !== previousCount) cue('tick');
        if (active && previousPhase === 'countdown') cue('go');
        if (race.phase === 'finished' && previousPhase !== 'finished') cue('finish');
        if (active) {
          if (car.impact && car.impact !== lastImpact && race.elapsed - car.impact.time < 0.2) impulse(car.impact.intensity, false, car.impact.kind === 'barrier');
          if (car.landing && car.landing !== lastLanding && race.elapsed - car.landing.time < 0.2) impulse(Math.min(1, car.landing.speed / 14), true);
          if (car.nearMiss && car.nearMiss !== lastNearMiss) cue('near');
          if (car.trick && car.trick !== lastTrick) cue('whoosh');
          if (car.thrusting && !wasThrusting) cue('lift');
          if (boosting && !wasBoosting) cue('boost');
          if (car.fuel < 20 && !lowCharge) cue('low');
        }
      }
      for (const pickup of race.pickups) if (pickup.taken && !collectedPickups.has(pickup)) {
        collectedPickups.add(pickup);
        if (enabled && active && !freshRace) cue('pickup');
      }
      if (context) {
        const now = context.currentTime;
        oscillator.frequency.setTargetAtTime(35 + car.speed * 1.5 + (boosting ? 45 : 0), now, 0.12);
        filter.frequency.setTargetAtTime(boosting ? 850 : 180 + car.speed * 3, now, 0.15);
        gain.gain.setTargetAtTime(active ? 0.014 + car.speed * 0.00016 : 0, now, 0.06);
        thrustGain.gain.setTargetAtTime(active && (car.thrusting || boosting) ? 0.055 : 0, now, 0.08);
        windGain.gain.setTargetAtTime(active ? (car.speed / 102) ** 2 * 0.07 : 0, now, 0.1);
        const skid = car.drift ? 0.035 + Math.min(3, Math.floor(car.drift.time)) * 0.012 : car.braking ? 0.035 : 0;
        skidGain.gain.setTargetAtTime(active && car.altitude < 0.2 && car.speed > 15 ? skid : 0, now, 0.06);
        music.gain.setTargetAtTime(!musicOn ? 0 : musicLevel * (race.phase === 'paused' ? 0.25 : active ? 0.5 : 0.65), now, 0.1);
        const name = !musicOn ? null : race.phase === 'ready' || race.phase === 'finished' ? 'intro' : COURSE_SONGS[race.trackId] || 'race';
        if (name !== song) { song = name; step = 0; }
        // Schedule ~0.2 s ahead from the frame loop; after a stalled frame, resume from now instead of bursting.
        const sprint = active && song && song !== 'intro' ? sprintFactor(car.distance, race.length) : 1;
        if (song) for (nextStep = Math.max(nextStep, now + 0.03); nextStep < now + 0.2; nextStep += 15 / (TRACKS[song].bpm * sprint), step = (step + 1) % LOOP_STEPS) playStep(TRACKS[song], step, nextStep);
      }
      previousPhase = race.phase;
      previousCount = count;
      lastImpact = car.impact;
      lastLanding = car.landing;
      lastNearMiss = car.nearMiss;
      lastTrick = car.trick;
      wasThrusting = active && car.thrusting;
      wasBoosting = active && boosting;
      if (car.fuel >= 30) lowCharge = false;
      else if (car.fuel < 20) lowCharge = true;
    },
    dispose() { silenceCues(); context?.close().catch(() => {}); },
  };
}
