import { motion, type HTMLMotionProps } from 'framer-motion';

type Variant = 'primary' | 'dark' | 'soft' | 'selected';

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-3d-primary',
  dark: 'btn-3d-dark',
  soft: 'btn-3d-soft',
  selected: 'btn-3d-selected',
};

type Props = Omit<HTMLMotionProps<'button'>, 'type'> & { variant?: Variant; block?: boolean };

/** 3D "pop" button: stands on a lip, sinks when pressed, gives a small spring bounce on tap. */
export function PopButton({ variant = 'primary', block = false, className = '', ...rest }: Props) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      className={`${VARIANT_CLASS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}
