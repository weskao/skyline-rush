import { t } from './i18n.ts';
type CalloutText = string | readonly [string, Record<string, unknown>];
interface CalloutEvent { kind: string; title: string; detail: string }
interface ActiveCallout extends CalloutEvent { started: number }
interface CalloutPayout { hard?: boolean; nitro: number }
interface CalloutPlayer {
  nearMisses: number; perfectLines: number; nitro: number; nitroTime: number; nitroUses: number;
  rewardFuel: number; nearMiss: { combo: number; charge: number };
  drift?: { time: number } | null; trick?: unknown;
  trickPayout?: CalloutPayout | null;
  inShortcut: boolean;
}
export interface CalloutRace { phase: string; elapsed: number; player: CalloutPlayer }
interface FeedbackSnapshot {
  near: number; perfect: number; nitro: number; nitroTime: number; uses: number;
  rewardFuel: number; drift: number; trick: unknown; trickPayout?: CalloutPayout | null;
  shortcut: boolean;
}


// A callout field is a catalog key or [key, params]; it resolves in the active locale once, when the event is queued.
const text = (field: CalloutText): string => Array.isArray(field) ? t(field[0], field[1]) : t(field);

export function createCallouts() {
  let previousRace: CalloutRace | undefined;
  let previous: FeedbackSnapshot | undefined;
  let previousElapsed = 0;
  let current: ActiveCallout | null = null;
  const pending: CalloutEvent[] = [];
  const enqueue = (kind: string, title: CalloutText, detail: CalloutText): void => {
    const event = { kind, title: text(title), detail: text(detail) };
    const index = pending.findIndex(item => item.kind === kind);
    if (index < 0) pending.push(event);
    else pending[index] = event; // Show the latest combo/tier instead of stale repeats.
  };
  return {
    update(race: CalloutRace, blocked: boolean = false): ActiveCallout | null {
      const elapsed = Math.max(0, race.elapsed - previousElapsed);
      previousElapsed = race.elapsed;
      const car = race.player;
      const next: FeedbackSnapshot = {
        near: car.nearMisses, perfect: car.perfectLines, nitro: car.nitro,
        nitroTime: car.nitroTime, uses: car.nitroUses, rewardFuel: car.rewardFuel,
        drift: Math.min(3, Math.floor(car.drift?.time ?? 0)),
        trick: car.trick, trickPayout: car.trickPayout, shortcut: car.inShortcut,
      };
      if (race !== previousRace || race.phase !== 'racing' || !previous) {
        pending.length = 0;
        current = null;
        previous = next;
        previousRace = race;
        return null;
      }
      const fuel = Math.round(next.rewardFuel - previous.rewardFuel); // flight charge the rewards added this frame
      if (next.perfect > previous.perfect) enqueue('perfect', 'callout.perfect', 'callout.perfect.detail');
      if (next.near > previous.near) enqueue('near', ['callout.near', { n: car.nearMiss.combo }],
        car.nearMiss.charge < 0.5 ? 'callout.near.full' : ['callout.near.pct', { n: Math.round(car.nearMiss.charge) }]);
      if (next.uses > previous.uses || next.nitroTime > previous.nitroTime) {
        enqueue('nitro', 'callout.nitro', next.uses > previous.uses ? 'callout.nitro.burst' : 'callout.nitro.extend');
      }
      if (next.drift > previous.drift) enqueue('drift', ['callout.drift', { tier: t(`callout.drift.tier.${next.drift}`) }], 'callout.drift.detail');
      if (next.shortcut && !previous.shortcut) enqueue('shortcut', 'callout.shortcut', 'callout.shortcut.detail');
      if (next.trick && next.trick !== previous.trick) enqueue('trick', 'callout.roll', 'callout.roll.detail');
      const trickPaid = next.trickPayout && next.trickPayout !== previous.trickPayout;
      if (trickPaid) {
        if (next.trickPayout.hard) enqueue('trick-payout', 'callout.hard', 'callout.hard.detail');
        else if (next.trickPayout.nitro > 0) enqueue('trick-payout', ['callout.trick', { n: next.trickPayout.nitro }], fuel > 0 ? ['callout.trick.fuel', { n: fuel }] : 'callout.trick.detail');
      }
      if (next.nitro > previous.nitro && next.perfect === previous.perfect && !trickPaid) {
        enqueue('refill', ['callout.refill', { n: Number((next.nitro - previous.nitro).toFixed(2)) }], fuel > 0 ? ['callout.refill.fuel', { n: fuel }] : 'callout.refill.detail');
      }
      previous = next;
      if (blocked) {
        if (current) current.started += elapsed;
        return null;
      }
      if (current && race.elapsed - current.started >= 1.2) current = null;
      if (!current && pending.length) {
        const queued = pending.shift();
        if (queued) current = { ...queued, started: race.elapsed };
      }
      return current;
    },
  };
}
