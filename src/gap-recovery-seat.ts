/** Classic road gaps only: checkpoint-gated CourseGraph splits keep their own recovery rules. */
export const GAP_FALL_ASSIST_AFTER = 3;
export const GAP_RECOVERY_EXIT_BUFFER = 18; // metres onto solid road beyond the far lip

export interface GapBounds { from: number; to: number }
export interface GapFallStreak extends GapBounds { count: number }

/** Preserve genuine near-side fails; rescue after progress or repeated failure, never beyond FINISH. */
export function planGapRecovery(gap: GapBounds, position: number, approach: number, finish: number, previous: GapFallStreak | null = null) {
  const count = previous?.from === gap.from && previous.to === gap.to ? previous.count + 1 : 1;
  const forward = (position > (gap.from + gap.to) / 2 || count >= GAP_FALL_ASSIST_AFTER) && gap.to + GAP_RECOVERY_EXIT_BUFFER < finish;
  return {
    distance: forward ? gap.to + GAP_RECOVERY_EXIT_BUFFER : approach,
    streak: { from: gap.from, to: gap.to, count },
    forward,
    assisted: forward && count >= GAP_FALL_ASSIST_AFTER && position <= (gap.from + gap.to) / 2,
  };
}

/** Reaching the next solid road clears the streak; an unrelated manual reset does not add a failure. */
export const clearGapFallStreak = (previous: GapFallStreak | null | undefined, position: number): GapFallStreak | null =>
  previous && position < previous.to ? previous : null;
