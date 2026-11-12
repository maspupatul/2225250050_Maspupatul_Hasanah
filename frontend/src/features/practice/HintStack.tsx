import { BadgeCard } from '../../components/ui/BadgeCard';
import { t } from '../../i18n/id';
import type { Hint } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

const KIND_ICON: Record<Hint['kind'], string> = { meaning: '💬', visual: '🖼️', strategy: '🧭' };
const LEVEL_TONE = ['from-amber-300 to-amber-500', 'from-orange-300 to-accent', 'from-fuchsia-400 to-purple-600'];

/** Opened hints stay visible as a stack of badge cards, so students need not remember them. */
export function HintStack({ hints }: { hints: Hint[] }) {
  if (hints.length === 0) return null;
  return (
    <ul className="mt-4 space-y-3" aria-label={t.practice.hint}>
      {hints.map((hint, i) => (
        <BadgeCard
          key={hint.hint_level}
          badge={hint.hint_level}
          icon={KIND_ICON[hint.kind]}
          title={`${t.practice.hint} ${hint.hint_level} · ${t.practice.hintLevel[hint.hint_level - 1]}`}
          tone={LEVEL_TONE[hint.hint_level - 1]}
          index={i}
          dark
        >
          <p>{hint.text}</p>
          {hint.template && (
            <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center font-mono text-2xl font-black tracking-wide text-ink shadow-pop-soft">
              {hint.template}
            </p>
          )}
          {hint.visual && (
            <div className="mt-3 text-ink">
              <VisualView script={hint.visual} />
            </div>
          )}
        </BadgeCard>
      ))}
    </ul>
  );
}
