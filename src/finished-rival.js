import { carGap, syncCourseContact } from './course-race-step.ts';
import { bodiesShareHeight, vehicleContactSize } from './vehicle-contact-size.js';

const ROLL_DECEL = 18; // m/s² after a push; the parked driver keeps the brakes on
const CONTACT_CLEARANCE = 0.03;
export const FINISH_IMPACT_RETENTION = 0.78;

// A recorded finish ends AI driving. The physical body stays on the road.
export const isParkedRival = car => car.finishTime != null;

export function parkFinishedRival(rival) {
  rival.speed = rival.pace = rival.nitroTime = 0;
  rival.boosting = rival.thrusting = false;
}

export function coastFinishedRival(race, rival, dt) {
  if (rival.speed === 0 && rival.altitude === 0) return;
  const nextSpeed = Math.max(0, rival.speed - ROLL_DECEL * dt);
  const rollingTime = Math.min(dt, rival.speed / ROLL_DECEL);
  rival.distance += (rival.speed + nextSpeed) * rollingTime / 2;
  rival.speed = rival.pace = nextSpeed;
  // A rival that crossed while flying settles onto the run-out with its jets off.
  rival.verticalSpeed = rival.altitude > 0 ? (rival.verticalSpeed ?? 0) - 9.8 * dt : 0;
  rival.altitude = Math.max(0, rival.altitude + rival.verticalSpeed * dt);
  if (rival.altitude === 0) rival.verticalSpeed = 0;
  if (race.course) syncCourseContact(race, rival);
}

// Move the receiver out of the incoming bumper's sweep. A stopped rival yields
// even during collision grace. The moving driver's progress is never rewound.
export function pushFinishedRival(race, mover, parked, previousDistance) {
  const closingSpeed = (mover.pace ?? mover.speed) - parked.speed;
  if (closingSpeed <= 0 || !bodiesShareHeight(mover, parked)) return 0;
  const moverBody = vehicleContactSize(race, mover), parkedBody = vehicleContactSize(race, parked);
  if (Math.abs(mover.x - parked.x) >= moverBody.halfWidth + parkedBody.halfWidth) return 0;
  const gap = carGap(race, mover, parked), front = moverBody.front + parkedBody.rear;
  if (gap === null || gap >= front || gap + mover.distance - previousDistance < 0) return 0;
  parked.distance += front + CONTACT_CLEARANCE - gap;
  parked.speed += closingSpeed * 0.5;
  parked.pace = parked.speed;
  if (race.course) syncCourseContact(race, parked);
  return Math.min(1, Math.max(0.25, closingSpeed / 70));
}
