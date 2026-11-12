import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  /** Changing the key plays the transition (e.g. the problem number). */
  id: string | number;
  /** 1 = next (enter from the right), −1 = back (enter from the left). */
  direction?: 1 | -1;
  children: ReactNode;
  className?: string;
};

// enter from outside on the side we move towards, bounce into the centre, leave quickly the other way
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 120 : -120, opacity: 0, scale: 0.95 }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25, opacity: { duration: 0.2 } },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.16, ease: 'easeIn' },
  }),
} as const;

/**
 * Slide + fade + soft spring between two contents (problems, lesson screens).
 * Short (≈0.3 s) and switched off by MotionConfig when the device asks for reduced motion.
 */
export function SlideIn({ id, direction = 1, children, className }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={id}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
