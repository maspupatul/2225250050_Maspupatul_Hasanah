import { describe, expect, it } from 'vitest';
import type { ModuleInfo } from '../../lib/types';
import { pickLessons, randomPool } from './randomPool';

const lesson = (id: string) => ({
  id,
  module_id: 'm',
  order: 1,
  number: 1,
  title: id,
  subtitle: '',
  icon: '',
  segment_count: 1,
  practice_count: 1,
});
const modules: ModuleInfo[] = [{ id: 'm', title: 'M', order: 1, lessons: ['a', 'b', 'c'].map(lesson) }];

describe('random practice', () => {
  it('draws only from finished lessons and the current one', () => {
    expect(randomPool(modules, { a: 'done', b: 'current', c: 'locked' })).toEqual(['a', 'b']);
    expect(randomPool(modules, {})).toEqual([]);
  });

  it('limits a topic practice to the lessons of that module', () => {
    const two: ModuleInfo[] = [...modules, { id: 'n', title: 'N', order: 2, lessons: ['d', 'e'].map(lesson) }];
    const states = { a: 'done', b: 'done', c: 'done', d: 'current', e: 'locked' } as const;
    expect(randomPool(two, states, 'n')).toEqual(['d']);
    expect(randomPool(two, states, 'm')).toEqual(['a', 'b', 'c']);
    expect(randomPool(two, states, 'unknown')).toEqual([]);
    expect(randomPool(two, states)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('uses every lesson before repeating one', () => {
    const picks = pickLessons(['a', 'b'], 5, () => 0.3);
    expect(picks).toHaveLength(5);
    expect(new Set(picks.slice(0, 2))).toEqual(new Set(['a', 'b']));
    expect(pickLessons([], 5)).toEqual([]);
  });
});
