import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { t } from '../../i18n/id';
import { BrandText } from './BrandName';
import { Icon } from './Icon';
import { ZLogo } from './ZLogo';

type Props = { onClose: () => void };

const a = t.about;
const CREDITS: [string, string][] = [
  [a.name, a.developerName],
  [a.nim, a.developerNim],
  [a.program, a.developerProgram],
];

/** "Tentang ℤ-Math": a short description plus developer credits. Render inside <AnimatePresence>. */
export function AboutModal({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-plum-950/60 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <motion.div
        className="max-h-[92dvh] w-full max-w-[420px] overflow-y-auto rounded-t-4xl bg-lavender-50 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] text-ink sm:rounded-4xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <ZLogo size={44} />
          <h2 id="about-title" className="min-w-0 flex-1 text-lg font-extrabold leading-tight">
            <BrandText text={a.title} brandClassName="font-brand font-extrabold" />
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-lavender-200 bg-white text-plum-700 active:scale-95"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink">
          <BrandText text={a.body} />
        </p>

        <section className="mt-4 rounded-3xl border-2 border-lavender-200 bg-white p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-plum-700">{a.developerTitle}</h3>
          <dl className="mt-2 space-y-2 text-sm">
            {CREDITS.map(([term, value]) => (
              <div key={term} className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-ink-muted">{term}</dt>
                <dd className="font-extrabold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </motion.div>
    </motion.div>
  );
}
