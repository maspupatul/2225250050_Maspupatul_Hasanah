import { describe, expect, it } from 'vitest';
import { lessonStars, streakDays, totalStars } from './progress';

describe('home motivation badges', () => {
  const today = new Date(2026, 10, 11);

  it('counts consecutive active days', () => {
    expect(streakDays([], today)).toBe(0);
    expect(streakDays(['2026-11-09', '2026-11-10', '2026-11-11'], today)).toBe(3);
    expect(streakDays(['2026-11-08', '2026-11-10'], today)).toBe(1); // today not active yet
    expect(streakDays(['2026-11-05'], today)).toBe(0);
  });

  it('gives stars only for finished lessons', () => {
    expect(lessonStars(undefined)).toBe(0);
    expect(lessonStars({ status: 'in_progress', segment: 2, mastery: 0 })).toBe(0);
    expect(lessonStars({ status: 'done', segment: 0, mastery: 0.9 })).toBe(3);
    expect(lessonStars({ status: 'done', segment: 0, mastery: 0.6 })).toBe(2);
    expect(
      totalStars({
        a: { status: 'done', segment: 0, mastery: 1 },
        b: { status: 'done', segment: 0, mastery: 0.2 },
      }),
    ).toBe(4);
  });
});
