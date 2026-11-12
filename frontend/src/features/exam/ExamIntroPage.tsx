import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BadgeCard } from '../../components/ui/BadgeCard';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { bestExamScore, examUnlocked, percentDone, useProgress } from '../../store/progress';

// Steps of a staircase: each stage is one step higher (gradual difficulty).
const STEP_HEIGHT = ['h-10', 'h-16', 'h-24'];
// one pop gradient + lip per difficulty (never the sign colours blue/red/grey)
const STEP_TONE = [
  'from-amber-300 to-amber-500 shadow-pop-amber',
  'from-orange-400 to-accent shadow-pop-accent',
  'from-fuchsia-500 to-purple-600 shadow-pop-fuchsia',
];
const RULE_ICONS = ['⏳', '💡', '🔍', '🔁'];
const MotionLink = motion.create(Link);

/** `/ujian-akhir`: what the exam contains, the rules, and the start button. */
export function ExamIntroPage() {
  const { data: info, error, reload } = useApi(() => api.exam(), []);
  const { data: modules } = useApi(() => api.modules(), []);
  const lessons = useProgress((s) => s.lessons);
  const best = bestExamScore(useProgress((s) => s.examResults));

  const unlocked = modules ? examUnlocked(modules, lessons) : false;
  const percent = modules ? percentDone(modules, lessons) : 0;

  return (
    <div className="min-h-dvh bg-lavender-50 pb-32">
      <header className="rounded-b-[2.5rem] bg-plum-800 px-6 pb-14 pt-[calc(env(safe-area-inset-top)+24px)] text-white">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/60">{t.appName}</p>
        <div className="mt-3 flex items-center gap-4">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-amber-300 to-accent text-3xl shadow-card"
            aria-hidden="true"
          >
            🏆
          </span>
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight">{t.exam.title}</h1>
            <p className="text-sm text-white/70">{t.exam.subtitle}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-white/80">{t.exam.intro}</p>
      </header>

      <main className="-mt-8 space-y-4 px-4">
        <section className="card-3d rounded-4xl p-5">
          <h2 className="text-sm font-extrabold text-ink">{t.exam.stagesTitle}</h2>
          {error && !info && (
            <button type="button" onClick={reload} className="mt-3 text-sm font-bold text-accent">
              {t.home.loadError} {t.home.retry} ›
            </button>
          )}
          {!info && !error && <div className="mt-3 h-28 animate-pulse rounded-3xl bg-lavender-100" />}
          {info && (
            <ol className="mt-4 grid grid-cols-3 items-end gap-3">
              {info.stages.map((stage, i) => (
                <li key={stage.key} className="flex flex-col items-center text-center">
                  <span className="text-[11px] font-bold text-ink-muted">{t.exam.stageCount(stage.count)}</span>
                  <motion.span
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 + i * 0.12 }}
                    style={{ originY: 1 }}
                    className={`mb-[5px] mt-1 grid w-full place-items-center rounded-2xl bg-gradient-to-b text-xl font-black text-white ${STEP_HEIGHT[i] ?? 'h-24'} ${STEP_TONE[i] ?? STEP_TONE[2]}`}
                  >
                    {i + 1}
                  </motion.span>
                  <span className="mt-2 text-xs font-extrabold leading-tight text-ink">{stage.title}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="mb-3 px-1 text-sm font-extrabold text-ink">{t.exam.rulesTitle}</h2>
          <ul className="space-y-3">
            {t.exam.rules.map((rule, i) => (
              <BadgeCard key={rule} badge={RULE_ICONS[i] ?? i + 1} index={i}>
                <p className="font-semibold">{rule}</p>
              </BadgeCard>
            ))}
          </ul>
        </section>

        {unlocked ? (
          <MotionLink to="/ujian-akhir/mulai" whileTap={{ scale: 0.97 }} className="btn-3d-primary w-full py-4 text-lg">
            {t.exam.start} ›
          </MotionLink>
        ) : (
          <div className="card-3d p-5 text-center">
            <p className="text-2xl" aria-hidden="true">
              🔒
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{t.exam.lockedBody}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-lavender-200">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-xs font-bold text-ink-muted">
              {percent}% {t.home.completed}
            </p>
          </div>
        )}

        {best !== null && <p className="text-center text-sm font-bold text-ink-muted">{t.exam.best(best)}</p>}
      </main>
    </div>
  );
}
