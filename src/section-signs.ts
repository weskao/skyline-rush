export const SECTION_SIGN_LABELS = Object.freeze({
 tunnel: 'TUNNEL / 4 M CEILING',
 gap: 'BROKEN BRIDGE / FLY',
 crosswind: 'CROSSWIND / STEER',
 ice: 'ICE / STEER EARLY',
 uphill: 'UPHILL / SAVE CHARGE',
 shortcut: 'SHORTCUT / FLY HIGH',
 launch: 'LAUNCH RAMP / BOOST',
 spiral: '360 HELIX / CLIMB',
 'boost-tunnel': 'HYPERDRIVE / SPEED + NITRO',
});
// Unknown future sections use a real material, never undefined: an undefined
// Three.js Mesh material throws from WebGLRenderer and stops requestAnimationFrame.
export const sectionSignKey = (type: string): keyof typeof SECTION_SIGN_LABELS =>
  type in SECTION_SIGN_LABELS ? type as keyof typeof SECTION_SIGN_LABELS : 'gap';
