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

export function orientCarOnRoad(mesh, frame, bank = 0, pitchAngle = 0, driftYaw = 0) {
  basis.makeBasis(right.fromArray(frame.right), up.fromArray(frame.up), back.fromArray(frame.forward).negate());
  mesh.quaternion.setFromRotationMatrix(basis);
  if (driftYaw) mesh.quaternion.multiply(yaw.setFromAxisAngle(yawAxis, driftYaw));
  if (pitchAngle) mesh.quaternion.multiply(pitch.setFromAxisAngle(pitchAxis, pitchAngle));
  if (bank) mesh.quaternion.multiply(lean.setFromAxisAngle(leanAxis, bank));
  return mesh;
}
