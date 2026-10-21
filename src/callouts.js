import { t } from './i18n.js';

// A callout field is a catalog key or [key, params]; it resolves in the active locale once, when the event is queued.
const text = field => Array.isArray(field) ? t(field[0], field[1]) : t(field);

export function createCallouts() {
  let previousRace, previous, previousElapsed = 0, current = null;
  const pending = [];
  const enqueue = (kind, title, detail) => {
    const event = { kind, title: text(title), detail: text(detail) };
    const index = pending.findIndex(item => item.kind === kind);
    if (index < 0) pending.push(event);
    else pending[index] = event; // Show the latest combo/tier instead of stale repeats.
  };
  return {
    update(race, blocked = false) {
      const elapsed = Math.max(0, race.elapsed - previousElapsed);
      previousElapsed = race.elapsed;
      const car = race.player;
      const next = {
        near: car.nearMisses, perfect: car.perfectLines, nitro: car.nitro,
        nitroTime: car.nitroTime, uses: car.nitroUses,
        drift: Math.min(3, Math.floor(car.drift?.time ?? 0)),
        trick: car.trick, trickPayout: car.trickPayout, shortcut: car.inShortcut,
      };
      if (race !== previousRace || race.phase !== 'racing') {
        pending.length = 0;
        current = null;
        previous = next;
        previousRace = race;
        return null;
      }
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
        else if (next.trickPayout.nitro > 0) enqueue('trick-payout', ['callout.trick', { n: next.trickPayout.nitro }], 'callout.trick.detail');
      }
      if (next.nitro > previous.nitro && next.perfect === previous.perfect && !trickPaid) {
        enqueue('refill', ['callout.refill', { n: Number((next.nitro - previous.nitro).toFixed(2)) }], 'callout.refill.detail');
      }
      previous = next;
      if (blocked) {
        if (current) current.started += elapsed;
        return null;
      }
      if (current && race.elapsed - current.started >= 1.2) current = null;
      if (!current && pending.length) current = { ...pending.shift(), started: race.elapsed };
      return current;
    },
  };
}
