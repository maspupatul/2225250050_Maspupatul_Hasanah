import { motion } from 'framer-motion';
import { BadgeCard } from '../../components/ui/BadgeCard';
import { PopButton } from '../../components/ui/PopButton';
import { t } from '../../i18n/id';
import type { Twin } from '../../lib/types';
import { VisualView } from '../visuals/VisualView';

/**
 * Soal Kembar: a fully worked example with different numbers and context.
 * Render inside <AnimatePresence> so the sheet slides up and down.
 */
export function TwinSheet({ twin, onClose }: { twin: Twin; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-plum-950/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="twin-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-4xl bg-lavender-50 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] text-ink"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-lavender-300" />
        <h2 id="twin-title" className="text-lg font-extrabold">
          🔁 {t.practice.twinTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{t.practice.twinOffer}</p>
        <p className="card-3d mt-4 px-4 py-3 font-bold leading-7">{twin.text}</p>
        <ol className="mt-4 space-y-3">
          {twin.steps.map((step, i) => (
            <BadgeCard key={step.key} badge={i + 1} title={step.label} index={i}>
              <p className="font-bold">{step.content}</p>
              <p className="mt-1 text-[13px] leading-6 text-ink-muted">{step.why}</p>
            </BadgeCard>
          ))}
        </ol>
        {twin.visual && (
          <div className="mt-4">
            <VisualView script={twin.visual} />
          </div>
        )}
        <PopButton onClick={onClose} block className="mt-5">
          {t.practice.twinBack} ›
        </PopButton>
      </motion.div>
    </motion.div>
  );
}
