import { BadgeCard } from '../../components/ui/BadgeCard';
import { Icon, type IconName } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import type { Hint } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

const KIND_ICON: Record<Hint['kind'], IconName> = {
  meaning: 'chat',
  visual: 'image',
  strategy: 'compass',
};
const LEVEL_TONE = ['from-amber-300 to-amber-500', 'from-orange-300 to-accent', 'from-fuchsia-400 to-purple-600'];

/**
 * Opened hints stay visible as a stack of badge cards, so students need not remember them.
 * Smart Hint text (Gemini) replaces the static sentence when the server sends one; the
 * static template and visual always stay. Without it (offline, quota) the static text shows.
 */
export function HintStack({ hints, loading = false }: { hints: Hint[]; loading?: boolean }) {
  if (hints.length === 0 && !loading) return null;
  return (
    <ul className="mt-4 space-y-3" aria-label={t.practice.hint} aria-busy={loading}>
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
          {hint.ai_text ? (
            <>
              <p className="mb-1 flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide opacity-80">
                <Icon name="sparkles" size={14} />
                {t.practice.hintAi}
              </p>
              <p>{hint.ai_text}</p>
            </>
          ) : (
            <p>{hint.text}</p>
          )}
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
      {loading && (
        <li
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-lavender-100 px-4 py-3 text-sm font-bold text-ink-muted"
        >
          <Icon name="hourglass" size={18} />
          {t.practice.hintLoading}
        </li>
      )}
    </ul>
  );
}
