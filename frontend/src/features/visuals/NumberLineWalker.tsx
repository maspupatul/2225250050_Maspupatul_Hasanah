import { useMemo, useState } from 'react';
import { Stepper } from '../../components/ui/Stepper';
import { t } from '../../i18n/id';
import { fmtInt, fmtOperand } from '../../lib/format';
import type { Arrow, Mark, VisualScript } from '../../lib/types';
import { NumberLine } from './NumberLine';
import { signColor } from './scale';
import {
  WALK_RANGE,
  operandChoices,
  planWalk,
  positionAfter,
  walkFeedback,
  type WalkFeedback,
  type WalkOp,
  type WalkPlan,
} from './walk';

type Phase = 'setup' | 'predict' | 'walking' | 'done';

type Props = {
  initialStart?: number;
  initialOp?: WalkOp;
  initialOperand?: number;
  /** Called when the car stops (e.g. to unlock "Lanjut" in an explore segment). */
  onFinish?: (plan: WalkPlan, feedback: WalkFeedback | null) => void;
};

const START_LIMIT = 10;

/** Number in its sign colour (CLAUDE.md §5.4). */
function Num({ value, operand = true }: { value: number; operand?: boolean }) {
  return <span style={{ color: signColor(value) }}>{operand ? fmtOperand(value) : fmtInt(value)}</span>;
}

/**
 * Car on a number line for a + b and a − b (docs/RANCANGAN-BELAJAR-MANDIRI.md §2.2).
 * The student sets the problem, predicts, then drives the car one step per tap:
 * the tempo is always in the student's hands (no auto-play).
 */
export function NumberLineWalker({ initialStart = -3, initialOp = '+', initialOperand = 5, onFinish }: Props) {
  const [start, setStart] = useState(initialStart);
  const [op, setOp] = useState<WalkOp>(initialOp);
  const [operand, setOperand] = useState(initialOperand);
  const [phase, setPhase] = useState<Phase>('setup');
  const [taken, setTaken] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);

  const choices = useMemo(() => operandChoices(start, op), [start, op]);
  // keep the operand valid when the start or the operation changes
  const safeOperand = choices.includes(operand)
    ? operand
    : choices.reduce((best, v) => (Math.abs(v - operand) < Math.abs(best - operand) ? v : best), choices[0]);
  const plan = planWalk(start, op, safeOperand);
  const position = positionAfter(plan, taken);
  const feedback = phase === 'done' && guess !== null ? walkFeedback(plan, guess) : null;

  const finish = (steps: number) => {
    setTaken(steps);
    if (steps >= plan.steps) {
      setPhase('done');
      onFinish?.(plan, guess === null ? null : walkFeedback(plan, guess));
    }
  };

  const reset = () => {
    setPhase('setup');
    setTaken(0);
    setGuess(null);
  };

  const shiftOperand = (direction: 1 | -1) => {
    const index = choices.indexOf(safeOperand) + direction;
    if (index >= 0 && index < choices.length) setOperand(choices[index]);
  };

  // ---------------------------------------------------------------- visual script
  const marks: Mark[] = [{ value: start, label: t.walker.start_mark, tone: 'start' }];
  if (guess !== null && phase !== 'setup')
    marks.push({ value: guess, label: `🚩 ${t.walker.guessLabel}`, tone: 'given' });
  if (phase === 'done') marks.push({ value: plan.end, label: t.walker.end_mark, tone: 'end' });
  const arrows: Arrow[] =
    taken > 0
      ? [
          {
            at: start,
            anchor: 'from',
            dir: plan.stepDir > 0 ? 'up' : 'down',
            value: plan.stepDir * taken,
            label: t.walker.arrow(plan.motion, taken),
          },
        ]
      : [];
  const script: VisualScript = {
    kind: 'number_line',
    range: WALK_RANGE,
    step: 1,
    marks,
    arrows,
    showEnd: phase === 'done',
    mode: 'explore',
  };

  return (
    <section
      className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-lavender-200"
      aria-label={t.walker.title}
    >
      {/* the math sentence, written next to the picture */}
      <p className="text-center font-mono text-2xl font-black tabular-nums text-ink" aria-live="polite">
        <Num value={start} /> <span className="text-ink-muted">{op === '+' ? '+' : '−'}</span>{' '}
        <Num value={safeOperand} /> <span className="text-ink-muted">=</span>{' '}
        {phase === 'done' ? <Num value={plan.end} operand={false} /> : <span className="text-accent">?</span>}
      </p>

      <div className="rounded-2xl bg-lavender-50 p-2">
        <NumberLine
          script={script}
          pointer={phase === 'predict' ? start : position}
          character={{ facing: plan.facing }}
        />
        <p className="text-center text-sm font-bold text-ink">
          {t.walker.position}: <Num value={phase === 'predict' ? start : position} operand={false} />
        </p>
      </div>

      {/* instant explanation of what the car does and why */}
      <div
        className="space-y-1.5 rounded-2xl bg-amber-50 px-4 py-3 text-[15px] leading-7 text-ink ring-1 ring-amber-200"
        aria-live="polite"
      >
        <p>
          <span aria-hidden="true">🚗 </span>
          {t.walker.facing[plan.facing]}
        </p>
        <p>{t.walker.motion(plan.motion, plan.steps)}</p>
        {phase === 'walking' && <p className="font-bold">{t.walker.stepCount(taken, plan.steps)}</p>}
        {phase === 'done' && op === '-' && <p className="font-bold">{t.walker.subtractLink}</p>}
      </div>

      {feedback && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-bold leading-6 ${feedback === 'correct' ? 'bg-green-50 text-correct' : 'bg-lavender-100 text-plum-700'}`}
          role="status"
        >
          {t.walker.feedback[feedback]}
        </p>
      )}

      {/* controls per phase */}
      {phase === 'setup' && (
        <div className="space-y-2">
          <Stepper
            label={t.walker.start}
            value={fmtInt(start)}
            onLess={() => setStart((v) => v - 1)}
            onMore={() => setStart((v) => v + 1)}
            canLess={start > -START_LIMIT}
            canMore={start < START_LIMIT}
            lessLabel={t.walker.less}
            moreLabel={t.walker.more}
          />
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.walker.operation}>
            {(['+', '-'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={op === value}
                onClick={() => setOp(value)}
                className={`rounded-2xl py-3 font-extrabold transition active:scale-95 ${op === value ? 'bg-plum-800 text-white' : 'bg-lavender-50 text-ink'}`}
              >
                {value === '+' ? t.walker.opAdd : t.walker.opSub}
              </button>
            ))}
          </div>
          <Stepper
            label={t.walker.operand}
            value={fmtInt(safeOperand)}
            onLess={() => shiftOperand(-1)}
            onMore={() => shiftOperand(1)}
            canLess={choices.indexOf(safeOperand) > 0}
            canMore={choices.indexOf(safeOperand) < choices.length - 1}
            lessLabel={t.walker.less}
            moreLabel={t.walker.more}
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setOperand(safeOperand);
                setGuess(start);
                setPhase('predict');
              }}
              className="rounded-2xl bg-accent py-3.5 font-extrabold text-white transition active:scale-95"
            >
              {t.walker.predict}
            </button>
            <button
              type="button"
              onClick={() => {
                setOperand(safeOperand);
                setPhase('walking');
              }}
              className="rounded-2xl border-2 border-accent py-3 font-extrabold text-accent transition active:scale-95"
            >
              {t.walker.skipGuess}
            </button>
          </div>
        </div>
      )}

      {phase === 'predict' && guess !== null && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-ink">{t.walker.guessPrompt}</p>
          <Stepper
            label={t.walker.guessLabel}
            value={fmtInt(guess)}
            onLess={() => setGuess((g) => (g ?? start) - 1)}
            onMore={() => setGuess((g) => (g ?? start) + 1)}
            canLess={guess > WALK_RANGE[0]}
            canMore={guess < WALK_RANGE[1]}
            lessLabel={t.walker.less}
            moreLabel={t.walker.more}
          />
          <button
            type="button"
            onClick={() => setPhase('walking')}
            className="w-full rounded-2xl bg-accent py-3.5 font-extrabold text-white transition active:scale-95"
          >
            {t.walker.lockGuess} 🔒
          </button>
        </div>
      )}

      {phase === 'walking' && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => finish(taken + 1)}
            className="rounded-2xl bg-accent py-3.5 font-extrabold text-white transition active:scale-95"
          >
            {t.walker.nextStep} ›
          </button>
          <button
            type="button"
            onClick={() => finish(plan.steps)}
            className="rounded-2xl bg-lavender-100 px-4 py-3.5 font-extrabold text-plum-700 transition active:scale-95"
          >
            {t.walker.finish} »
          </button>
        </div>
      )}

      {phase === 'done' && (
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-2xl border-2 border-accent py-3 font-extrabold text-accent transition active:scale-95"
        >
          ↺ {t.walker.reset}
        </button>
      )}
    </section>
  );
}
