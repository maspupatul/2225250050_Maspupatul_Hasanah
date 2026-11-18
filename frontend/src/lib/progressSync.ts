import { useAuth } from '../store/auth';
import { snapshotOf, useProgress } from '../store/progress';
import { api, configureAuth } from './api';

const DEBOUNCE_MS = 1500;

/**
 * Every change to a student's progress is pushed to the server shortly afterwards
 * (lessons, correct answers, hints, exam scores, active days). Failed pushes (offline)
 * are retried on the next change and when the device comes back online.
 */
export function startProgressSync(): () => void {
  configureAuth(
    () => useAuth.getState().token,
    () => useAuth.getState().signOut(), // expired or invalid session: ask to log in again
  );

  let timer: number | undefined;
  let dirty = false;

  const push = async () => {
    const { user } = useAuth.getState();
    if (!dirty || user?.role !== 'siswa') return;
    dirty = false;
    try {
      await api.syncProgress(snapshotOf(useProgress.getState()));
    } catch {
      dirty = true; // try again later
    }
  };

  const schedule = () => {
    dirty = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void push(), DEBOUNCE_MS);
  };

  const unsubscribe = useProgress.subscribe((state, previous) => {
    if (snapshotChanged(state, previous)) schedule();
  });
  const online = () => void push();
  window.addEventListener('online', online);
  return () => {
    unsubscribe();
    window.removeEventListener('online', online);
    window.clearTimeout(timer);
  };
}

function snapshotChanged(a: object, b: object): boolean {
  const keys = ['lessons', 'stats', 'examResults', 'activeDays', 'reviewQueue'] as const;
  return keys.some((k) => (a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]);
}
