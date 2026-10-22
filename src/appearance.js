// Paint catalog; `stars` is the total best-run stars (summed over tracks) that unlocks it. Visual only.
export const PAINTS = {
  pearl: { name: 'Pearl', paint: '#e6e9e7', light: [2.2, 0.02, 0.05], stars: 0 },
  // Rarer real-world car colours come early; the most wanted (blue, black) are the long chase.
  aurora: { name: 'Aurora', paint: '#a9c5a0', light: [1.8, 0.15, 2.2], stars: 3 },
  glacier: { name: 'Glacier', paint: '#72bbdb', light: [0.15, 1.8, 2.2], stars: 6 },
  coral: { name: 'Coral', paint: '#ef765f', light: [2.2, 0.6, 0.04], stars: 10 },
  cobalt: { name: 'Cobalt', paint: '#2456c4', light: [1.5, 1.9, 2.4], stars: 16 },
  obsidian: { name: 'Obsidian', paint: '#1b1e23', light: [2.4, 0.02, 0.05], stars: 24 },
};
export const ownedPaints = totalStars => Object.keys(PAINTS).filter(id => PAINTS[id].stars <= (totalStars || 0));
