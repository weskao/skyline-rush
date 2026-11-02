// Paint catalog; `stars` is the total best-run stars (summed over tracks) that unlocks it. Visual only.
export interface PaintPreset { name: string; paint: string; light: [number, number, number]; stars: number; metalness: number; roughness: number }
export const PAINTS: Record<string, PaintPreset> = {
  pearl: { name: 'Pearl', paint: '#e6e9e7', light: [2.2, 0.02, 0.05], stars: 0, metalness: 0.56, roughness: 0.19 },
  // Rarer real-world car colours come early; the most wanted (blue, black) are the long chase.
  aurora: { name: 'Aurora', paint: '#a9c5a0', light: [1.8, 0.15, 2.2], stars: 3, metalness: 0.72, roughness: 0.16 },
  glacier: { name: 'Glacier', paint: '#72bbdb', light: [0.15, 1.8, 2.2], stars: 6, metalness: 0.68, roughness: 0.18 },
  coral: { name: 'Coral', paint: '#ef765f', light: [2.2, 0.6, 0.04], stars: 10, metalness: 0.62, roughness: 0.18 },
  cobalt: { name: 'Cobalt', paint: '#2456c4', light: [1.5, 1.9, 2.4], stars: 16, metalness: 0.78, roughness: 0.16 },
  obsidian: { name: 'Obsidian', paint: '#1b1e23', light: [2.4, 0.02, 0.05], stars: 24, metalness: 0.82, roughness: 0.14 },
};
export const ownedPaints = (totalStars: number): string[] => Object.keys(PAINTS).filter(id => PAINTS[id].stars <= (totalStars || 0));
