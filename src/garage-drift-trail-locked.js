// The locked game retains the classic rubber marks and allocates no decorative trail.
const noop = () => {};
const lockedTrail = { setSkin: noop, tick: noop, lay: noop, place: noop, reset: noop, dispose: noop };
export const createDriftTrail = () => lockedTrail;
