import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from '../components/ui/BottomNav';
import { AuthPage } from '../features/auth/AuthPage';
import { ExamIntroPage } from '../features/exam/ExamIntroPage';
import { ExamSessionPage } from '../features/exam/ExamSessionPage';
import { HomePage } from '../features/home/HomePage';
import { LessonPage } from '../features/lessons/LessonPage';
import { PracticeHubPage } from '../features/practice/PracticeHubPage';
import { PracticePage } from '../features/practice/PracticePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { TeacherDashboardPage } from '../features/teacher/TeacherDashboardPage';
import type { Role } from '../lib/types';
import { homeFor, useAuth } from '../store/auth';

/** Role guard: not logged in → /masuk; wrong role → that role's own home page. */
function RequireRole({ role }: { role: Role }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/masuk" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

/** Students get a phone-width app; the teacher dashboard may use the whole screen. */
function Shell({ children }: { children: ReactNode }) {
  const wide = useLocation().pathname.startsWith('/guru');
  return (
    <div className={`mx-auto min-h-dvh w-full bg-white ${wide ? 'max-w-6xl' : 'max-w-[480px] sm:shadow-card'}`}>
      {children}
    </div>
  );
}

export function App() {
  return (
    // reducedMotion="user": animations stop when the device asks for less motion
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/masuk" element={<AuthPage />} />
            <Route path="/selamat-datang" element={<Navigate to="/masuk" replace />} />

            <Route element={<RequireRole role="siswa" />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/pelajaran/:lessonId" element={<LessonPage />} />
              <Route path="/latihan" element={<PracticeHubPage />} />
              <Route path="/latihan/:lessonId" element={<PracticePage />} />
              <Route path="/ujian-akhir" element={<ExamIntroPage />} />
              <Route path="/ujian-akhir/mulai" element={<ExamSessionPage />} />
              <Route path="/profil" element={<ProfilePage />} />
            </Route>

            <Route element={<RequireRole role="guru" />}>
              <Route path="/guru/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/guru" element={<Navigate to="/guru/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {/* mounted once so the active-tab indicator can glide between tabs (students only) */}
          <BottomNav />
        </Shell>
      </BrowserRouter>
    </MotionConfig>
  );
}
