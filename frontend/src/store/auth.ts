import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AccountUser } from '../lib/types';
import { safeStorage } from '../lib/safeStorage';
import { useProgress, type ProgressSnapshot } from './progress';

export interface Session {
  token: string;
  user: AccountUser;
  /** Only for students: their progress stored on the server. */
  progress?: ProgressSnapshot;
}

interface AuthState {
  token: string | null;
  user: AccountUser | null;
  signIn: (session: Session) => void;
  signOut: () => void;
  /** Replace the account details (e.g. after joining a class); the session stays. */
  setUser: (user: AccountUser) => void;
}

/** Login session (JWT) kept on the device. Students' progress is replaced by the account's. */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      signIn: ({ token, user, progress }) => {
        if (user.role === 'siswa') {
          if (progress) useProgress.getState().hydrate(user.name, progress);
          else useProgress.getState().setName(user.name);
        } else {
          useProgress.getState().signOut(); // a teacher never keeps a student's progress on the device
        }
        set({ token, user });
      },
      signOut: () => {
        useProgress.getState().signOut();
        set({ token: null, user: null });
      },
      setUser: (user) => set({ user }),
    }),
    { name: 'zmath-session-v1', storage: createJSONStorage(() => safeStorage) },
  ),
);

/** Where each role lands after login. */
export const homeFor = (user: AccountUser | null) => (user?.role === 'guru' ? '/guru/dashboard' : '/');
