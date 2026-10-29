import type { CircuitState } from './circuit-laps.ts';
import { loadCircuitLapBest } from './circuit-records.ts';
import { normalizeRaceConfig } from './race-config.ts';
import { t } from './i18n.ts';
import { timeString } from './time-format.ts';
import { setTextIfChanged, setHiddenIfChanged } from './hud-dom.ts';
// Read storage once per immutable race configuration, never every racing frame.
let active: CircuitState | null = null, personalBest: number | null = null;
export function updateCircuitHud(element: HTMLElement, circuit: CircuitState | null, phase: string): void {
  setHiddenIfChanged(element, !circuit || phase === 'ready');
  if (!circuit) return;
  if (circuit !== active) { active = circuit; personalBest = loadCircuitLapBest(normalizeRaceConfig({ mode: 'circuit', laps: circuit.laps })); }
  const driver = circuit.player, times = driver.lapTimes.map(lap => lap.time);
  const last = times.at(-1), best = personalBest !== null || times.length ? Math.min(personalBest ?? Infinity, ...times) : undefined;
  const splits = driver.splits.length ? driver.splits : driver.lapTimes.at(-1)?.splits ?? [];
  setTextIfChanged(element, !driver.valid ? t('circuit.invalid') : t('circuit.hud', {
    lap: Math.min(circuit.laps, driver.completed + 1), total: circuit.laps,
    last: last === undefined ? '—' : timeString(last), best: best === undefined ? '—' : timeString(best),
  }) + (splits.length ? ' · ' + t('circuit.splits', { splits: splits.map(timeString).join(' / ') }) : ''));
}
