import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { averageWeight, type Outcome } from '../../lib/score';
import { OutcomeStats } from './OutcomeStats';

type Props = { outcomes: Outcome[]; onHome: () => void; onAgain: () => void };

export function SessionSummary({ outcomes, onHome, onAgain }: Props) {
  const mastery = averageWeight(outcomes);
  const stars = mastery >= 0.8 ? 3 : mastery >= 0.5 ? 2 : 1;

  return (
    <div className="text-center">
      <p className="flex justify-center gap-1" role="img" aria-label={`${stars} / 3`}>
        {[0, 1, 2].map((i) => (
          <Icon
            key={i}
            name="star"
            size={40}
            className={i < stars ? 'text-amber-400 [&_path]:[fill-opacity:1]' : 'text-lavender-300'}
          />
        ))}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-ink">{t.summary.title}</h2>
      <OutcomeStats outcomes={outcomes} />
      <button type="button" onClick={onHome} className="btn-3d-primary mt-6 w-full">
        {t.summary.home}
      </button>
      <button type="button" onClick={onAgain} className="btn-3d-soft mt-3 w-full text-plum-700">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="refresh" size={18} />
          {t.summary.again}
        </span>
      </button>
    </div>
  );
}
