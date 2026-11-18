import { ApiError } from '../../lib/api';
import type { Hint, Problem, StepKey } from '../../lib/types';

/**
 * Offline fallback for the 3-level hints (docs/DESAIN-PEDAGOGIS.md §6.6).
 *
 * The server ships the static hints with every problem (`offline_hints`, same no-leak
 * guarantee as the hint endpoint). When the device is offline, the next one is shown
 * from there. The "try before the next hint" rule (HINT_LOCKED) is mirrored here, and
 * hints opened offline are reported to the server later, so the mastery weight is right.
 */

export type OfflineHintResult = { kind: 'hint'; hint: Hint } | { kind: 'locked' } | { kind: 'none' };

/** Pure: the next static hint for this step, or why there is none. */
export function nextOfflineHint(
  problem: Pick<Problem, 'offline_hints'>,
  step: StepKey,
  opened: number,
  triedSinceLastHint: boolean,
): OfflineHintResult {
  const list = problem.offline_hints?.[step];
  if (!list || opened >= list.length) return { kind: 'none' };
  if (opened >= 1 && !triedSinceLastHint) return { kind: 'locked' };
  return {
    kind: 'hint',
    hint: { ...list[opened], ai_text: null, source: 'static' },
  };
}

/** True when a failed hint request means "no connection" (not a server answer like HINT_LOCKED). */
export function isOfflineError(err: unknown, online: boolean): boolean {
  return !online || (err instanceof ApiError && err.code === 'NETWORK');
}
