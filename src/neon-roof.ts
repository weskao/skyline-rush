// The opening railway is solid: inside, the ordinary tunnel ceiling (game.js roofHit); on top, the 7.2 m roof
// between two rail bridges (rail_portal, pivots 698 and 902), each a 9.24 m deck behind a railing that tops out
// at 10.6 m. Under the railing every bridge face is a wall; above it the normal 12 m flight maximum applies.
// Fallback meshes draw the roof at 4.5 m. Physics is independent of graphics quality or asset readiness.
export const NEON_ROOF_HEIGHT = 7.2;
const FROM = 690, TO = 910, MAX_FLIGHT = 12;
const DECK = 9.24, RAILING_TOP = 10.6, ENTRY_INNER = 705.8, EXIT_INNER = 894.2; // girder faces: pivot ± 7.8 m
const FACES = [FROM, ENTRY_INNER, EXIT_INNER, TO], REST = .05;
const INSIDE_TOP = 4 - 1.2; // TUNNEL_CEILING - CAR_HEIGHT; not imported, game.js imports this module
const inRoof = (distance: number) => distance >= FROM && distance < TO;
const surface = (distance: number) => distance >= ENTRY_INNER && distance < EXIT_INNER ? NEON_ROOF_HEIGHT : DECK;
type RoofCar = { distance: number; altitude: number; verticalSpeed: number };

// Over the roof (or rising past it at the portal), so the tunnel's ceiling does not apply.
export function overNeonRoof(trackId: string, car: Pick<RoofCar, 'distance' | 'altitude'>, previousAltitude: number): boolean {
  return trackId === 'neon' && inRoof(car.distance) && Math.max(previousAltitude, car.altitude) >= NEON_ROOF_HEIGHT;
}

export function onNeonRoof(trackId: string, car: Pick<RoofCar, 'distance' | 'altitude'>): boolean {
  return trackId === 'neon' && inRoof(car.distance) && car.altitude === surface(car.distance);
}

// Leave descent speed intact until the normal touchdown event consumes it.
export function supportNeonRoof(trackId: string, car: RoofCar, previousAltitude: number): boolean {
  if (trackId !== 'neon' || !inRoof(car.distance)) return false;
  const top = surface(car.distance);
  if (previousAltitude < top || car.altitude > top || car.verticalSpeed > 0) return false;
  car.altitude = top;
  return true;
}

// A bridge face between the tunnel ceiling and the railing top stops the car at the face. True only on
// arrival: a car resting against the face (throttle held) is held there without another hit. Its speed
// stays at most the FLY thrust minimum (game.js: speed >= 18), so it can still climb out over the railing.
const HELD_SPEED = 18;
export function blockNeonPortal(trackId: string, car: Pick<RoofCar, 'distance' | 'altitude'> & { speed: number }, previousDistance: number): boolean {
  if (trackId !== 'neon' || car.altitude <= INSIDE_TOP || car.altitude >= RAILING_TOP) return false;
  const face = FACES.find(f => previousDistance < f && car.distance >= f);
  if (face === undefined) return false;
  car.distance = face - REST;
  if (previousDistance !== face - REST) return true;
  car.speed = Math.min(car.speed, HELD_SPEED);
  return false;
}

// Render-only: the fallback roof sits at 4.5 m, so blend the car down to it near the roof; the detailed
// meshes match physics and draw the true altitude. The ground and 12 m flight maximum stay fixed.
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export function neonRoofVisualAltitude(distance: number, altitude: number, procedural: boolean): number {
  // A car inside (at or under the tunnel ceiling) is drawn at its true altitude on every tier.
  if (!procedural || altitude <= INSIDE_TOP || altitude >= MAX_FLIGHT || distance < FROM - 8 || distance >= TO + 8) return altitude;
  const edge = Math.min(clamp01((distance - FROM + 8) / 8), clamp01((TO + 8 - distance) / 8));
  const weight = altitude <= NEON_ROOF_HEIGHT ? (altitude - INSIDE_TOP) / (NEON_ROOF_HEIGHT - INSIDE_TOP)
    : (MAX_FLIGHT - altitude) / (MAX_FLIGHT - NEON_ROOF_HEIGHT);
  return altitude + (4.5 - NEON_ROOF_HEIGHT) * edge * weight;
}
