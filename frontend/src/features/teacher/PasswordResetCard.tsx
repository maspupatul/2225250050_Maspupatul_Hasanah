import { useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import { api } from '../../lib/api';

type Props = { studentId: number; studentName: string };

type State =
  | { kind: 'idle' }
  | { kind: 'confirm' }
  | { kind: 'busy' }
  | { kind: 'done'; username: string; password: string; copied: boolean }
  | { kind: 'error'; message: string };

/**
 * Rincian Progres → reset a forgotten student password. Two taps (ask, then confirm), then
 * the temporary password is shown once, large and copyable, for the teacher to pass on.
 */
export function PasswordResetCard({ studentId, studentName }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const reset = async () => {
    setState({ kind: 'busy' });
    try {
      const res = await api.resetStudentPassword(studentId);
      setState({ kind: 'done', username: res.username, password: res.temporary_password, copied: false });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : t.errors.generic });
    }
  };

  const copy = async (password: string) => {
    if (state.kind !== 'done') return;
    try {
      await navigator.clipboard.writeText(password);
      setState({ ...state, copied: true });
    } catch {
      // plain http on a school network: the password stays visible to copy by hand
    }
  };

  return (
    <section className="card-3d p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-extrabold">
        <Icon name="lock" size={18} className="text-plum-700" />
        {t.teacher.resetTitle}
      </h3>

      {state.kind === 'done' ? (
        <div className="mt-3" role="status">
          <p className="text-xs font-bold text-ink-muted [overflow-wrap:anywhere]">
            {t.teacher.resetDone(state.username)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="select-all font-mono text-2xl font-black tracking-[0.25em] text-accent">
              {state.password}
            </span>
            <button
              type="button"
              onClick={() => void copy(state.password)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition active:translate-y-0.5 ${
                state.copied
                  ? 'bg-emerald-100 text-correct'
                  : 'bg-plum-800 text-white shadow-[0_3px_0_#231a2f] active:shadow-none'
              }`}
            >
              <Icon name={state.copied ? 'check' : 'copy'} size={14} strokeWidth={state.copied ? 3 : 2} />
              {state.copied ? t.teacher.copied : t.teacher.resetCopy}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">{t.teacher.resetNote}</p>
        </div>
      ) : state.kind === 'confirm' || state.kind === 'busy' ? (
        <div className="mt-3">
          <p className="text-sm font-bold leading-6">{t.teacher.resetConfirm(studentName)}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void reset()}
              disabled={state.kind === 'busy'}
              className="btn-3d-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {t.teacher.resetYes}
            </button>
            <button
              type="button"
              onClick={() => setState({ kind: 'idle' })}
              disabled={state.kind === 'busy'}
              className="btn-3d-soft flex-1 px-4 py-2.5 text-sm"
            >
              {t.teacher.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-ink-muted">{t.teacher.resetLead}</p>
          {state.kind === 'error' && (
            <p className="mt-2 text-sm font-bold text-amber-800" role="alert">
              {state.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => setState({ kind: 'confirm' })}
            className="btn-3d-soft mt-3 px-4 py-2.5 text-sm"
          >
            {t.teacher.resetButton}
          </button>
        </div>
      )}
    </section>
  );
}
