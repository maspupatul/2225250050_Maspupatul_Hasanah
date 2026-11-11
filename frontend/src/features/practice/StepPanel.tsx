import { useState } from 'react';
import { fmtInt, parseIntInput, serializeTokens, type Token } from '../../lib/format';
import type { StepDef } from '../../lib/types';
import { t } from '../../i18n/id';
import { ExpressionBuilder } from './ExpressionBuilder';
import { IntegerPad } from './IntegerPad';

type Props = {
  step: StepDef;
  interpretOptions: string[] | null;
  thousands: boolean;
  busy: boolean;
  onSubmit: (answer: number | string | number[]) => void;
};

/** Input for the active step. Re-mounted (key) for each step so state resets. */
export function StepPanel({ step, interpretOptions, thousands, busy, onSubmit }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [raw, setRaw] = useState('');

  const options = step.key === 'interpret' ? interpretOptions ?? [] : (step.options ?? []);
  let ready = false;
  let submit = () => {};

  if (step.input === 'number_chips') {
    ready = selected.length > 0;
    submit = () => onSubmit(selected);
  } else if (step.input === 'choice') {
    ready = choice !== null;
    submit = () => choice !== null && onSubmit(choice);
  } else if (step.input === 'expression_builder') {
    ready = tokens.length > 0;
    submit = () => onSubmit(serializeTokens(tokens));
  } else {
    const parsed = parseIntInput(raw);
    ready = parsed !== null;
    submit = () => parsed !== null && onSubmit(parsed);
  }

  return (
    <div>
      <p className="mb-3 text-sm font-extrabold text-plum-700">{step.prompt}</p>

      {step.input === 'number_chips' && (
        <div className="flex flex-wrap justify-center gap-2">
          {(step.options as number[]).map((value) => {
            const on = selected.includes(value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(on ? selected.filter((v) => v !== value) : [...selected, value])}
                className={`min-w-16 rounded-2xl border-2 px-4 py-2.5 text-lg font-extrabold transition active:scale-95 ${
                  on
                    ? value < 0
                      ? 'border-negative bg-negative text-white'
                      : 'border-positive bg-positive text-white'
                    : value < 0
                      ? 'border-negative/30 text-negative'
                      : 'border-positive/30 text-positive'
                }`}
              >
                {fmtInt(value, thousands)}
              </button>
            );
          })}
        </div>
      )}

      {step.input === 'choice' && (
        <div className="space-y-2" role="radiogroup">
          {options.map((option, i) => (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={choice === i}
              onClick={() => setChoice(i)}
              className={`w-full rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-bold transition ${
                choice === i ? 'border-accent bg-accent-soft text-ink' : 'border-lavender-200 text-ink'
              }`}
            >
              {String(option)}
            </button>
          ))}
        </div>
      )}

      {step.input === 'expression_builder' && (
        <ExpressionBuilder chips={step.chips ?? []} tokens={tokens} onChange={setTokens} thousands={thousands} />
      )}

      {step.input === 'integer' && <IntegerPad value={raw} onChange={setRaw} unit={step.unit} thousands={thousands} />}

      <button
        type="button"
        disabled={!ready || busy}
        onClick={submit}
        className="mt-4 w-full rounded-2xl bg-accent py-3.5 text-base font-extrabold text-white transition active:scale-[0.98] disabled:opacity-40"
      >
        {t.practice.check}
      </button>
    </div>
  );
}
