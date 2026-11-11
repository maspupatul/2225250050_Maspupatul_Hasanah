import { displayToken, type Operator, type Token } from '../../lib/format';
import { t } from '../../i18n/id';

const OPERATORS: { value: Operator; label: string }[] = [
  { value: '+', label: '+' },
  { value: '-', label: '−' },
  { value: '*', label: '×' },
  { value: '/', label: ':' },
  { value: '(', label: '(' },
  { value: ')', label: ')' },
];

type Props = {
  chips: number[];
  tokens: Token[];
  onChange: (tokens: Token[]) => void;
  thousands: boolean;
};

/** Build a mathematical sentence by tapping numbers and operators (F-20). */
export function ExpressionBuilder({ chips, tokens, onChange, thousands }: Props) {
  return (
    <div>
      <div
        className="flex min-h-14 flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-lavender-300 bg-lavender-50 px-3 py-3 text-xl font-extrabold"
        aria-label={t.practice.yourModel}
        aria-live="polite"
      >
        {tokens.length === 0 ? (
          <span className="text-sm font-semibold text-ink-muted">{t.practice.emptyModel}</span>
        ) : (
          tokens.map((tok, i) => (
            <span
              key={i}
              className={
                tok.kind === 'num'
                  ? `rounded-lg bg-white px-1.5 ${tok.value < 0 ? 'text-negative' : 'text-positive'}`
                  : 'text-ink'
              }
            >
              {displayToken(tok, thousands)}
            </span>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {chips.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange([...tokens, { kind: 'num', value }])}
            className={`rounded-2xl border-2 px-3.5 py-2 text-base font-extrabold active:scale-95 ${value < 0 ? 'border-negative/30 text-negative' : 'border-positive/30 text-positive'}`}
          >
            {displayToken({ kind: 'num', value }, thousands)}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-8 gap-1.5">
        {OPERATORS.map((op) => (
          <button
            key={op.value}
            type="button"
            onClick={() => onChange([...tokens, { kind: 'op', value: op.value }])}
            className="rounded-xl bg-lavender-100 py-2.5 text-lg font-extrabold text-ink active:scale-95"
          >
            {op.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(tokens.slice(0, -1))}
          className="rounded-xl bg-lavender-100 py-2.5 text-lg font-extrabold text-ink active:scale-95"
          aria-label={t.practice.backspace}
        >
          ⌫
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded-xl bg-lavender-100 py-2.5 text-xs font-extrabold text-ink active:scale-95"
        >
          {t.practice.clear}
        </button>
      </div>
    </div>
  );
}
