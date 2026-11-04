/** Studio camera is an event-driven snapshot; only the renderer reads it each frame. */
export interface GarageCamera {
  yaw: number;
  pitch: number;
  zoom: number;
  autoRotate: boolean;
  mode: 'ground' | 'flight';
  /** Roadster airbrake wing: true = opened to its braking angle, false = stowed. */
  wing: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
/** Farthest Studio pull-back: far enough to see the whole exhaust jet and NITRO trail. */
export const GARAGE_MAX_ZOOM = 2.4;
/** Longest Studio exhaust past the rear: NITRO trail streaks 6 + 8 × .85 ≈ 12.8 m, max jet ≈ 11.75 m. */
export const GARAGE_EXHAUST_REACH = 13;
export const defaultGarageCamera = (): GarageCamera => ({ yaw: .7, pitch: .27, zoom: 1, autoRotate: true, mode: 'ground', wing: false });

export function garagePreset(view: string): GarageCamera {
  const angles: Record<string, [number, number]> = {
    front: [Math.PI, .2], rear: [0, .2], side: [Math.PI / 2, .2],
    top: [0, 1.18], cinematic: [.7, .27],
  };
  const pose = angles[view];
  return pose ? { yaw: pose[0], pitch: pose[1], zoom: 1, autoRotate: false, mode: 'ground', wing: false } : defaultGarageCamera();
}

export function dragGarageCamera(state: GarageCamera, dx: number, dy: number): GarageCamera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return state;
  return { ...state, yaw: state.yaw + dx * .008, pitch: clamp(state.pitch - dy * .006, .08, 1.18), autoRotate: false };
}
export function zoomGarageCamera(state: GarageCamera, multiplier: number): GarageCamera {
  return Number.isFinite(multiplier) && multiplier > 0
    ? { ...state, zoom: clamp(state.zoom * multiplier, .75, GARAGE_MAX_ZOOM) } : state;
}
export const toggleGarageWing = (state: GarageCamera): GarageCamera => ({ ...state, wing: !state.wing });
export const toggleGarageOrbit = (state: GarageCamera): GarageCamera => ({ ...state, autoRotate: !state.autoRotate });

export const releaseGarageOrbit = (camera: GarageCamera, paused: boolean): GarageCamera =>
  ({ ...camera, autoRotate: !paused });

/** Fit the entire car's bounding sphere in both FOV axes, including narrow phones. */
export function garageFittedDistance(aspect: number, zoom: number, radius: number): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? clamp(aspect, .45, 2.5) : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? clamp(zoom, .75, 1.6) : 1;
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 3.2;
  const halfFov = Math.atan(Math.tan(49 * Math.PI / 360) * Math.min(1, safeAspect));
  const fitted = safeRadius * 1.1 / Math.sin(halfFov);
  return Math.max(fitted, Math.max(10, 8.5 / Math.max(.65, Math.min(1, safeAspect))) * safeZoom);
}


/** Change display pose without losing the player's selected camera angle. */
export const setGarageMode = (camera: GarageCamera, mode: GarageCamera['mode']): GarageCamera =>
  ({ ...camera, mode });

/** Frame projected vehicle bounds, not its oversized bounding sphere. */
export function garageFramedDistance(
  aspect: number, zoom: number, half: { x: number; y: number; z: number }, yaw: number, pitch: number,
): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? clamp(aspect, .45, 2.5) : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? clamp(zoom, .75, GARAGE_MAX_ZOOM) : 1;
  // Past the default view, grow the framed length by the exhaust reach on BOTH ends, so the
  // car stays centred and front and rear views share one pull-back limit.
  const z = half.z + GARAGE_EXHAUST_REACH * clamp((safeZoom - 1) / (GARAGE_MAX_ZOOM - 1), 0, 1);
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  const width = Math.abs(cy) * half.x + Math.abs(sy) * z;
  const height = Math.abs(sy * sp) * half.x + Math.abs(cp) * half.y + Math.abs(cy * sp) * z;
  const depth = Math.abs(sy * cp) * half.x + Math.abs(sp) * half.y + Math.abs(cy * cp) * z;
  const vTan = Math.tan(49 * Math.PI / 360);
  const fit = Math.max(width / (vTan * safeAspect), height / vTan);
  return Math.max(4, depth + fit * (1.12 + (Math.min(safeZoom, 1.6) - .75) * .45));
}
