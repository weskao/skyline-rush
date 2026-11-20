export function createLoopingNoiseGain(
  context: AudioContext, buffer: AudioBuffer, output: AudioNode, frequency: number, type: BiquadFilterType,
) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const band = context.createBiquadFilter();
  band.type = type;
  band.frequency.value = frequency;
  band.Q.value = 0.6;
  const level = context.createGain();
  level.gain.value = 0;
  source.connect(band).connect(level).connect(output);
  source.start();
  return level;
}
