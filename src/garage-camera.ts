/** Studio camera is an event-driven snapshot; only the renderer reads it each frame. */
export interface GarageCamera {
  yaw: number;
  pitch: number;
  zoom: number;
  autoRotate: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const defaultGarageCamera = (): GarageCamera => ({ yaw: .7, pitch: .27, zoom: 1, autoRotate: true });

export function garagePreset(view: string): GarageCamera {
  const angles: Record<string, [number, number]> = {
    front: [Math.PI, .2], rear: [0, .2], side: [Math.PI / 2, .2],
    top: [0, 1.18], cinematic: [.7, .27],
  };
  const pose = angles[view];
  return pose ? { yaw: pose[0], pitch: pose[1], zoom: 1, autoRotate: false } : defaultGarageCamera();
}

export function dragGarageCamera(state: GarageCamera, dx: number, dy: number): GarageCamera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return state;
  return { ...state, yaw: state.yaw + dx * .008, pitch: clamp(state.pitch - dy * .006, .08, 1.18), autoRotate: false };
}
export function zoomGarageCamera(state: GarageCamera, multiplier: number): GarageCamera {
  return Number.isFinite(multiplier) && multiplier > 0
    ? { ...state, zoom: clamp(state.zoom * multiplier, .75, 1.6) } : state;
}
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
