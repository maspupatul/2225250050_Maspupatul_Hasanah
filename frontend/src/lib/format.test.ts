import { describe, expect, it } from 'vitest';
import {
  fmtInt,
  fmtOperand,
  fmtWithUnit,
  parseIntInput,
  richParts,
  serializeTokens,
  type Token,
} from './format';

describe('format', () => {
  it('uses the real minus sign and thousands separators', () => {
    expect(fmtInt(-4)).toBe('−4');
    expect(fmtOperand(-4)).toBe('(−4)');
    expect(fmtInt(-5000, true)).toBe('−5.000');
    expect(fmtWithUnit(-2, 'lantai')).toBe('Basement 2 (−2)');
    expect(fmtWithUnit(-3000, 'Rp')).toBe('−Rp3.000');
  });

  it('serializes expression tokens for the API', () => {
    const tokens: Token[] = [
      { kind: 'num', value: -4 },
      { kind: 'op', value: '-' },
      { kind: 'num', value: -10 },
    ];
    expect(serializeTokens(tokens)).toBe('(-4) - (-10)');
  });

  it('parses integer input', () => {
    expect(parseIntInput('−7')).toBe(-7);
    expect(parseIntInput('2.000')).toBe(2000);
    expect(parseIntInput('')).toBeNull();
    expect(parseIntInput('1,5')).toBeNull();
  });

  it('splits bold markers', () => {
    expect(richParts('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });
});
