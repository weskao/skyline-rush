// Typed progression surface; frame loops/Three.js rendering remain documented JS islands.
export { HISTORY_KEY, UNLOCKED_KEY, loadUnlocks, loadHistory, recordRace } from './history-classic.ts';
export { MODE_HISTORY_KEY, MODE_BESTS_KEY, STUNT_BESTS_KEY, validModeHistoryRun,
  loadModeHistory, loadModeBest, loadStuntBest, recordModeRace } from './history-mode.ts';
export { BEST_KEY, LEGACY_BEST_KEY, loadBests, recordBest, MEDALS, MEDALS_KEY,
  medalsFor, loadMedals, recordMedals, STARS_KEY, loadStars, recordStars, loadPaint, savePaint } from './history-achievements.ts';
export { loadGhost, saveGhost, loadModeGhost, saveModeGhost } from './history-ghost.ts';
export { DAILY_KEY, validDaily, loadDaily, recordDaily } from './history-daily.ts';
export { validStars, starTotal, dailyBoard, careerStats } from './history-stats.ts';
export { HISTORY_LIMIT } from './history-policy.ts';
