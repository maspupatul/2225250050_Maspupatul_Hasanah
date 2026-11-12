// Car-on-a-number-line model for integer addition and subtraction (pure functions).
//
//   a + b : the car faces RIGHT (positive direction)
//   a − b : the car turns around and faces LEFT ("subtracting = adding the opposite")
//   b > 0 : the car drives FORWARD |b| steps;  b < 0 : it drives BACKWARD |b| steps
//
// See docs/RANCANGAN-BELAJAR-MANDIRI.md §2.2.

export type WalkOp = '+' | '-';
export type Facing = 'right' | 'left';
export type Motion = 'forward' | 'backward';

export const WALK_RANGE: [number, number] = [-15, 15];

export interface WalkPlan {
  start: number;
  op: WalkOp;
  operand: number;
  facing: Facing;
  motion: Motion;
  /** +1 = one step to the right, −1 = one step to the left. */
  stepDir: 1 | -1;
  steps: number;
  end: number;
}

export function planWalk(start: number, op: WalkOp, operand: number): WalkPlan {
  const facing: Facing = op === '+' ? 'right' : 'left';
  const motion: Motion = operand >= 0 ? 'forward' : 'backward';
  const facingDir = facing === 'right' ? 1 : -1;
  const stepDir = (motion === 'forward' ? facingDir : -facingDir) as 1 | -1;
  const steps = Math.abs(operand);
  return { start, op, operand, facing, motion, stepDir, steps, end: start + stepDir * steps };
}

/** Position of the car after `taken` steps (clamped to the plan). */
export function positionAfter(plan: WalkPlan, taken: number): number {
  return plan.start + plan.stepDir * Math.max(0, Math.min(taken, plan.steps));
}

export type WalkFeedback = 'correct' | 'wrong_direction' | 'wrong_distance' | 'other';

/** Compare the student's prediction with where the car really stopped. */
export function walkFeedback(plan: WalkPlan, guess: number): WalkFeedback {
  if (guess === plan.end) return 'correct';
  const moved = guess - plan.start;
  if (moved !== 0 && Math.sign(moved) !== plan.stepDir) return 'wrong_direction';
  if (moved !== 0 && Math.sign(moved) === plan.stepDir) return 'wrong_distance';
  return 'other';
}

/** Non-zero operands that keep the whole walk inside the number line. */
export function operandChoices(start: number, op: WalkOp, limit = 10, range = WALK_RANGE): number[] {
  const choices: number[] = [];
  for (let v = -limit; v <= limit; v++) {
    if (v === 0) continue;
    const end = planWalk(start, op, v).end;
    if (end >= range[0] && end <= range[1]) choices.push(v);
  }
  return choices;
}
