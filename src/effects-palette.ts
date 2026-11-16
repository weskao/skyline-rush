// Effect colours (HDR RGB, values above 1 feed the bloom) and the bonus-pad → ring look table used by effects.js.
type Rgb = [number, number, number];

export const orange: Rgb = [2.5, 0.85, 0.15], mist: Rgb = [0.58, 0.64, 0.68], gas: Rgb = [0.8, 0.87, 0.92];
export const blue: Rgb = [0.15, 0.8, 2.5], gold: Rgb = [2.5, 1.8, 0.15], purple: Rgb = [1.2, 0.3, 2.5], red: Rgb = [2.5, 0.1, 0.15];
export const spectrum: Rgb[] = [red, orange, gold, [0.15, 2, 0.65], blue, purple];
export const pickupColors: Record<string, Rgb | Rgb[]> = { cell: blue, can: orange, tank: gold, overcharge: spectrum };
export const bonusStyles: Record<string, string> = { 'speed-pad': 'slipstream', 'air-pad': 'charge', 'recovery-pad': 'nitro', 'score-pad': 'risk', emp: 'mystery' };
export const ringColors: Record<string, Rgb | Rgb[]> = { charge: [0.1, 1.8, 2.5], nitro: gold, slipstream: purple, risk: red, mystery: spectrum };
