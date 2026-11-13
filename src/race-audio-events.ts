import { createModeAudioState, modeAudioCues, type ModeAudioRace } from './mode-audio.ts';
import { createRivalCues, type RivalCueRace } from './rival-cues.ts';

// Pure race → sound transitions for the Web Audio engine: what to play this frame, never how it sounds.
interface AudioCar {
  boosting?: boolean; nitroTime: number; miniBoost: number; fuel: number;
  thrusting?: boolean;
  impact?: { time: number; intensity: number; kind?: string } | null;
  landing?: { time: number; speed: number; chain?: boolean } | null;
  nearMiss?: unknown; trick?: unknown; shieldBlock?: unknown;
  fall?: unknown; driftPayout?: unknown; boostTunnelEvent?: unknown;
  inShortcut?: boolean; perfectLines?: number; slipstream?: { paid: boolean };
}
export interface AudioRace extends ModeAudioRace {
  player: AudioCar & NonNullable<ModeAudioRace['player']>;
  elapsed: number;
  countdown: number;
  pickups: { taken?: boolean; tier?: string }[];
  rings: { type: string; hit?: boolean }[];
  rivals: RivalCueRace['rivals'];
  result?: { success?: boolean; endReason?: string } | null;
  sections?: readonly { type: string; from: number; to: number }[];
  course?: {
    cars: ReadonlyMap<string, { travel: { currentEdgeId: string } }>;
    spec: { graph: { groundRoute: readonly string[] } };
  };
}
export interface AudioImpulse { intensity: number; landing: boolean; barrier: boolean }
export interface RaceAudioFrame {
  /** Stop ringing cues before playing this frame's sounds (new race or entering pause). */
  silence: boolean;
  /** Cue names and impulses in the order they happened. */
  sounds: (string | AudioImpulse)[];
  active: boolean;
  boosting: boolean;
}

export function createRaceAudioEvents() {
  const modeAudioState = createModeAudioState(), rivalCues = createRivalCues();
  const warnings = new Set<number>(), shortcuts = new Set<string | number>();
  let lastFall: unknown, lastDrift: unknown, lastTunnel: unknown, lastEdge: string | undefined;
  let lastNitro = 0, lastPerfect = 0, draftPaid = false, wasShortcut = false;
  let previousRace: AudioRace | undefined, previousPhase: string | null = null, previousCount: number | null = null;
  let lastImpact: AudioCar['impact'] = null, lastLanding: AudioCar['landing'] = null;
  let lastNearMiss: unknown = null, lastTrick: unknown = null, lastShieldBlock: unknown = null;
  let wasThrusting = false, wasBoosting = false, lowCharge = false;
  let collectedPickups = new WeakSet<object>(), collectedRings = new WeakSet<object>();
  // One frame object is reused every tick (no per-frame garbage); read it before the next update.
  const frame: RaceAudioFrame = { silence: false, sounds: [], active: false, boosting: false };

  return {
    // Transitions are consumed even while muted, so enabling audio never replays stale cues.
    update(race: AudioRace, enabled: boolean, gap: number | null = null): RaceAudioFrame {
      const car = race.player;
      const active = race.phase === 'racing';
      const boosting = !!car.boosting || car.nitroTime > 0 || car.miniBoost > 0;
      const freshRace = race !== previousRace;
      const count = race.phase === 'countdown' ? Math.ceil(race.countdown) : null;
      const modeEvents = modeAudioCues(race, modeAudioState);
      const sounds = frame.sounds;
      sounds.length = 0;
      let silence = false;
      const edge = race.course?.cars.get('YOU')?.travel.currentEdgeId;
      const shortcut = edge
        ? edge !== lastEdge && !race.course!.spec.graph.groundRoute.includes(edge) && edge
        : car.inShortcut && !wasShortcut && (race.sections?.find(section => section.type === 'shortcut' &&
          car.distance >= section.from && car.distance < section.to)?.from ?? 'shortcut');
      const drift = !freshRace && !!car.driftPayout && car.driftPayout !== lastDrift;
      const tunnel = !freshRace && !!car.boostTunnelEvent && car.boostTunnelEvent !== lastTunnel;
      const newGap = gap !== null && (freshRace || !warnings.has(gap));
      const perfect = !freshRace && (car.perfectLines ?? 0) > lastPerfect;
      if (freshRace) {
        silence = true;
        previousRace = race;
        previousPhase = previousCount = null;
        lastImpact = lastLanding = lastNearMiss = lastTrick = lastShieldBlock = null;
        wasThrusting = wasBoosting = lowCharge = false;
        collectedPickups = new WeakSet(); collectedRings = new WeakSet();
        warnings.clear(); shortcuts.clear();
      }
      if (gap !== null) warnings.add(gap);
      const newShortcut = shortcut !== false && shortcut !== undefined && !shortcuts.has(shortcut);
      if (shortcut !== false && shortcut !== undefined) shortcuts.add(shortcut);
      if (race.phase === 'paused' && previousPhase !== 'paused') silence = true;
      if (enabled) {
        if (count !== null && count !== previousCount) sounds.push('tick');
        if (active && previousPhase === 'countdown') sounds.push('go');
        if (race.phase === 'finished' && previousPhase !== 'finished' &&
            race.result?.success !== false && !['cup', 'stunt'].includes(race.mode)) {
          sounds.push(race.mode === 'endless' && race.result?.endReason === 'collisions' ? 'endless-ended' : 'finish');
        }
        sounds.push(...modeEvents);
        if (active) {
          if (car.impact && car.impact !== lastImpact && race.elapsed - car.impact.time < 0.2)
            sounds.push({ intensity: car.impact.intensity, landing: false, barrier: car.impact.kind === 'barrier' });
          if (car.landing && car.landing !== lastLanding && race.elapsed - car.landing.time < 0.2) {
            sounds.push({ intensity: Math.min(1, car.landing.speed / 14), landing: true, barrier: false });
            if (car.landing.chain) sounds.push('chain-land');
          }
          if (car.nearMiss && car.nearMiss !== lastNearMiss) sounds.push('near');
          if (car.shieldBlock && car.shieldBlock !== lastShieldBlock) sounds.push('shield-block');
          if (car.trick && car.trick !== lastTrick) sounds.push('whoosh');
          if (car.thrusting && !wasThrusting) sounds.push('lift');
          if (drift) sounds.push('drift-release');
          else if (tunnel) sounds.push('tunnel-boost');
          else if (!freshRace && lastNitro > 0 && car.nitroTime > lastNitro) sounds.push('nitro-extend');
          else if (boosting && !wasBoosting) sounds.push('boost');
          if (!freshRace && car.slipstream?.paid && !draftPaid) sounds.push('draft-reward');
          if (!freshRace && newShortcut) sounds.push('shortcut-entry');
          if (!freshRace && car.fall && car.fall !== lastFall) sounds.push('fall-recovery');
          else if (newGap) sounds.push('gap-warning');
          else if (car.fuel < 20 && !lowCharge) sounds.push('low');
        }
      }
      for (const pickup of race.pickups) if (pickup.taken && !collectedPickups.has(pickup)) {
        collectedPickups.add(pickup);
        if (enabled && active && !freshRace) sounds.push(`pickup-${pickup.tier ?? 'cell'}`);
      }
      let finalRing = -1;
      for (const ring of race.rings) if (ring.hit && !collectedRings.has(ring)) { // only the player sets hit; a row pays once
        collectedRings.add(ring);
        if (enabled && active && !freshRace) {
          finalRing = sounds.length;
          sounds.push(`ring-${ring.type}`);
        }
      }
      if (perfect && finalRing >= 0) sounds[finalRing] = 'perfect-line';
      lastFall = car.fall; lastDrift = car.driftPayout; lastTunnel = car.boostTunnelEvent;
      lastNitro = car.nitroTime; lastPerfect = car.perfectLines ?? 0;
      draftPaid = car.slipstream?.paid === true;
      wasShortcut = car.inShortcut === true; lastEdge = edge;
      for (const cue of rivalCues.update(race)) if (enabled && active) sounds.push(cue.kind === 'take' ? 'rival-pickup' : 'rival-nitro');
      previousPhase = race.phase;
      previousCount = count;
      lastImpact = car.impact;
      lastLanding = car.landing;
      lastNearMiss = car.nearMiss;
      lastTrick = car.trick;
      lastShieldBlock = car.shieldBlock;
      wasThrusting = active && !!car.thrusting;
      wasBoosting = active && boosting;
      if (car.fuel >= 30) lowCharge = false;
      else if (car.fuel < 20) lowCharge = true;
      frame.silence = silence; frame.active = active; frame.boosting = boosting;
      return frame;
    },
  };
}
