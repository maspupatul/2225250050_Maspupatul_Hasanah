import { t } from '../../i18n/id';
import { examScore, stageScores, type Outcome } from '../../lib/score';
import type { ExamStage } from '../../lib/types';
import { OutcomeStats } from '../practice/OutcomeStats';

type Props = {
  outcomes: Outcome[];
  stages: ExamStage[];
  newBest: boolean;
  onHome: () => void;
  onAgain: () => void;
};

const R = 52;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Final score (ring), a positive message, and the score of every stage. */
export function ExamResult({ outcomes, stages, newBest, onHome, onAgain }: Props) {
  const score = examScore(outcomes);
  const perStage = stageScores(outcomes, stages);

  return (
    <div className="text-center">
      <div className="relative mx-auto h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#eeedf6" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="#f26b3a"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <p className="text-4xl font-black text-ink">{score}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{t.exam.score}</p>
          </div>
        </div>
      </div>

      <h2 className="mt-3 text-2xl font-extrabold text-ink">{t.exam.resultTitle}</h2>
      <p className="mt-1 font-bold text-plum-700">{t.exam.grade(score)}</p>
      {newBest && (
        <p className="mx-auto mt-2 w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-extrabold text-accent-dark">
          {t.exam.newBest}
        </p>
      )}

      <section className="mt-5 rounded-3xl bg-lavender-50 p-4 text-left">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{t.exam.perStage}</h3>
        <ul className="mt-3 space-y-3">
          {perStage.map((s, i) => (
            <li key={s.key}>
              <div className="flex items-center justify-between text-sm font-bold text-ink">
                <span>
                  {t.exam.stage(i + 1)} · {s.title}
                </span>
                <span className="text-ink-muted">{s.score}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-lavender-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-accent transition-all duration-700"
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">{t.exam.gradeNote}</p>
      </section>

      <OutcomeStats outcomes={outcomes} />

      <button type="button" onClick={onHome} className="mt-6 w-full rounded-2xl bg-accent py-3.5 font-extrabold text-white">
        {t.summary.home}
      </button>
      <button type="button" onClick={onAgain} className="mt-2 w-full rounded-2xl py-3 font-extrabold text-plum-700">
        ↺ {t.exam.again}
      </button>
    </div>
  );
}
