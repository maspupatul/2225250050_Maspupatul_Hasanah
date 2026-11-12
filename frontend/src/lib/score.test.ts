import { describe, expect, it } from 'vitest';
import { averageWeight, examScore, stageScores, type Outcome } from './score';
import { tickValues } from '../features/visuals/scale';

const o = (weight: number, stage?: string): Outcome => ({ weight, selfFound: weight === 1, deferred: weight === 0, stage });

describe('exam scoring', () => {
  it('is 0 without outcomes', () => {
    expect(averageWeight([])).toBe(0);
    expect(examScore([])).toBe(0);
  });

  it('uses the mastery weights', () => {
    expect(examScore([o(1), o(1), o(0.4), o(0)])).toBe(60);
    expect(examScore([o(1), o(0.8), o(0.6)])).toBe(80);
  });

  it('scores every stage separately, in stage order', () => {
    const stages = [
      { key: 'dasar', title: 'Dasar' },
      { key: 'menengah', title: 'Menengah' },
      { key: 'hots', title: 'HOTS' },
    ];
    const result = stageScores([o(1, 'dasar'), o(0.6, 'dasar'), o(0.2, 'hots')], stages);
    expect(result.map((s) => [s.key, s.score, s.count])).toEqual([
      ['dasar', 80, 2],
      ['menengah', 0, 0],
      ['hots', 20, 1],
    ]);
  });
});

describe('number line ticks', () => {
  it('keeps labels readable on wide ranges', () => {
    expect(tickValues(-8, 8, 1).labelEvery).toBe(1);
    expect(tickValues(-10, 10, 1).labelEvery).toBe(2);
    expect(tickValues(-20, 20, 1).labelEvery).toBe(5);
    expect(tickValues(-50, 50, 1).labelEvery).toBe(10);
    expect(tickValues(-20, 80, 1).labelEvery).toBe(10);
    expect(tickValues(-100, 100, 1).labelEvery).toBe(20);
  });
});
