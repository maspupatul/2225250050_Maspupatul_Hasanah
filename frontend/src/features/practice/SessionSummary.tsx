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
      <button type="button" onClick={onHome} className="btn-3d-primary mt-6 w-full">
        {t.summary.home}
      </button>
      <button type="button" onClick={onAgain} className="btn-3d-soft mt-3 w-full text-plum-700">
        ↺ {t.summary.again}
      </button>
    </div>
  );
}
