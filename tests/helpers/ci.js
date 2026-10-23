// CPU-only CI renders WebGL several times slower than a GPU, and the game clamps each frame's step (src/main.js),
// so game time falls behind the wall clock there. Every wall-clock budget in the browser suite scales by this factor.
export const slow = process.env.CI ? 3 : 1;
export const ciTimeout = ms => ms * slow;
