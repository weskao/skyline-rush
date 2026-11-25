// The opening railway is a one-way landing surface, not a flight ceiling.
// Authored roof: 7.2 m (rail_segment); fallback: 4.5 m; portal rail top: 9.24 m.
// Physics is independent of graphics quality or asset readiness.
export const NEON_ROOF_HEIGHT = 7.2;
const FROM = 690, TO = 910, MAX_FLIGHT = 12;
const inRoof = (distance: number) => distance >= FROM && distance < TO;
type RoofCar = { distance: number; altitude: number; verticalSpeed: number };

export function onNeonRoof(trackId: string, car: Pick<RoofCar, 'distance' | 'altitude'>): boolean {
  return trackId === 'neon' && inRoof(car.distance) && car.altitude === NEON_ROOF_HEIGHT;
}

// Leave descent speed intact until the normal touchdown event consumes it.
export function supportNeonRoof(trackId: string, car: RoofCar, previousAltitude: number): boolean {
  if (trackId !== 'neon' || !inRoof(car.distance) || previousAltitude < NEON_ROOF_HEIGHT ||
      car.altitude > NEON_ROOF_HEIGHT || car.verticalSpeed > 0) return false;
  car.altitude = NEON_ROOF_HEIGHT;
  return true;
}

// Render-only conversion between the original low/detail meshes; the ground
// and 12 m flight maximum stay fixed. Blend at the portal joints and edges.
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export function neonRoofVisualAltitude(distance: number, altitude: number, procedural: boolean): number {
  if (altitude <= 0 || altitude >= MAX_FLIGHT || distance < FROM - 8 || distance >= TO + 8) return altitude;
  const edge = Math.min(clamp01((distance - FROM + 8) / 8), clamp01((TO + 8 - distance) / 8));
  const portal = Math.max(clamp01((710 - distance) / 4), clamp01((distance - 890) / 4));
  const visualTop = procedural ? 4.5 : NEON_ROOF_HEIGHT + (9.24 - NEON_ROOF_HEIGHT) * portal;
  const weight = altitude <= NEON_ROOF_HEIGHT ? altitude / NEON_ROOF_HEIGHT : (MAX_FLIGHT - altitude) / (MAX_FLIGHT - NEON_ROOF_HEIGHT);
  return altitude + (visualTop - NEON_ROOF_HEIGHT) * edge * weight;
}
