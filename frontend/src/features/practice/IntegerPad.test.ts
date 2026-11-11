import { describe, expect, it } from 'vitest';
import { applyKey } from './IntegerPad';

const type = (keys: string[]) => keys.reduce(applyKey, '');

describe('IntegerPad keys', () => {
  it('keeps the minus sign when it is pressed before the digits', () => {
    expect(type(['sign', '6'])).toBe('-6');
    expect(type(['1', '2', 'sign'])).toBe('-12');
  });

  it('toggles the sign and deletes digits', () => {
    expect(type(['sign', 'sign', '3'])).toBe('3');
    expect(type(['-', '4', 'back'].slice(1))).toBe('');
    expect(type(['sign', '4', '5', 'back'])).toBe('-4');
  });

  it('drops a leading zero', () => {
    expect(type(['0', '7'])).toBe('7');
  });
});
