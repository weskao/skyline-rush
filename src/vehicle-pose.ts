import { Matrix4, Quaternion, Vector3 } from 'three';

// Compose visual motion relative to the road frame; Euler writes on the car
// would replace the track's pitch/bank and flip near perpendicular headings.
const basis = new Matrix4();
const right = new Vector3();
const up = new Vector3();
const back = new Vector3();
const leanAxis = new Vector3(0, 0, 1);
const pitchAxis = new Vector3(1, 0, 0);
const yawAxis = new Vector3(0, 1, 0);
const lean = new Quaternion();
const pitch = new Quaternion();
const yaw = new Quaternion();

export interface RoadPoseFrame {
  right: number[];
  up: number[];
  forward: number[];
}

export function orientCarOnRoad<T extends { quaternion: Quaternion }>(
  mesh: T, frame: RoadPoseFrame, bank = 0, pitchAngle = 0, driftYaw = 0,
): T {
  basis.makeBasis(right.fromArray(frame.right), up.fromArray(frame.up), back.fromArray(frame.forward).negate());
  mesh.quaternion.setFromRotationMatrix(basis);
  if (driftYaw) mesh.quaternion.multiply(yaw.setFromAxisAngle(yawAxis, driftYaw));
  if (pitchAngle) mesh.quaternion.multiply(pitch.setFromAxisAngle(pitchAxis, pitchAngle));
  if (bank) mesh.quaternion.multiply(lean.setFromAxisAngle(leanAxis, bank));
  return mesh;
}

const flat = new Quaternion().setFromAxisAngle(pitchAxis, -Math.PI / 2); // the shadow plane faces local +z
/** Lay the car's ground shadow on the road under it (3 cm up), tilted with the road and turned with its heading. */
export function placeGroundShadow<T extends { position: Vector3; quaternion: Quaternion }>(
  shadow: T, frame: RoadPoseFrame, carPosition: Vector3, altitude: number,
): T {
  up.fromArray(frame.up);
  shadow.position.copy(carPosition).addScaledVector(up, 0.03 - altitude);
  orientCarOnRoad(shadow, frame).quaternion.multiply(flat);
  return shadow;
}
