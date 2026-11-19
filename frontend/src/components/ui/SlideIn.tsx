import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  /** Changing the key plays the transition (e.g. the lesson slide number). */
  id: string | number;
  /** 1 = forward (enter from the right), −1 = back (enter from the left). */
  direction?: 1 | -1;
  children: ReactNode;
  className?: string;
};

/** Shared motion for moving forward/back between screens (docs/UI-UX.md). */
export const SLIDE_SHIFT_PX = 16;
export const SLIDE_DURATION_S = 0.26;
export const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Directional enter: the new content glides in from the side we move towards (16 px) while
 * fading in, in 260 ms. There is no exit animation, so the new screen is there at once and
 * every button works immediately (nothing waits for the old screen to leave). Off entirely
 * when the device asks for reduced motion.
 */
export function SlideIn({ id, direction = 1, children, className }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      key={id}
      className={className}
      initial={reduceMotion ? false : { opacity: 0, x: direction * SLIDE_SHIFT_PX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: SLIDE_DURATION_S, ease: SLIDE_EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Scroll back to the top when the screen changes: smooth, or instant with reduced motion. */
export function scrollToTop(): void {
  const reduce =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
