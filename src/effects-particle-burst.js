// Reusable legacy debris emission stays independent of premium collection art.
export function createParticleBurst(emit, roadPoint) {
  return function burst(event, count, color, carSpeed, landing = false) {
    const [x, z] = roadPoint(event.distance, event.x);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      const spread = 2 + Math.random() * (landing ? 5 : 11);
      emit(x, landing ? 0.12 : (event.altitude ?? 0) + 0.65, -z,
        Math.cos(angle) * spread, landing ? 0.4 + Math.random() * 1.5 : 2 + Math.random() * 6,
        carSpeed * (landing ? 0.3 : 0.8) + Math.sin(angle) * spread,
        landing ? 0.6 : 0.08 + Math.random() * 0.18,
        0.4 + Math.random() * 0.65, color.length > 3 ? color[i % color.length] : color, landing ? 2 : 12, landing ? 2 : 0, landing ? 0.2 : 0.85);
    }
  };
}
