import { describe, expect, it } from 'vitest';
import { canvasPoint, PENS, strokeFor } from './scratchpad';

describe('Papan Coretan', () => {
  it('never uses the sign colours blue/red for pens', () => {
    const sign = ['#1d4ed8', '#dc2626', '#6b7280'];
    expect(Object.values(PENS).some((c) => sign.includes(c.toLowerCase()))).toBe(false);
  });

  it('erases with a wide destination-out stroke, draws with a thin pen', () => {
    expect(strokeFor('eraser')).toMatchObject({ composite: 'destination-out' });
    expect(strokeFor('orange')).toEqual({ color: PENS.orange, width: 3, composite: 'source-over' });
    expect(strokeFor('eraser').width).toBeGreaterThan(strokeFor('ink').width);
  });

  it('maps pointer coordinates into the canvas box', () => {
    expect(canvasPoint(130, 75, { left: 30, top: 50 })).toEqual({ x: 100, y: 25 });
  });
});
