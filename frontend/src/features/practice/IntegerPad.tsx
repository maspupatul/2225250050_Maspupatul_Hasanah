import type { Dispatch, SetStateAction } from 'react';
import { MINUS } from '../../lib/format';
import { t } from '../../i18n/id';

type Props = {
  value: string;
  /** State setter: updates are computed from the latest value, so fast taps are never lost. */
  onChange: Dispatch<SetStateAction<string>>;
  unit?: string;
  thousands: boolean;
};

export function applyKey(current: string, key: string): string {
  const negative = current.startsWith('-');
  const digits = negative ? current.slice(1) : current;
  if (key === 'sign') return negative ? digits : `-${digits}`;
  if (key === 'back') return negative ? `-${digits.slice(0, -1)}` : digits.slice(0, -1);
  if (digits.length >= 7) return current;
  return `${negative ? '-' : ''}${digits === '0' ? '' : digits}${key}`;
}

/** Custom keypad: many phone keyboards have no minus key in numeric mode. */
export function IntegerPad({ value, onChange, unit, thousands }: Props) {
  const negative = value.startsWith('-');
  const digits = negative ? value.slice(1) : value;
  const shown = digits
    ? `${negative ? MINUS : ''}${thousands ? Number(digits).toLocaleString('id-ID') : digits}`
    : negative
      ? MINUS
      : '';

  const press = (key: string) => onChange((current) => applyKey(current, key));

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'sign', '0', 'back'];
  return (
    <div>
      <output
        className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-lavender-300 bg-lavender-50 text-3xl font-black ${negative ? 'text-negative' : 'text-positive'}`}
        aria-label={t.practice.yourAnswer}
      >
        {shown || <span className="text-base font-semibold text-ink-muted">?</span>}
        {unit && shown && <span className="text-base font-bold text-ink-muted">{unit}</span>}
      </output>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            aria-label={key === 'sign' ? t.practice.signToggle : key === 'back' ? t.practice.backspace : key}
            className={`rounded-2xl py-3 text-xl font-extrabold active:scale-95 ${key === 'sign' ? 'bg-accent-soft text-accent' : 'bg-lavender-100 text-ink'}`}
          >
            {key === 'sign' ? `+/${MINUS}` : key === 'back' ? '⌫' : key}
          </button>
        ))}
      </div>
    </div>
  );
}
