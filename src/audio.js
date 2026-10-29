import { musicForMode } from './mode-audio.ts';
import { createRaceAudioEvents } from './race-audio-events.ts';
import { TRACKS, LOOP_STEPS, sprintFactor, pitch } from './music-tracks.ts';

export function createSound() {
  let context, oscillator, gain, filter, master, noiseBuffer, thrustGain, windGain, skidGain;
  let music, warm, hats, snares, song = null, step = 0, nextStep = 0, madeAt = -Infinity;
  let enabled = false, musicOn = false, hidden = false;
  // Slider levels map to gain on a squared curve so the lower half of the slider stays audibly useful.
  let effectsLevel = 1, musicLevel = 1;
  const voices = new Set();
  const raceEvents = createRaceAudioEvents();

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
    else if (name === 'item-use') { tone(330, 990, .2, 0, .03); tone(660, 1320, .16, .06, .02); }
    else if (name === 'shield-block') { tone(1568, 784, .18, 0, .03); tone(2093, 1047, .14, .03, .02); }
    else if (name === 'item-ready') { tone(1319, 1319, .07, 0, .018); tone(1760, 1760, .09, .08, .018); }
    else if (name === 'low') { tone(440, 330, 0.14); tone(440, 330, 0.14, 0.2); }
    else if (name === 'photo') { tone(1100, 840, .09, 0, .012); }
    else if (name === 'gate-clear') { tone(790, 1185, .16); tone(1185, 1580, .26, .1, .028); }
    else if (name === 'gate-miss') { tone(410, 245, .22); }
    else if (name === 'countdown-urgent') { tone(740, 740, .11); tone(740, 740, .11, .18); }
    else if (name === 'hazard-warning') { tone(360, 300, .14, 0, .03); tone(360, 300, .14, .18, .03); }
    else if (name === 'hazard-clear') { tone(670, 990, .17, 0, .027); }
    else if (name === 'hazard-impact') { tone(260, 115, .24, 0, .03); }
    else if (name === 'combo-up') { tone(660, 880, .13); tone(880, 1320, .19, .11); }
    else if (name === 'combo-break') { tone(480, 230, .2, 0, .028); }
    else if (name === 'clean-landing') { tone(880, 1320, .25); tone(1175, 1760, .29, .08); }
    else if (name === 'chain-land') { tone(95, 42, .2, 0, .04); tone(784, 1568, .22, .03, .028); tone(1175, 2349, .26, .1, .022); }
    else if (name === 'cup-stage') [523, 659, 784].forEach((hz,i) => tone(hz, hz * 1.04, .22, i * .13, .025));
    else if (name === 'stunt-finish') [659, 784, 988].forEach((hz,i) => tone(hz, hz * 1.05, .26, i * .12, .025));
    else if (name === 'mode-failed') { tone(400, 260, .25); tone(320, 205, .28, .15); }
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
    const tap = navigator.userActivation?.isActive ?? true;
    // iOS WebKit can keep a context made at page load, or one interrupted in the background, suspended for good; a tap rebuilds it so it starts with the gesture.
    if (context && tap && context.state !== 'running' && performance.now() - madeAt > 1000) {
      silenceCues();
      context.close().catch(() => {});
      context = null;
    }
    if (!context) {
      madeAt = tap ? performance.now() : -Infinity;
      nextStep = 0;
      // iOS mutes web audio while the silent switch is on unless the page asks for media playback.
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Keep the browser's default session. */ }
      context = new AudioContext();
      oscillator = context.createOscillator();
      filter = context.createBiquadFilter();
      gain = context.createGain();
      master = context.createGain();
      master.gain.value = enabled ? 1.6 * effectsLevel : 0;
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
    setHidden(hidden);
  }
  // A 'playback' session keeps iOS playing after the tab or app goes to the background, so stop the clock there.
  function setHidden(next) {
    hidden = next;
    if (!context) return;
    // Not awaited: before the first user gesture resume() can stay pending; a later gesture retries it.
    if (hidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
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
        master.gain.setTargetAtTime(enabled ? 1.6 * effectsLevel : 0, context.currentTime, 0.025);
      }
    } catch { fail(); }
    return enabled;
  }
  function setMusic(next, volume = 1) {
    musicLevel = 2.5 * volume ** 2;
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
    setHidden,
    running: () => context?.state === 'running',
    update(race) {
      const car = race.player;
      const { silence, sounds, active, boosting } = raceEvents.update(race, enabled);
      if (silence) silenceCues();
      for (const sound of sounds) {
        if (typeof sound === 'string') cue(sound);
        else impulse(sound.intensity, sound.landing, sound.barrier);
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
        const name = !musicOn ? null : musicForMode(race);
        if (name !== song) { song = name; step = 0; }
        // Schedule ~0.2 s ahead from the frame loop; after a stalled frame, resume from now instead of bursting.
        const urgency = race.mode === 'checkpoint' && race.checkpoint?.timeLeft < 10 ? 1.1 :
          race.mode === 'stunt' && race.stuntLimit - race.elapsed < 20 ? 1.08 : 1;
        const sprint = active && song && song !== 'intro' ? sprintFactor(car.distance, race.length) * urgency : 1;
        if (song) for (nextStep = Math.max(nextStep, now + 0.03); nextStep < now + 0.2; nextStep += 15 / (TRACKS[song].bpm * sprint), step = (step + 1) % LOOP_STEPS) playStep(TRACKS[song], step, nextStep);
      }
    },
    dispose() { silenceCues(); context?.close().catch(() => {}); },
  };
}
