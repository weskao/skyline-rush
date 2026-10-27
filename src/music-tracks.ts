/** One synthesized song: chords are [bass root, three pad/arp tones]; layers enter at the listed bar. */
export interface MusicTrack {
  bpm: number;
  arp: number;
  bass: number[];
  enter: { bass: number; drums: number; lead: number };
  chords: number[][];
  lead: number[];
}

// 32-bar loops (intro ≈ 64 s, race ≈ 55 s, Sky Spiral ≈ 60 s, each World Tour course 56–70 s).
// Each chord is [bass root, three pad/arp tones]; lead is eight eighth-notes per chord bar (0 = rest).
// Layers enter at the listed bar so every pass builds up.
export const TRACKS: Record<string, MusicTrack> = {
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
  // Neon Downtown: F# minor, syncopated bass, dense arp. Opening pad is MIDI 61.
  neon: {
    bpm: 124, arp: 1, bass: [0, 3, 6, 8, 11, 14], enter: { bass: 0, drums: 2, lead: 4 },
    chords: [[42, 61, 68, 73], [38, 57, 66, 69], [47, 59, 66, 71], [49, 61, 68, 73], [42, 61, 68, 73], [45, 64, 69, 73], [40, 59, 68, 71], [49, 56, 61, 68]],
    lead: [
      73, 0, 76, 0, 73, 68, 0, 0, 71, 0, 73, 76, 0, 80, 0, 0, 68, 0, 0, 71, 73, 0, 76, 0, 75, 73, 0, 71, 0, 68, 0, 0,
      76, 0, 80, 0, 78, 76, 0, 73, 71, 0, 68, 0, 71, 73, 0, 0, 80, 0, 76, 0, 73, 0, 71, 68, 73, 0, 76, 80, 0, 0, 0, 73,
    ],
  },
  // Canyon Skyway: E major, wide leaps, open bass. Opening pad is MIDI 68.
  canyon: {
    bpm: 118, arp: 3, bass: [0, 8, 12], enter: { bass: 4, drums: 8, lead: 4 },
    chords: [[40, 68, 71, 76], [45, 64, 69, 76], [47, 66, 71, 78], [45, 64, 69, 73], [40, 68, 71, 76], [49, 64, 68, 73], [47, 66, 71, 78], [45, 64, 69, 76]],
    lead: [
      76, 0, 0, 80, 0, 0, 83, 0, 76, 0, 71, 0, 68, 0, 0, 0, 80, 0, 0, 83, 0, 76, 0, 71, 68, 0, 0, 71, 76, 0, 0, 80,
      71, 0, 76, 0, 0, 83, 0, 0, 80, 0, 76, 71, 0, 68, 0, 0, 83, 0, 0, 80, 0, 76, 0, 71, 76, 0, 0, 68, 0, 71, 0, 76,
    ],
  },
  // Aurora Pass: B minor, slow shimmer, sparse lead. Opening pad is MIDI 74.
  aurora: {
    bpm: 114, arp: 4, bass: [0, 12], enter: { bass: 8, drums: 16, lead: 8 },
    chords: [[47, 74, 78, 83], [43, 67, 74, 79], [50, 69, 74, 78], [40, 71, 76, 83], [47, 74, 78, 83], [45, 69, 76, 81], [43, 67, 74, 79], [42, 73, 78, 83]],
    lead: [
      83, 0, 0, 0, 86, 0, 0, 0, 78, 0, 0, 81, 0, 0, 76, 0, 74, 0, 0, 0, 78, 0, 81, 0, 76, 0, 0, 0, 71, 0, 0, 0,
      86, 0, 0, 83, 0, 0, 81, 0, 78, 0, 0, 74, 0, 0, 71, 0, 81, 0, 0, 0, 83, 0, 0, 78, 74, 0, 0, 76, 0, 0, 0, 83,
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
// New tracks reuse the established instrument layers but vary melody, harmony and pace by mode.
// 32 bars at these BPMs yield 51–69 second loops without downloading audio assets.
const MODE_THEMES: Record<string, [number, number]> = { checkpoint: [145, 5], stunt: [148, 7], gauntlet: [150, -3], cup: [138, 9], cruise: [112, 12] };
for (const [name, [bpm, shift]] of Object.entries(MODE_THEMES)) {
  TRACKS[name] = {
    ...TRACKS.race, bpm,
    arp: name === 'cruise' ? 4 : name === 'stunt' ? 1 : 2,
    bass: name === 'cruise' ? [0, 8] : [0, 4, 8, 12],
    enter: name === 'cruise' ? { bass: 4, drums: 12, lead: 8 } : { bass: 0, drums: 4, lead: 8 },
    chords: TRACKS.race.chords.map(chord => chord.map(note => note + shift)),
    lead: TRACKS.race.lead.map(note => note ? note + shift : 0),
  };
}
export const LOOP_STEPS = 32 * 16;
// Race tempo multiplier: 1 until the last 500 m, then a linear ramp to 1.15 at the finish.
export const sprintFactor = (distance: number, length: number): number => 1 + 0.15 * Math.min(1, Math.max(0, (distance - (length - 500)) / 500));
export const pitch = (note: number): number => 440 * 2 ** ((note - 69) / 12);
