import { setTextIfChanged as setHudText, setHiddenIfChanged as setHudHidden } from './hud-dom.ts';
import { t } from './i18n.ts';
import { checkpointDirection } from './checkpoint-rush.ts';
import type { SprintSeries } from './sprint-series.ts';
import type { CupState } from './championship-cup.ts';
import type { StuntRun } from './race-results.ts';

// Mode-specific HUD panels: objectives (clean trial, hazards, elimination, checkpoints) and run progress
// (sprint/cup heat, active item, stunt clock, practice telemetry). Same write-only-on-change rules as race-hud.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HudRace = any;
export interface ModePanelOptions {
  getSprintSeries(): SprintSeries | null;
  getCup(): CupState | null;
  getStunt(): StuntRun | null;
  isTutorialActive(): boolean;
}
const NODE_IDS = ['clean-trial-hud', 'hazard-warning', 'elimination-hud', 'checkpoint-hud', 'sprint-stage', 'item-slot', 'item-status',
  'activate-item', 'stunt-hud', 'practice-hud'];

export function createModePanels(options: ModePanelOptions) {
  const hudNodes = Object.fromEntries(NODE_IDS.map(id => [id, document.getElementById(id)!])) as Record<string, HTMLElement>;
  function updateObjectivePanels(race: HudRace): void {
    const cleanTrialHud = hudNodes['clean-trial-hud']!;
    setHudHidden(cleanTrialHud, race.mode !== 'time' || !race.config.clean || race.phase === 'ready');
    if (!cleanTrialHud.hidden) {
      setHudText(cleanTrialHud, t(race.player.collisions ? 'mode.cleanBroken' : 'mode.cleanActive'));
      cleanTrialHud.dataset.broken = String(race.player.collisions > 0);
    }
    const hazardWarning = hudNodes['hazard-warning']!;
    const hazardAhead = race.hazards.length ? race.hazards.find((h: HudRace) => !h.passed && !h.hit && h.distance > race.player.distance) : null;
    const hazardDistance = hazardAhead ? Math.ceil(hazardAhead.distance - race.player.distance) : Infinity;
    setHudHidden(hazardWarning, !hazardAhead || hazardDistance > 170 || race.phase !== 'racing');
    if (!hazardWarning.hidden) setHudText(hazardWarning, t('mode.hazardWarning', { n: hazardDistance }));
    const eliminationHud = hudNodes['elimination-hud']!;
    setHudHidden(eliminationHud, !race.elimination || race.phase === 'ready');
    if (race.elimination) {
      setHudText(eliminationHud, t('mode.eliminationHud', {
        active: race.rivals.length + 1,
        seconds: Math.max(0, Math.ceil(race.elimination.nextAt - race.elapsed)),
      }));
      eliminationHud.dataset.urgent = String(race.elimination.nextAt - race.elapsed <= 3);
    }
    const checkpointHud = hudNodes['checkpoint-hud']!;
    setHudHidden(checkpointHud, !race.checkpoint || race.phase === 'ready');
    if (race.checkpoint) {
      const next = race.checkpoint.gates.find((g: HudRace) => !g.passed && !g.missed);
      setHudText(checkpointHud, t('mode.checkpointHud', {
        n: race.checkpoint.passed, total: race.checkpoint.gates.length,
        seconds: race.checkpoint.timeLeft.toFixed(1),
        distance: next ? Math.max(0, Math.ceil(next.distance - race.player.distance)) : 0,
        direction: next ? t('mode.direction.' + checkpointDirection(race.player, next)) : '—',
        perfect: race.checkpoint.perfect,
      }));
      checkpointHud.dataset.urgent = String(race.checkpoint.timeLeft < 10);
    }
  }
  function updateSeriesPanels(race: HudRace): void {
    const sprintSeries = options.getSprintSeries(), cup = options.getCup(), stunt = options.getStunt();
    const counter = hudNodes['sprint-stage']!;
    setHudHidden(counter, !sprintSeries && !cup);
    if (cup) setHudText(counter, t('mode.cupHeat', { n: Math.min(cup.tracks.length, cup.results.length + (race.phase === 'finished' ? 0 : 1)), total: cup.tracks.length }));
    if (sprintSeries) setHudText(counter, t('mode.stageCounter', {
      n: Math.min(sprintSeries.count, sprintSeries.results.length + (race.phase === 'finished' ? 0 : 1)),
      total: sprintSeries.count,
    }));
    const slot = hudNodes['item-slot']!, carItem = race.player.heldItem;
    setHudHidden(slot, !race.config.activeItems || race.phase === 'ready');
    if (!slot.hidden) {
      setHudText(hudNodes['item-status']!, carItem ? t('mode.itemReady', { item: t('mode.item.' + carItem) }) : t('mode.itemEmpty'));
      (hudNodes['activate-item'] as HTMLButtonElement).disabled = !carItem || race.phase !== 'racing' || race.player.itemCooldown > 0;
    }
    const stuntHud = hudNodes['stunt-hud']!;
    setHudHidden(stuntHud, !stunt || race.phase === 'ready');
    if (stunt) {
      const active = race.phase === 'finished' ? 0 : race.elapsed;
      setHudText(stuntHud, t('mode.stuntHud', {
        time: Math.ceil(Math.max(0, stunt.duration - stunt.elapsed - active)),
        score: Math.round(stunt.score + (race.phase === 'finished' ? 0 : race.player.score)),
        combo: race.styleAttack?.combo ?? 0, heat: stunt.heats + (race.phase === 'finished' ? 0 : 1),
      }));
    }
    const practiceHud = hudNodes['practice-hud']!;
    setHudHidden(practiceHud, !race.practice || options.isTutorialActive());
    if (race.practice) setHudText(practiceHud, t('mode.practiceTelemetry', {
      km: (race.practice.travelled / 1000).toFixed(2),
      max: Math.round(race.practice.maxSpeed * 3.6),
      air: race.practice.airTime.toFixed(1),
      near: race.practice.nearMisses,
      combo: race.player.combo,
      tricks: race.practice.tricks,
    }));
  }
  return {
    update(race: HudRace): void {
      updateObjectivePanels(race);
      updateSeriesPanels(race);
    },
  };
}
