import { useState } from 'react';
import { fmtInt, parseIntInput, serializeTokens, type Token } from '../../lib/format';
import type { StepDef } from '../../lib/types';
import { motion } from 'framer-motion';
import { PopButton } from '../../components/ui/PopButton';
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

  const options = step.key === 'interpret' ? (interpretOptions ?? []) : (step.options ?? []);
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
              <motion.button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected(on ? selected.filter((v) => v !== value) : [...selected, value])}
                animate={{ scale: on ? [1, 1.12, 1] : 1 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                // sign colours keep their meaning; the darker lip is the same hue
                className={`min-w-16 rounded-2xl border-2 px-4 py-2.5 text-lg font-extrabold transition-[transform,box-shadow] active:translate-y-1 active:shadow-none ${
                  on
                    ? value < 0
                      ? 'border-negative bg-negative text-white shadow-[0_4px_0_#991b1b]'
                      : 'border-positive bg-positive text-white shadow-[0_4px_0_#1e3a8a]'
                    : value < 0
                      ? 'border-negative/30 bg-white text-negative shadow-[0_4px_0_#fecaca]'
                      : 'border-positive/30 bg-white text-positive shadow-[0_4px_0_#bfdbfe]'
                }`}
              >
                {fmtInt(value, thousands)}
              </motion.button>
            );
          })}
        </div>
      )}

      {step.input === 'choice' && (
        <div className="space-y-3" role="radiogroup">
          {options.map((option, i) => (
            <PopButton
              key={String(option)}
              role="radio"
              aria-checked={choice === i}
              onClick={() => setChoice(i)}
              variant={choice === i ? 'selected' : 'soft'}
              block
              animate={{ scale: choice === i ? [1, 1.03, 1] : 1 }}
              className="!justify-start text-left text-[15px] font-bold"
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${choice === i ? 'bg-accent text-white' : 'bg-lavender-100 text-plum-700'}`}
                aria-hidden="true"
              >
                {String.fromCharCode(65 + i)}
              </span>
              {String(option)}
            </PopButton>
          ))}
        </div>
      )}

      {step.input === 'expression_builder' && (
        <ExpressionBuilder chips={step.chips ?? []} tokens={tokens} onChange={setTokens} thousands={thousands} />
      )}

      {step.input === 'integer' && <IntegerPad value={raw} onChange={setRaw} unit={step.unit} thousands={thousands} />}

      <PopButton disabled={!ready || busy} onClick={submit} block className="mt-5 text-base">
        {t.practice.check}
      </PopButton>
    </div>
  );
}
