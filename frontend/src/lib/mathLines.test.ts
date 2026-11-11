import { describe, expect, it } from 'vitest';
import { signOf, splitMathLine } from './mathLines';

describe('math lines', () => {
  it('splits at the first separator', () => {
    expect(splitMathLine('3 × (−2) = −6')).toEqual({ left: '3 × (−2)', sep: '=', right: '−6' });
    expect(splitMathLine('4 − (−2) = 4 + 2')).toEqual({ left: '4 − (−2)', sep: '=', right: '4 + 2' });
    expect(splitMathLine('basement 2 → −2')).toEqual({ left: 'basement 2', sep: '→', right: '−2' });
    expect(splitMathLine('−7 < −2')).toEqual({ left: '−7', sep: '<', right: '−2' });
  });

  it('continues the previous line and keeps plain text', () => {
    expect(splitMathLine('= −6')).toEqual({ left: '', sep: '=', right: '−6' });
    expect(splitMathLine('tanpa tanda')).toEqual({ left: 'tanpa tanda', sep: '', right: '' });
  });

  it('colours only lone integers', () => {
    expect(signOf('−6')).toBe('negative');
    expect(signOf('(−6.000)')).toBe('negative');
    expect(signOf('10')).toBe('positive');
    expect(signOf('0')).toBe('zero');
    expect(signOf('4 + 2')).toBeNull();
    expect(signOf('positif')).toBeNull();
  });
});
