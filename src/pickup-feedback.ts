// Player pickup feedback outside the 3D effect: haptic pulse and camera push per tier. Every channel keeps the tier
// order cell < can < tank < overcharge. Cells give neither: shortcut reward lines put one every 12-25 m.

/** Haptic pulse in ms. Single pulses only: iOS plays one fixed tick per segment (haptics.ts). */
export const PICKUP_HAPTIC_MS: Readonly<Record<string, number>> = { cell: 0, can: 9, tank: 14, overcharge: 20 };
/** Share of the NITRO/BOOST ignition kick (race-camera.ts rigKick). */
export const PICKUP_KICK_SHARE: Readonly<Record<string, number>> = { cell: 0, can: 0.2, tank: 0.35, overcharge: 0.5 };
