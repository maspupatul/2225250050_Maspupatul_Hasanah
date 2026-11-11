import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

export type ToastMessage = { id: number; text: string };

type Props = {
  toast: ToastMessage | null;
  onDone: () => void;
  duration?: number;
};

/** Short non-blocking message above the tab bar. The student can keep going at any time. */
export function Toast({ toast, onDone, duration = 2600 }: Props) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(timer);
  }, [toast, onDone, duration]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-28 z-30 mx-auto flex max-w-[480px] justify-center px-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.p
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-2xl bg-plum-900 px-4 py-3 text-center text-sm font-bold text-white shadow-card"
          >
            🔒 {toast.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
