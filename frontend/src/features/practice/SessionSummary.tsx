import { t } from '../../i18n/id';
import { averageWeight, type Outcome } from '../../lib/score';
import { OutcomeStats } from './OutcomeStats';

type Props = { outcomes: Outcome[]; onHome: () => void; onAgain: () => void };

export function SessionSummary({ outcomes, onHome, onAgain }: Props) {
  const mastery = averageWeight(outcomes);
  const stars = mastery >= 0.8 ? 3 : mastery >= 0.5 ? 2 : 1;

  return (
    <div className="text-center">
      <p className="text-4xl tracking-widest" aria-label={`${stars} / 3`}>
        {'★'.repeat(stars)}
        <span className="text-lavender-300">{'★'.repeat(3 - stars)}</span>
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-ink">{t.summary.title}</h2>
      <OutcomeStats outcomes={outcomes} />
      <button type="button" onClick={onHome} className="mt-6 w-full rounded-2xl bg-accent py-3.5 font-extrabold text-white">
        {t.summary.home}
      </button>
      <button type="button" onClick={onAgain} className="mt-2 w-full rounded-2xl py-3 font-extrabold text-plum-700">
        ↺ {t.summary.again}
      </button>
    </div>
  );
}
