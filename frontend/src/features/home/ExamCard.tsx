import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { t } from '../../i18n/id';

const MotionLink = motion.create(Link);

type Props = {
  unlocked: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  problemCount: number;
  best: number | null;
};

/** The finish line of the path: gradient frame (plum → gold) and the prerequisite progress. */
export function ExamCard({ unlocked, lessonsDone, lessonsTotal, problemCount, best }: Props) {
  const percent = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  return (
    <MotionLink
      to="/ujian-akhir"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="mt-4 block rounded-[2rem] bg-gradient-to-br from-amber-300 via-accent to-plum-600 p-[3px] shadow-card outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
    >
      <div className="relative overflow-hidden rounded-[calc(2rem-3px)] bg-gradient-to-br from-plum-800 via-plum-800 to-plum-950 p-5 text-white">
        <span
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-300/15 blur-2xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-4">
          <motion.span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl ${unlocked ? 'bg-gradient-to-br from-amber-200 to-accent' : 'bg-white/10'}`}
            animate={unlocked ? { rotate: [0, -6, 6, 0] } : undefined}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }}
            aria-hidden="true"
          >
            🏆
          </motion.span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300">{t.exam.subtitle}</p>
            <p className="text-xl font-black">{t.exam.title}</p>
            <p className="text-xs text-white/70">{unlocked ? t.exam.cardBody(problemCount) : t.exam.lockedBody}</p>
          </div>
          <span className="text-2xl" aria-hidden="true">
            {unlocked ? '›' : '🔒'}
          </span>
        </div>

        <div className="relative mt-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{t.home.lessonsDone(lessonsDone, lessonsTotal)}</span>
            {best !== null && <span className="text-amber-300">{t.exam.best(best)}</span>}
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </MotionLink>
  );
}
