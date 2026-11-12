import { describe, expect, it } from 'vitest';
import { WALK_RANGE, operandChoices, planWalk, positionAfter, walkFeedback } from './walk';

describe('car walk model', () => {
  it('matches integer arithmetic for every sign combination', () => {
    for (let a = -10; a <= 10; a++) {
      for (let b = -10; b <= 10; b++) {
        if (b === 0) continue;
        expect(planWalk(a, '+', b).end).toBe(a + b);
        expect(planWalk(a, '-', b).end).toBe(a - b);
      }
    }
  });

  it('faces and moves as described in the design', () => {
    expect(planWalk(2, '+', 3)).toMatchObject({ facing: 'right', motion: 'forward', stepDir: 1 });
    expect(planWalk(2, '+', -3)).toMatchObject({ facing: 'right', motion: 'backward', stepDir: -1 });
    expect(planWalk(2, '-', 3)).toMatchObject({ facing: 'left', motion: 'forward', stepDir: -1 });
    // subtracting a negative: facing left, driving backward → to the right
    expect(planWalk(-3, '-', -5)).toMatchObject({ facing: 'left', motion: 'backward', stepDir: 1, end: 2 });
  });

  it('moves one step per tap and never past the end', () => {
    const plan = planWalk(-3, '-', -5);
    expect([0, 1, 2, 5, 9].map((n) => positionAfter(plan, n))).toEqual([-3, -2, -1, 2, 2]);
  });

  it('explains a wrong prediction without needing the answer text', () => {
    const plan = planWalk(1, '-', 4); // end −3, moving left
    expect(walkFeedback(plan, -3)).toBe('correct');
    expect(walkFeedback(plan, 5)).toBe('wrong_direction');
    expect(walkFeedback(plan, -5)).toBe('wrong_distance');
    expect(walkFeedback(plan, 1)).toBe('other');
  });

  it('only offers operands that keep the car on the line', () => {
    const choices = operandChoices(8, '+');
    expect(choices).not.toContain(0);
    expect(choices.every((v) => 8 + v <= WALK_RANGE[1])).toBe(true);
    expect(choices).toContain(-10);
    expect(choices).not.toContain(8);
  });
});
