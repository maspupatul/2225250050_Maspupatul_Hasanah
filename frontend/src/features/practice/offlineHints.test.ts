import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api';
import type { Hint } from '../../lib/types';
import { isOfflineError, nextOfflineHint } from './offlineHints';

const hint = (level: 1 | 2 | 3): Hint => ({
  step: 'result',
  hint_level: level,
  kind: (['meaning', 'visual', 'strategy'] as const)[level - 1],
  text: `Petunjuk ${level}`,
  visual: null,
  template: null,
  highlight: null,
  hints_remaining: 3 - level,
});

const problem = { offline_hints: { result: [hint(1), hint(2), hint(3)] } };

describe('nextOfflineHint', () => {
  it('gives the first hint right away', () => {
    const r = nextOfflineHint(problem, 'result', 0, false);
    expect(r).toEqual({
      kind: 'hint',
      hint: { ...hint(1), ai_text: null, source: 'static' },
    });
  });

  it('keeps the "try first" rule for later hints', () => {
    expect(nextOfflineHint(problem, 'result', 1, false)).toEqual({
      kind: 'locked',
    });
    const r = nextOfflineHint(problem, 'result', 1, true);
    expect(r.kind === 'hint' && r.hint.hint_level).toBe(2);
  });

  it('has nothing after the third hint or for unknown steps', () => {
    expect(nextOfflineHint(problem, 'result', 3, true)).toEqual({
      kind: 'none',
    });
    expect(nextOfflineHint(problem, 'interpret', 0, true)).toEqual({
      kind: 'none',
    });
    expect(nextOfflineHint({}, 'result', 0, true)).toEqual({ kind: 'none' });
  });
});

describe('isOfflineError', () => {
  it('treats no connection as offline, server answers as not offline', () => {
    expect(isOfflineError(new ApiError('NETWORK', 'x', 0), true)).toBe(true);
    expect(isOfflineError(new Error('x'), false)).toBe(true);
    expect(isOfflineError(new ApiError('HINT_LOCKED', 'x', 409), true)).toBe(false);
  });
});
