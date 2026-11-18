import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { TrophyArt } from '../../components/ui/TrophyArt';
import { t } from '../../i18n/id';
import { LANE_WIDTH, ROW_HEIGHT } from './PathLesson';

const MotionLink = motion.create(Link);

// Geometry of the connector from the last lesson node down to the exam medallion.
const MEDALLION = 64;
const MEDALLION_X = 20 + MEDALLION / 2; // left-5 + half the medallion
const CARD_GAP = 48; // mt-12 above the card
const SECTION_GAP = 8; // mb-2 under each LessonPath
const LAST_NODE_BOTTOM = 28 + 4; // half of the 56 px node + its ring
// from the bottom of the last node to the top edge of the card (= medallion centre)
const CONNECTOR_HEIGHT = ROW_HEIGHT / 2 + SECTION_GAP + CARD_GAP - LAST_NODE_BOTTOM;

type Props = {
  unlocked: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  problemCount: number;
  best: number | null;
  /** Horizontal centre (px) of the last lesson node, where the connector starts. */
  fromX: number;
};

/** Soft geometric texture in the top-right corner (quiet, no meaning of its own). */
function CornerTexture() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden="true">
      <svg className="absolute -right-6 -top-6" width="150" height="150" viewBox="0 0 150 150">
        <g fill="none" stroke="#fbbf24" strokeOpacity="0.14" strokeWidth="1.5">
          <circle cx="120" cy="30" r="34" />
          <circle cx="120" cy="30" r="56" />
          <circle cx="120" cy="30" r="78" />
        </g>
        <g fill="#ffffff" fillOpacity="0.08">
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3].map((col) => <circle key={`${row}-${col}`} cx={62 + col * 12} cy={70 + row * 12} r="1.6" />),
          )}
        </g>
      </svg>
    </span>
  );
}

/** The last node of the learning path: the Tantangan Akhir Bab (Ujian Akhir). */
export function ExamCard({ unlocked, lessonsDone, lessonsTotal, problemCount, best, fromX }: Props) {
  const percent = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const h = CONNECTOR_HEIGHT;
  const d = `M${fromX},0 C${fromX},${h * 0.55} ${MEDALLION_X},${h * 0.45} ${MEDALLION_X},${h}`;

  return (
    <div className="relative mt-12">
      <svg
        className="pointer-events-none absolute left-0"
        style={{ top: -h }}
        width={LANE_WIDTH}
        height={h}
        viewBox={`0 0 ${LANE_WIDTH} ${h}`}
        aria-hidden="true"
      >
        {unlocked ? (
          <motion.path
            d={d}
            fill="none"
            stroke="#f26b3a"
            strokeWidth={6}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6 }}
          />
        ) : (
          <path d={d} fill="none" stroke="#e3e1f0" strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" />
        )}
      </svg>

      <MotionLink
        to="/ujian-akhir"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="group relative block rounded-[2rem] bg-[#2D2142] px-5 pb-5 pt-4 text-white shadow-[0_5px_0_#1c1429] outline-none ring-1 ring-white/5 transition-shadow focus-visible:ring-4 focus-visible:ring-accent/50 active:shadow-none"
      >
        <CornerTexture />

        {/* medallion = the path's final node, half over the top edge */}
        <span
          className={`absolute -top-8 left-5 grid place-items-center rounded-full bg-[#2D2142] ring-4 ring-lavender-50 ${unlocked ? 'shadow-[inset_0_0_0_2px_rgba(251,191,36,0.45)]' : ''}`}
          style={{ width: MEDALLION, height: MEDALLION }}
        >
          <TrophyArt size={40} muted={!unlocked} />
          {!unlocked && (
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-plum-700 text-white ring-2 ring-lavender-50">
              <Icon name="lock" size={13} />
            </span>
          )}
        </span>

        <div className="relative flex items-start gap-3">
          <div className="min-w-0 flex-1 pl-[76px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-300/90">
              {t.exam.cardEyebrow}
            </p>
            <p className="text-lg font-black leading-tight">{t.exam.cardTitle}</p>
          </div>
          <span
            className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 ${
              unlocked ? 'bg-amber-300 text-[#2D2142] shadow-[0_3px_0_#d97706]' : 'bg-white/10 text-white/60'
            }`}
            aria-hidden="true"
          >
            <Icon name={unlocked ? 'chevron-right' : 'lock'} size={unlocked ? 22 : 18} />
          </span>
        </div>

        <p className="relative mt-3 text-sm leading-snug text-white/75">
          {unlocked ? t.exam.cardBody(problemCount) : t.exam.lockedBody}
        </p>

        <div className="relative mt-4">
          <div className="flex items-center justify-between text-xs font-bold text-white/80">
            <span>{t.home.lessonsDone(lessonsDone, lessonsTotal)}</span>
            {best !== null && <span className="text-amber-300">{t.exam.best(best)}</span>}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
        </div>
      </MotionLink>
    </div>
  );
}
