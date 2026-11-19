import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { Toggle } from '../../components/ui/Toggle';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';
import type { SchoolClass } from '../../lib/types';

type Props = {
  classes: SchoolClass[];
  onCreated: (created: SchoolClass) => void;
};

/** Tanya Asisten on/off for the students of one class (privacy: the teacher decides). */
function AssistantSwitch({ school }: { school: SchoolClass }) {
  const [on, setOn] = useState(school.assistant_enabled !== false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.setClassAssistant(school.class_code, next);
      setOn(updated.assistant_enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 border-t border-lavender-200 pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-extrabold text-ink">
          <Icon name="chat" size={16} className="shrink-0 text-plum-700" />
          {t.teacher.assistantSwitch}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] font-bold text-ink-muted">
            {on ? t.teacher.assistantOn : t.teacher.assistantOff}
          </span>
          <span className={busy ? 'pointer-events-none opacity-60' : ''}>
            <Toggle
              checked={on}
              onChange={(next) => void change(next)}
              label={`${t.teacher.assistantSwitch} ${school.class_name}`}
            />
          </span>
        </span>
      </div>
      {error && (
        <p className="mt-1 text-xs font-bold text-amber-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CopyButton({ code }: { code: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState('copied');
    } catch {
      setState('failed'); // e.g. plain http on a school network: the code stays visible to copy by hand
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-live="polite"
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition active:translate-y-0.5 ${
        state === 'copied' ? 'bg-emerald-100 text-correct' : 'bg-plum-800 text-white shadow-[0_3px_0_#231a2f] active:shadow-none'
      }`}
    >
      <Icon name={state === 'copied' ? 'check' : 'copy'} size={14} strokeWidth={state === 'copied' ? 3 : 2} />
      {state === 'copied' ? t.teacher.copied : state === 'failed' ? t.teacher.copyFailed(code) : t.teacher.copyCode}
    </button>
  );
}

/** Kelola Kelas: create classes and hand out their join codes. */
export function ClassManager({ classes, onCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCreated(await api.createClass(name.trim()));
      setName('');
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card-3d space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-extrabold">
          <Icon name="users" size={20} className="text-plum-700" />
          {t.teacher.classesTitle}
        </h2>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="btn-3d-primary px-4 py-2 text-sm">
            <Icon name="plus-circle" size={18} />
            {t.teacher.newClass}
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={(e) => void submit(e)} className="rounded-3xl bg-lavender-50 p-3">
          <label htmlFor="new-class-name" className="block text-sm font-extrabold">
            {t.teacher.className}
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              id="new-class-name"
              autoFocus
              value={name}
              maxLength={20}
              placeholder={t.teacher.classNamePlaceholder}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="min-w-0 flex-1 rounded-2xl border-2 border-lavender-200 bg-white px-4 py-2.5 font-bold uppercase outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={!name.trim() || busy} className="btn-3d-primary flex-1 px-5 py-2.5 text-sm">
                {t.teacher.create}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setError(null);
                }}
                className="btn-3d-soft flex-1 px-4 py-2.5 text-sm"
              >
                {t.teacher.cancel}
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm font-bold text-amber-800" role="alert">
              {error}
            </p>
          )}
        </form>
      )}

      {classes.length === 0 ? (
        !creating && <p className="text-sm font-bold text-ink-muted">{t.teacher.noClasses}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <li key={c.id} className="rounded-3xl border-2 border-lavender-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-lg font-black leading-tight">{c.class_name}</p>
                <span className="rounded-full bg-lavender-100 px-2.5 py-1 text-[11px] font-extrabold text-plum-700">
                  {t.teacher.studentsJoined(c.student_count)}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
                {t.teacher.codeLabel}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="select-all font-mono text-xl font-black tracking-[0.25em] text-accent">{c.class_code}</span>
                <CopyButton code={c.class_code} />
              </div>
              <AssistantSwitch school={c} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
