/** Race clock: MM:SS.hh. */
export const timeString = (seconds: number): string =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
