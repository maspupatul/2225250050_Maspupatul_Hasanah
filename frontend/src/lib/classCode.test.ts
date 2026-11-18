import { describe, expect, it } from 'vitest';
import { cleanClassCode } from './classCode';

describe('class code input', () => {
  it('upper-cases and drops spaces, dashes and extra characters', () => {
    expect(cleanClassCode('zm7-a92')).toBe('ZM7A92');
    expect(cleanClassCode(' zm 7a 92 99')).toBe('ZM7A92');
    expect(cleanClassCode('')).toBe('');
  });
});
