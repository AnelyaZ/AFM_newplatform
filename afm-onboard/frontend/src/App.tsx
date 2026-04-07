import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChaptersPage from './pages/ChaptersPage';
import AdminCoursesPage from './pages/AdminCoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ChapterDetailPage from './pages/ChapterDetailPage';
import TestRunnerPage from './pages/TestRunnerPage';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toaster';
import AdminChapterContentPage from './pages/AdminChapterContentPage';
import AdminLessonsPage from './pages/AdminLessonsPage';
import AdminLessonContentPage from './pages/AdminLessonContentPage';
import AdminTestBuilderPage from './pages/AdminTestBuilderPage';
import AdminLessonTestBuilderPage from './pages/AdminLessonTestBuilderPage';
import AdminCourseTestBuilderPage from './pages/AdminCourseTestBuilderPage';
import LessonPage from './pages/LessonPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
// import BottomNav from './components/BottomNav';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import FirstLoginPage from './pages/FirstLoginPage';
import ProfilePage from './pages/ProfilePage';
import { useEffect, useRef } from 'react';
import api from './lib/api';
import AdminUserProfilePage from './pages/AdminUserProfilePage';
import CourseLearnPage from './pages/CourseLearnPage';
import AdminChapterPage from './pages/AdminChapterPage';

function PrivateRoute({ children }: { children: React.ReactElement }) {
  return children;
}


function AdminRoute({ children }: { children: React.ReactElement }) {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'ADMIN' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const access = useAuthStore((s) => s.accessToken);
  const refresh = useAuthStore((s) => s.refreshToken);
  const user = useAuthStore((s) => s.user);
  const setTokens = useAuthStore((s) => s.setTokens);
  const logout = useAuthStore((s) => s.logout);
  const bootstrapped = useRef(false);

  useEffect(() => {
    const bootstrap = async () => {
      if (bootstrapped.current) return;
      if (!hydrated) return;
      bootstrapped.current = true;
if (!access && user?.id && refresh) {
  try {
    const { data } = await api.post('/auth/refresh', { userId: user.id, refreshToken: refresh });
    setTokens({ accessToken: data.accessToken, refreshToken: refresh });
  } catch {
    // do nothing
  }
}

    };
    void bootstrap();
  }, [hydrated, access, refresh, user, setTokens, logout]);

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route
            path="/first-login"
            element={
              <PrivateRoute>
                <FirstLoginPage />
              </PrivateRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminUsersPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminUserProfilePage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminCoursesPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <PrivateRoute>
                <Layout>
                  <CourseDetailPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/kursy/:courseId"
            element={
              <PrivateRoute>
                <Layout>
                  <CourseLearnPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/courses/:courseId/test"
            element={
              <PrivateRoute>
                <Layout>
                  <TestRunnerPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/preview/tests/:testId"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <TestRunnerPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/chapters/:id/contents"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminChapterContentPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/chapters/:id"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminChapterPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/courses/:courseId/test"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminCourseTestBuilderPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/chapters/:id/test"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminTestBuilderPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/chapters/:id/lessons"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminLessonsPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/chapters/:id/lessons/:lessonId"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminLessonContentPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/lessons/:lessonId/test"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminLessonTestBuilderPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminDashboardPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Layout>
                    <AdminSettingsPage />
                  </Layout>
                </AdminRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/lessons/:lessonId"
            element={
              <PrivateRoute>
                <Layout>
                  <LessonPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/chapters/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <ChapterDetailPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/chapters/:chapterId/test"
            element={
              <PrivateRoute>
                <Layout>
                  <TestRunnerPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/lessons/:lessonId/test"
            element={
              <PrivateRoute>
                <Layout>
                  <TestRunnerPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <ChaptersPage />
                </Layout>
              </PrivateRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Layout>
                  <EmployeeProfilePage />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
