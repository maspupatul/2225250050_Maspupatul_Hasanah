import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; badge?: number };

/** Small circular icon button used on dark headers (✕, 💡, ⚙). */
export function RoundButton({ label, children, badge, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`relative grid h-10 w-10 place-items-center rounded-full border border-white/20 text-white transition active:scale-95 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-extrabold">
          {badge}
        </span>
      )}
    </button>
  );
}
