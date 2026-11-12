import type { Arrow, Mark, VisualScript } from '../../lib/types';

export const COLORS = {
  positive: '#1d4ed8',
  negative: '#dc2626',
  zero: '#6b7280',
  accent: '#f26b3a',
  ink: '#2b2238',
  muted: '#8a8499',
};

export function signColor(value: number): string {
  if (value > 0) return COLORS.positive;
  if (value < 0) return COLORS.negative;
  return COLORS.zero;
}

export function dirColor(dir: Arrow['dir']): string {
  return dir === 'up' ? COLORS.positive : COLORS.negative;
}

export function tickValues(lo: number, hi: number, step: number): { values: number[]; labelEvery: number } {
  const count = Math.round((hi - lo) / step);
  // wide ranges (Ujian Akhir: −50..50, score board) label every 10 to stay readable
  const labelEvery = count <= 16 ? 1 : count <= 24 ? 2 : count <= 60 ? 5 : count <= 120 ? 10 : 20;
  const values: number[] = [];
  for (let i = 0; i <= count; i++) values.push(lo + i * step);
  return { values, labelEvery };
}

export function isLabelled(value: number, lo: number, step: number, labelEvery: number): boolean {
  if (value === 0) return true;
  return Math.round((value - lo) / step) % labelEvery === 0;
}

/** Level shown by the "object" (liquid, diver, lift): pointer, else start/end mark. */
export function displayLevel(script: VisualScript, pointer: number | null): number | null {
  if (pointer !== null && pointer !== undefined) return pointer;
  const marks: Mark[] = script.marks ?? [];
  if (marks.length === 0) return null;
  return script.showEnd ? marks[marks.length - 1].value : marks[0].value;
}

/** Spread labels vertically so they do not overlap (positions in px). */
export function spreadLabels(positions: number[], minGap: number): number[] {
  const order = positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const placed: number[] = new Array(positions.length);
  let last = -Infinity;
  for (const { p, i } of order) {
    const y = Math.max(p, last + minGap);
    placed[i] = y;
    last = y;
  }
  return placed;
}
