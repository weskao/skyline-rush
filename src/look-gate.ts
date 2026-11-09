// Owner decision 2026-11-09: develop keeps its look; the Phase 3 visual pass (Coast HDRI/PBR road/scenery GLB/wet
// mirror, board effects, contact shadow, Ultra tier) is opt-in behind `?look=3d`, like the car behind `?model=roadster`.
// Default-on is deferred by the owner. Without the gate every Phase 3 branch takes its Low/develop path.
export const phase3Look = (search: string): boolean => new URLSearchParams(search).get('look') === '3d';

let on = phase3Look(globalThis.location?.search ?? ''); // read once per page: per-frame callers pay a variable read
export const look3d = (): boolean => on;
/** Tests only: as if the page had been opened with or without `?look=3d`. */
export const setLook3d = (value: boolean): void => { on = value; };
