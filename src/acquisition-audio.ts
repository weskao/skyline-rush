// Original reveal score and Foley, rendered in short stereo sections keyed to the visual cuts.
const SAMPLE_RATE = 24000;
const TAU = 2 * Math.PI;
type Timbre = 'brass' | 'motor' | 'air' | 'impact' | 'metal' | 'tire';
type CueLayer = readonly [timbre: Timbre, at: number, duration: number, fromHz: number, toHz: number,
  level: number, attack: number, panFrom?: number, panTo?: number];
type Score = { length: number; layers: readonly CueLayer[] };
const SCORES: Readonly<Record<string, Score>> = {
  'acquisition-car': { length: 1.18, layers: [
    ['impact', 0, .48, 112, 44, .19, .012],
    ['metal', .05, .36, 390, 343, .075, .007, -.35],
    ['motor', .08, 1.02, 34, 54, .18, .12, -.05],
    ['brass', .16, 1, 73.42, 73.42, .10, .18, .25],
    ['air', .22, .82, 290, 850, .12, .27, .2, -.25],
  ] },
  'acquisition-car-signature': { length: 1.64, layers: [
    ['impact', 0, .72, 125, 41, .23, .008],
    ['motor', 0, 1.62, 45, 94, .24, .16, -.25, .20],
    ['air', .02, 1.5, 580, 780, .13, .31, -.43, .32],
    ['brass', .15, 1.47, 73.42, 73.42, .14, .18, -.25],
    ['brass', .47, 1.11, 110, 110, .10, .20, .35],
    ['impact', .78, .48, 101, 49, .14, .009],
    ['brass', .81, .77, 146.83, 146.83, .073, .12, .15],
  ] },
  'acquisition-car-profile': { length: 1.59, layers: [
    ['motor', .01, 1.34, 128, 55, .27, .39, -.76, .78],
    ['air', 0, 1.28, 1310, 550, .29, .34, -.92, .86],
    ['brass', 0, 1.59, 58.27, 58.27, .15, .065, -.21],
    ['brass', .1, 1.42, 174.61, 174.61, .09, .25, .46],
    ['impact', .38, .49, 106, 46, .18, .008],
    ['metal', .72, .41, 262, 235, .063, .015, .64, .22],
    ['impact', 1.03, .44, 109, 45, .15, .008],
  ] },
  'acquisition-car-thrusters': { length: 1.59, layers: [
    ['motor', 0, 1.59, 48, 146, .25, .22, .11, -.11],
    ['impact', 0, .69, 151, 43, .26, .007],
    ['air', .09, 1.5, 560, 2210, .29, .79, -.56, .61],
    ['brass', .11, 1.46, 55, 55, .14, .24, -.30],
    ['brass', .20, 1.37, 138.59, 138.59, .11, .40, .44],
    ['metal', .53, .55, 231, 146, .09, .022, -.38],
    ['metal', .92, .55, 298, 156, .10, .024, .37],
    ['impact', 1.10, .39, 135, 53, .16, .006],
  ] },
  'acquisition-car-hero': { length: 1.87, layers: [
    ['impact', 0, 1.04, 150, 39, .28, .008],
    ['air', .02, 1.4, 1200, 390, .24, .08, .29, -.28],
    ['motor', .04, .84, 79, 36, .17, .04],
    ['brass', .035, 1.82, 73.42, 73.42, .19, .10, -.19],
    ['brass', .07, 1.79, 110, 110, .15, .13, .38],
    ['brass', .09, 1.76, 146.83, 146.83, .119, .19, -.34],
    ['brass', .12, 1.73, 174.61, 174.61, .101, .20, .25],
    ['brass', .14, 1.70, 220, 220, .079, .20, -.47],
    ['brass', .24, 1.61, 329.63, 329.63, .073, .25, .51],
    ['metal', .21, 1.26, 440, 440, .10, .03, -.56, .45],
  ] },
  'acquisition-equipment': { length: .85, layers: [
    ['metal', 0, .42, 280, 147, .16, .007, -.33, .32],
    ['impact', .16, .55, 129, 49, .17, .008],
    ['brass', .18, .65, 146.83, 146.83, .11, .05, .18],
  ] },
  'acquisition-equipment-thruster': { length: 1.06, layers: [
    ['impact', .02, .69, 125, 40, .20, .01], ['motor', .08, .97, 41, 117, .26, .14, -.35, .36],
    ['metal', .09, .52, 210, 133, .12, .008, .4], ['air', .16, .88, 510, 1160, .18, .23],
  ] },
  'acquisition-equipment-airflow': { length: 1.06, layers: [
    ['air', 0, 1.04, 835, 500, .31, .29, -.83, .81], ['brass', .11, .88, 220, 220, .13, .19, .44, -.21],
    ['metal', .23, .75, 329, 312, .09, .07, .48],
  ] },
  'acquisition-equipment-nitro-trail': { length: 1.06, layers: [
    ['impact', 0, .53, 182, 54, .25, .007], ['air', .12, .91, 510, 2190, .28, .09, -.62, .51],
    ['motor', .08, .95, 57, 140, .19, .12, .21, -.23], ['metal', .39, .59, 370, 321, .074, .012, .37],
  ] },
  'acquisition-equipment-launch-flare': { length: 1.06, layers: [
    ['metal', 0, .37, 274, 197, .14, .008, .36],
    ['impact', .16, .89, 171, 43, .31, .008], ['air', .17, .87, 1390, 430, .26, .04, .62, -.47],
    ['brass', .19, .85, 110, 110, .13, .07, -.35],
  ] },
  'acquisition-equipment-drift-trail': { length: 1.06, layers: [
    ['tire', .03, 1.00, 630, 286, .31, .13, .82, -.74], ['motor', .07, .91, 85, 49, .15, .11, .31, -.35],
    ['impact', .27, .49, 113, 51, .16, .007], ['metal', .46, .45, 312, 266, .067, .018, -.48],
  ] },
  'acquisition-track': { length: .98, layers: [
    ['air', .02, .92, 530, 1270, .22, .27, -.7, .69], ['impact', .19, .63, 132, 47, .20, .008],
    ['brass', .18, .77, 73.42, 73.42, .12, .09],
  ] },
  'acquisition-paint': { length: .73, layers: [
    ['air', 0, .68, 820, 2180, .21, .21, -.7, .72], ['metal', .13, .57, 440, 465, .093, .065, .36, -.35],
  ] },
  'acquisition-clothing': { length: .73, layers: [
    ['air', 0, .64, 672, 530, .19, .11, -.66, .65], ['metal', .14, .57, 298, 290, .087, .035, .38],
  ] },
  'acquisition-item': { length: .76, layers: [
    ['metal', 0, .42, 334, 229, .16, .006, -.46], ['impact', .11, .58, 119, 46, .18, .009, .32],
  ] },
  'acquisition-medal': { length: 1.14, layers: [
    ['impact', 0, .69, 136, 44, .23, .008], ['brass', .10, 1.02, 146.83, 146.83, .15, .10, -.31],
    ['brass', .25, .87, 220, 220, .11, .15, .44], ['metal', .24, .87, 437, 440, .10, .10, -.34, .34],
  ] },
  'acquisition-currency': { length: .58, layers: [
    ['metal', .0, .40, 691, 648, .10, .006, -.43], ['metal', .10, .45, 854, 812, .087, .007, .43],
  ] },
};

function mixLayer(left: Float32Array, right: Float32Array, layer: CueLayer): void {
  const [timbre, at, duration, from, to, level, attack, panFrom = 0, panTo = panFrom] = layer;
  const start = Math.round(at * SAMPLE_RATE);
  const count = Math.min(left.length - start, Math.floor(duration * SAMPLE_RATE));
  const pitchStep = (to / from) ** (1 / (duration * SAMPLE_RATE));
  let phase = 0, pitch = from, lowNoise = 0, seed = 1337 + Math.round(from * 100);
  for (let index = 0; index < count; index++) {
    const t = index / SAMPLE_RATE, progress = t / duration;
    phase += pitch * TAU / SAMPLE_RATE;
    pitch *= pitchStep;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    lowNoise += (noise - lowNoise) * Math.min(.8, pitch * TAU / SAMPLE_RATE);
    const body = Math.sin(phase);
    let sample = body;
    switch (timbre) {
      case 'motor': {
        const pulse = .72 + .28 * Math.sin(phase * .5 + Math.sin(TAU * 5 * t));
        sample = pulse * Math.tanh(body * .86 + Math.sin(phase * 2.01) * .51 +
          Math.sin(phase * 3.98) * .29 + Math.sin(phase * 6.03) * .16) + lowNoise * .57;
        break;
      }
      case 'brass':
        sample = .61 * body + .29 * Math.sin(phase * 1.006) + .23 * Math.sin(phase * 2.009) +
          .14 * Math.sin(phase * 3 - t * 4) + .082 * Math.sin(phase * 4.997);
        break;
      case 'air': sample = lowNoise * 2.5 + noise * .1; break;
      case 'impact': sample = body * .76 + Math.sin(phase * 1.98) * .21 + lowNoise * .49; break;
      case 'metal': sample = .58 * body + .28 * Math.sin(phase * 2.73) + .20 * Math.sin(phase * 4.31); break;
      case 'tire': sample = (lowNoise * 2.1 + noise * .25) * (.70 + .30 * Math.sin(phase * .20)) + body * .17; break;
    }
    const tail = 1 - progress;
    const decay = timbre === 'impact' ? tail ** 4 : timbre === 'metal' ? tail ** 3 : tail;
    const envelope = Math.min(1, t / attack) * decay;
    const pan = panFrom + (panTo - panFrom) * progress;
    const value = sample * envelope * level;
    const i = start + index;
    left[i] = left[i]! + value * Math.sqrt((1 - pan) / 2);
    right[i] = right[i]! + value * Math.sqrt((1 + pan) / 2);
  }
}

export function acquisitionAudioBuffer(context: BaseAudioContext, name: string): AudioBuffer | undefined {
  const score = Object.hasOwn(SCORES, name) ? SCORES[name] : undefined;
  if (!score) return;
  const length = Math.ceil(score.length * SAMPLE_RATE);
  const stereo = context.createBuffer(2, length, SAMPLE_RATE);
  const left = stereo.getChannelData(0), right = stereo.getChannelData(1);
  for (const layer of score.layers) mixLayer(left, right, layer);
  // Short cross-feed reflections give the showroom depth without starting another audio voice.
  for (let i = length - 1; i >= 0; i--) {
    const wetLeft = .23 * (right[i - 1056] ?? 0) + .09 * (left[i - 2771] ?? 0);
    const wetRight = .23 * (left[i - 1512] ?? 0) + .09 * (right[i - 2771] ?? 0);
    const tail = Math.min(1, (length - 1 - i) / 1200);
    left[i] = .56 * Math.tanh((left[i]! + wetLeft) * 1.6) * tail;
    right[i] = .56 * Math.tanh((right[i]! + wetRight) * 1.6) * tail;
  }
  return stereo;
}
