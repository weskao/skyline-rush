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
