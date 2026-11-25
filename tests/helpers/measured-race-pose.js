import { trackFrame, trackPoint } from '../../src/track-paths.ts';

// Measured routes do not expose race.course; use the same authored road frame, not a zero-lateral assumption.
export async function measuredRacePoseError(page) {
  const { trackId, distance, x, altitude, span, actual } = await page.evaluate(() => {
    const race = window.gameplay.race, mesh = window.gameScene.player;
    const distance = mesh.userData.roadDistance;
    const motion = mesh.userData.renderMotion;
    const pose = motion?.distance === distance ? motion : race.player;
    return { trackId: race.trackId, distance, x: pose.x, altitude: pose.altitude ?? 0, span: !!mesh.userData.span, actual: mesh.position.toArray() };
  });
  const frame = trackFrame(trackId, distance, false, span), origin = trackPoint(trackId, distance);
  const expected = [frame.point.x - origin.x + frame.right[0] * x + frame.up[0] * altitude,
    frame.point.z - origin.z + frame.right[2] * x + frame.up[2] * altitude];
  return Math.hypot(actual[0] - expected[0], actual[2] - expected[1]);
}
