import { PMREMGenerator, type WebGLRenderTarget, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** The shared neutral studio environment (every track, and Coast on Low): prefiltered once, caller owns the target. */
export function createRoomEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const generator = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const target = generator.fromScene(room, 0.04);
  room.dispose();
  generator.dispose();
  return target;
}
