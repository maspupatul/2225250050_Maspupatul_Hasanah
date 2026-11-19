import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { RmtTag } from '../../components/ui/RmtTag';
import { t } from '../../i18n/id';
import { ApiError, api } from '../../lib/api';
import type { ChatMessage, StepKey } from '../../lib/types';

const a = t.assistant;
const MAX_TEXT = 300;
const SENT_MESSAGES = 6; // the server only looks at the recent turns

type Props = {
  attemptId: string;
  step: { key: StepKey; label: string };
  /** Kept by the parent for this problem only (memory, never storage). */
  messages: ChatMessage[];
  onMessages: (update: (list: ChatMessage[]) => ChatMessage[]) => void;
  onClose: () => void;
};

const isWide = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches;

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === 'siswa';
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[15px] leading-6 [overflow-wrap:anywhere] ${
          mine ? 'rounded-br-lg bg-plum-800 text-white' : 'rounded-bl-lg bg-white text-ink shadow-pop-soft'
        }`}
      >
        <span className="sr-only">{mine ? a.you : a.bot}: </span>
        {message.text}
      </p>
    </li>
  );
}

/**
 * Tanya Asisten: a chat that guides the thinking for the active step (RMT mediator) and never
 * gives the answer (the server checks every reply). Bottom sheet on phones, side panel on wide
 * screens, like Buku Saku. The problem underneath keeps its answer and progress.
 */
export function AssistantSheet({ attemptId, step, messages, onMessages, onClose }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null);
  const [wide] = useState(isWide);
  const closeRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, busy]);

  const send = async (raw: string) => {
    const question = raw.trim().slice(0, MAX_TEXT);
    if (!question || busy) return;
    const conversation = [...messages, { role: 'siswa' as const, text: question }];
    onMessages(() => conversation);
    setText('');
    setError(null);
    setBusy(true);
    try {
      const res = await api.askAssistant(attemptId, conversation.slice(-SENT_MESSAGES));
      onMessages((list) => [...list, { role: 'asisten', text: res.reply }]);
      setTurnsLeft(res.turns_left);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'NETWORK'
          ? a.offline
          : err instanceof Error
            ? err.message
            : t.errors.generic,
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  const hidden = wide ? { x: '100%' } : { y: '100%' };
  const rmt = t.rmt.step[step.key];
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-plum-950/50 lg:items-stretch lg:justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85dvh] w-full max-w-[480px] flex-col rounded-t-4xl bg-lavender-50 text-ink lg:h-full lg:w-[420px] lg:rounded-none lg:rounded-l-4xl"
        initial={hidden}
        animate={{ x: 0, y: 0 }}
        exit={hidden}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <header className="border-b border-lavender-200 px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon name="chat" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="assistant-title" className="text-lg font-extrabold leading-tight">
                {a.title}
              </h2>
              <p className="text-xs text-ink-muted">{a.subtitle}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={a.close}
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-lavender-200 bg-white text-plum-700 active:scale-95"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          {/* one step at a time: the assistant only talks about the active step */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-plum-700">{a.stepNow(step.label)}</span>
            <RmtTag phase={rmt.phase} action={rmt.action} />
          </div>
        </header>

        <ul className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
          <Bubble message={{ role: 'asisten', text: a.greeting }} />
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {busy && (
            <li className="flex items-center gap-2 text-sm font-bold text-ink-muted">
              <Icon name="hourglass" size={16} />
              {a.thinking}
            </li>
          )}
          {error && (
            <li className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800" role="alert">
              {error}
            </li>
          )}
          <li ref={endRef} aria-hidden="true" />
        </ul>

        <div className="border-t border-lavender-200 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          {/* ready-made questions: less typing for 12–14 year olds (extraneous load) */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {a.quick.map((q) => (
              <button
                key={q}
                type="button"
                disabled={busy}
                onClick={() => void send(q)}
                className="rounded-full border-2 border-lavender-200 bg-white px-3 py-1 text-xs font-bold text-plum-700 active:scale-95 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-end gap-2">
            <label className="sr-only" htmlFor="assistant-input">
              {a.placeholder}
            </label>
            <input
              id="assistant-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TEXT}
              placeholder={a.placeholder}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-2xl border-2 border-lavender-200 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              aria-label={a.send}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-white active:scale-95 disabled:opacity-50"
            >
              <Icon name="chevron-right" size={22} strokeWidth={3} />
            </button>
          </form>
          <p className="mt-2 text-[11px] leading-4 text-ink-muted">
            {a.privacy}
            {turnsLeft !== null && <> · {a.turnsLeft(turnsLeft)}</>}
          </p>
        </div>
      </motion.aside>
    </motion.div>
  );
}
