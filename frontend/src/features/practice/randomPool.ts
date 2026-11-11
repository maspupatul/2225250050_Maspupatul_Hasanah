import type { ModuleInfo } from '../../lib/types';
import type { LessonState } from '../../store/progress';

export const RANDOM_COUNT = 5;

/** Lessons a random practice may draw from: finished ones plus the current one. */
export function randomPool(modules: ModuleInfo[], states: Record<string, LessonState>): string[] {
  return modules
    .flatMap((m) => m.lessons)
    .filter((l) => states[l.id] === 'done' || states[l.id] === 'current')
    .map((l) => l.id);
}

/** Pick `count` lessons, spreading them over the pool before repeating one. */
export function pickLessons(pool: string[], count: number, random: () => number = Math.random): string[] {
  if (pool.length === 0) return [];
  const picks: string[] = [];
  while (picks.length < count) {
    const round = [...pool];
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    picks.push(...round);
  }
  return picks.slice(0, count);
}
