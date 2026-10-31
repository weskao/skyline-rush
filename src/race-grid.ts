// Stable field IDs are shared by simulation, results, saved Cup heats and grid ordering.
export const RACE_DRIVER_IDS = Object.freeze(['YOU', 'NOVA', 'ORBIT', 'APEX', 'VEGA', 'PULSE', 'COMET', 'RIFT'] as const);

export type DriverId = typeof RACE_DRIVER_IDS[number];
export interface GridSlot { id: DriverId; x: number; distance: number; position: number }

/** Pole row is furthest down the track; two centre lanes provide clearance on all tracks. */
export function startingGrid(rivals: readonly string[], nextOrder?: readonly string[]): GridSlot[] {
  const ids = ['YOU', ...rivals];
  if (ids.length < 1 || ids.length > 8 || new Set(ids).size !== ids.length ||
    ids.some(id => !RACE_DRIVER_IDS.includes(id as DriverId)))
    throw new RangeError('Invalid grid drivers');
  const baseline = [...rivals, 'YOU'];
  const order = nextOrder ?? baseline;
  if (order.length !== ids.length || new Set(order).size !== ids.length || order.some(id => !ids.includes(id)))
    throw new RangeError('Invalid grid order');
  const rows = Math.ceil(ids.length / 2);
  return order.map((id, index) => ({
    id: id as DriverId,
    position: index + 1,
    x: index % 2 === 0 ? -2.5 : 2.5,
    distance: (rows - 1 - Math.floor(index / 2)) * 12,
  }));
}

export function reversedGrid(order: readonly string[]): DriverId[] {
  if (order.length < 2 || order.length > 8 || !order.includes('YOU') ||
    new Set(order).size !== order.length || order.some(id => !RACE_DRIVER_IDS.includes(id as DriverId)))
    throw new RangeError('Invalid previous finish order');
  return [...order].reverse() as DriverId[];
}
