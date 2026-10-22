// Lightweight local-only Free Drive telemetry; never changes career scoring.
export const createPracticeStats = () => ({
  travelled: 0, maxSpeed: 0, airTime: 0, nearMisses: 0, tricks: 0, lastTrickTime: -1,
});

export function samplePractice(stats, car, progress, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1 || !car) return stats;
  const speed = Number.isFinite(car.speed) ? Math.max(0, car.speed) : 0;
  stats.travelled += Math.min(Math.max(0, Number.isFinite(progress) ? progress : 0), speed * dt);
  stats.maxSpeed = Math.max(stats.maxSpeed, speed);
  if (speed >= 18 && car.altitude > 0.25) stats.airTime += dt;
  stats.nearMisses = Math.max(stats.nearMisses, car.nearMisses || 0);
  const trickTime = car.trickPayout?.time;
  if (Number.isFinite(trickTime) && trickTime > stats.lastTrickTime) {
    stats.tricks++;
    stats.lastTrickTime = trickTime;
  }
  return stats;
}
