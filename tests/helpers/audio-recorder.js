// Recording Web Audio boundary for node: counts node creation and every AudioParam automation call, so tests and
// scripts/cpu-audio-bench.mjs can assert and measure what sound.update() asks the audio thread to do.
export function installRecordingAudio(globalObject = globalThis) {
  const stats = { nodes: 0, nodesByKind: {}, paramCalls: 0, paramCallsByMethod: {}, paramLog: [], logParams: false };
  const note = method => { stats.paramCalls++; stats.paramCallsByMethod[method] = (stats.paramCallsByMethod[method] ?? 0) + 1; };
  const param = (kind, name) => {
    const record = (method, value, ...rest) => { note(method); if (stats.logParams) stats.paramLog.push([kind, name, method, value, ...rest]); };
    return { value: 0,
      setValueAtTime(value, time) { this.value = value; record('setValueAtTime', value, time); },
      setTargetAtTime(value, time, constant) { this.value = value; record('setTargetAtTime', value, time, constant); },
      linearRampToValueAtTime(value, time) { this.value = value; record('linearRampToValueAtTime', value, time); },
      exponentialRampToValueAtTime(value, time) { this.value = value; record('exponentialRampToValueAtTime', value, time); },
      cancelScheduledValues(time) { record('cancelScheduledValues', time); } };
  };
  const node = kind => {
    stats.nodes++; stats.nodesByKind[kind] = (stats.nodesByKind[kind] ?? 0) + 1;
    return { kind, frequency: param(kind, 'frequency'), gain: param(kind, 'gain'), Q: param(kind, 'Q'), threshold: param(kind, 'threshold'),
      ratio: param(kind, 'ratio'), connect(destination) { this.destination = destination; return destination; }, disconnect() {},
      start(time) { this.started = time; }, stop(time) { this.stopped = time; } };
  };
  const contexts = [];
  globalObject.AudioContext = class {
    currentTime = 0; sampleRate = 100; state = 'running'; destination = {};
    constructor() { contexts.push(this); }
    createOscillator() { return node('oscillator'); }
    createGain() { return node('gain'); }
    createBiquadFilter() { return node('filter'); }
    createDynamicsCompressor() { return node('compressor'); }
    createBufferSource() { return node('buffer'); }
    createBuffer(numberOfChannels, length, sampleRate) {
      const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
      return { numberOfChannels, length, sampleRate, getChannelData: channel => channels[channel] };
    }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  return { stats, contexts, uninstall() { delete globalObject.AudioContext; } };
}
