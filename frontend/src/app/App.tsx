import { MotionConfig } from 'framer-motion';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ExamIntroPage } from '../features/exam/ExamIntroPage';
import { ExamSessionPage } from '../features/exam/ExamSessionPage';
import { HomePage } from '../features/home/HomePage';
import { LessonPage } from '../features/lessons/LessonPage';
import { WelcomePage } from '../features/onboarding/WelcomePage';
import { PracticeHubPage } from '../features/practice/PracticeHubPage';
import { PracticePage } from '../features/practice/PracticePage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { useProgress } from '../store/progress';

function RequireName() {
  const name = useProgress((s) => s.name);
  return name ? <Outlet /> : <Navigate to="/selamat-datang" replace />;
}

export function App() {
  return (
    // reducedMotion="user": animations stop when the device asks for less motion
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white sm:shadow-card">
          <Routes>
            <Route path="/selamat-datang" element={<WelcomePage />} />
            <Route element={<RequireName />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/pelajaran/:lessonId" element={<LessonPage />} />
              <Route path="/latihan" element={<PracticeHubPage />} />
              <Route path="/latihan/:lessonId" element={<PracticePage />} />
              <Route path="/ujian-akhir" element={<ExamIntroPage />} />
              <Route path="/ujian-akhir/mulai" element={<ExamSessionPage />} />
              <Route path="/profil" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </MotionConfig>
  );
}
