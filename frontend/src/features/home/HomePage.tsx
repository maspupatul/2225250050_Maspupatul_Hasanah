import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '../../components/ui/BottomNav';
import { Toast, type ToastMessage } from '../../components/ui/Toast';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import {
  bestExamScore,
  examUnlocked,
  lessonStates,
  percentDone,
  streakDays,
  totalStars,
  useProgress,
} from '../../store/progress';
import { ExamCard } from './ExamCard';
import { LessonPath } from './LessonPath';

function Badge({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="flex h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-extrabold ring-1 ring-white/15"
      title={label}
      aria-label={label}
    >
      <span aria-hidden="true">{icon}</span>
      {value}
    </motion.span>
  );
}

export function HomePage() {
  const { data: modules, error, loading, reload } = useApi(() => api.modules(), []);
  const { data: examInfo } = useApi(() => api.exam(), []);
  const name = useProgress((s) => s.name);
  const lessons = useProgress((s) => s.lessons);
  const activeDays = useProgress((s) => s.activeDays);
  const queue = useProgress((s) => s.reviewQueue.length);
  const bestExam = bestExamScore(useProgress((s) => s.examResults));
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const states = modules ? lessonStates(modules, lessons) : {};
  const percent = modules ? percentDone(modules, lessons) : 0;
  const allLessons = modules?.flatMap((m) => m.lessons) ?? [];
  const doneCount = allLessons.filter((l) => lessons[l.id]?.status === 'done').length;
  const streak = streakDays(activeDays);
  const stars = totalStars(lessons);
  const showLocked = () => setToast({ id: Date.now(), text: t.home.lockedToast });

  return (
    <div className="min-h-dvh bg-lavender-50 pb-32">
      <header className="relative overflow-hidden bg-plum-800 px-6 pb-16 pt-[calc(env(safe-area-inset-top)+20px)] text-white">
        <span
          className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5">
            <span
              className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-lg font-black"
              aria-hidden="true"
            >
              Z
            </span>
            <span className="text-lg font-black tracking-tight">{t.appName}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Badge icon="🔥" value={streak} label={t.home.streak(streak)} />
            <Badge icon="⭐" value={stars} label={t.home.stars(stars)} />
            <Link
              to="/profil"
              aria-label={t.nav.profile}
              className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-accent text-lg font-black text-plum-900 ring-2 ring-white/30 transition active:scale-90"
            >
              {name.charAt(0).toUpperCase() || '🙂'}
            </Link>
          </span>
        </div>

        <p className="relative mt-7 text-sm tracking-wide text-white/70">{t.home.completed}</p>
        <h1 className="relative text-[28px] font-extrabold leading-tight">
          {percent}% {t.subject}
        </h1>
        <div
          className="relative mt-3 h-3 overflow-hidden rounded-full bg-plum-950/60 ring-1 ring-white/10"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% ${t.subject}`}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(percent, 2)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="relative mt-1.5 text-xs font-bold text-white/60">
          {t.home.lessonsDone(doneCount, allLessons.length)}
        </p>
      </header>

      <main className="relative -mt-10 rounded-t-4xl bg-lavender-50 px-4 pt-6">
        {queue > 0 && (
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/latihan/ulang"
              className="mb-4 flex items-center gap-3 rounded-3xl bg-accent-soft px-4 py-3 text-ink shadow-sm"
            >
              <span className="text-2xl" aria-hidden="true">
                🔁
              </span>
              <span className="flex-1">
                <span className="block text-sm font-extrabold">{t.home.reviewTitle}</span>
                <span className="block text-xs text-ink-muted">{t.home.reviewBody(queue)}</span>
              </span>
              <span className="text-sm font-extrabold text-accent">{t.home.reviewCta} ›</span>
            </Link>
          </motion.div>
        )}

        {loading && !modules && (
          <ul className="space-y-3" aria-label={t.common.loading}>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-20 animate-pulse rounded-3xl bg-lavender-100" />
            ))}
          </ul>
        )}

        {error && !modules && (
          <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
            <p className="text-sm text-ink">{t.home.loadError}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 rounded-2xl bg-accent px-5 py-2 text-sm font-extrabold text-white transition active:scale-95"
            >
              {t.home.retry}
            </button>
          </div>
        )}

        {modules?.map((module) => (
          <LessonPath key={module.id} module={module} states={states} progress={lessons} onLocked={showLocked} />
        ))}

        {modules && (
          <ExamCard
            unlocked={examUnlocked(modules, lessons)}
            lessonsDone={doneCount}
            lessonsTotal={allLessons.length}
            problemCount={examInfo?.total ?? 12}
            best={bestExam}
          />
        )}
      </main>
      <Toast toast={toast} onDone={clearToast} />
      <BottomNav />
    </div>
  );
}
