import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { StatTile } from '../../components/ui/StatTile';
import { Icon } from '../../components/ui/Icon';
import { STAT_TONE } from '../../components/ui/statTones';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { ModuleBars } from './ModuleBars';
import { StatusBadge } from './StatusBadge';

type Props = { studentId: number; onClose: () => void };

/** Details of one student: progress per module, weak lessons, exam history. Render inside <AnimatePresence>. */
export function StudentDetailModal({ studentId, onClose }: Props) {
  const { data, error, loading } = useApi(() => api.studentDetail(studentId), [studentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-plum-950/60 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
    >
      <motion.div
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-4xl bg-lavender-50 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] text-ink sm:rounded-4xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{t.teacher.detailTitle}</p>
            <h2 id="student-detail-title" className="truncate text-xl font-black">
              {data?.name ?? t.common.loading}
            </h2>
            {data && (
              <p className="text-xs text-ink-muted">
                @{data.username} · {t.teacher.lastActive(data.last_active)}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-3d-soft shrink-0 px-4 py-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="close" size={16} />
              {t.teacher.close}
            </span>
          </button>
        </div>

        {loading && !data && <div className="mt-4 h-40 animate-pulse rounded-3xl bg-lavender-100" />}
        {error && !data && <p className="mt-4 text-sm font-bold text-amber-800">{error}</p>}

        {data && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              <span className="text-sm font-bold text-ink-muted">
                {data.percent_done}% · {t.teacher.mastery(data.avg_mastery)}
              </span>
            </div>

            <section className="card-3d p-4">
              <h3 className="mb-2 text-sm font-extrabold">{t.teacher.perModule}</h3>
              <ModuleBars modules={data.modules} />
            </section>

            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <StatTile icon="check-circle" tone={STAT_TONE.correct} value={data.correct} label={t.teacher.stats.correct} />
              <StatTile icon="sparkles" tone={STAT_TONE.selfFound} value={data.self_found} label={t.teacher.stats.selfFound} index={1} />
              <StatTile icon="lightbulb" tone={STAT_TONE.hints} value={data.hints_used} label={t.teacher.stats.hints} index={2} />
              <StatTile icon="refresh" tone={STAT_TONE.deferred} value={data.deferred} label={t.teacher.stats.deferred} index={3} />
              <StatTile icon="flame" tone={STAT_TONE.streak} value={data.streak} label={t.teacher.stats.streak} index={4} />
              <StatTile icon="calendar" tone={STAT_TONE.days} value={data.active_days} label={t.teacher.stats.activeDays} index={5} />
            </ul>

            <section className="card-3d p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold">
                <Icon name="target" size={18} className="text-accent" />
                {t.teacher.weakTitle}
              </h3>
              {data.weak_lessons.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">{t.teacher.weakNone}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.weak_lessons.map((w) => (
                    <li key={w.id} className="rounded-2xl bg-lavender-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2 text-sm font-bold">
                        <span className="min-w-0 truncate">{t.teacher.weakItem(w.number, w.title)}</span>
                        <span className="shrink-0 text-xs text-ink-muted">
                          {w.status === 'done'
                            ? `${w.mastery}%`
                            : w.status === 'in_progress'
                              ? t.teacher.inProgress
                              : t.teacher.notStarted}
                        </span>
                      </div>
                      {w.status === 'done' && (
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-lavender-200">
                          <span className="block h-full rounded-full bg-amber-400" style={{ width: `${w.mastery}%` }} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-3d p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold">
                <Icon name="trophy" size={18} className="text-amber-500" />
                {t.teacher.examHistory}
              </h3>
              {data.exam_history.length === 0 ? (
                <p className="mt-2 text-sm text-ink-muted">{t.teacher.noExam}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {[...data.exam_history].reverse().map((e, i) => (
                    <li key={`${e.date}-${i}`} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 font-bold text-ink-muted">{e.date}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-lavender-200">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-accent"
                          style={{ width: `${e.score}%` }}
                        />
                      </span>
                      <span className="w-8 text-right font-black">{e.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
