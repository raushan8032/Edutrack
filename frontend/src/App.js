import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InstructorDashboardPage from './pages/InstructorDashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LessonPage from './pages/LessonPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import InstructorPage from './pages/InstructorPage';
import DoubtsPage from './pages/DoubtsPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => {
  const { user } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 'var(--navbar-h)' }}>
      {user && <Sidebar />}
      <div style={{
        flex: 1,
        marginLeft: user ? 'var(--sidebar-w)' : 0,
        minWidth: 0,
      }}>
        <main style={{ padding: '24px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {/* Navbar fixed at top — spans full width over sidebar + content */}
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout>{user?.role === 'instructor' || user?.role === 'admin' ? <InstructorDashboardPage /> : <DashboardPage />}</AppLayout></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><AppLayout>{user?.role === 'instructor' || user?.role === 'admin' ? <InstructorPage /> : <CoursesPage />}</AppLayout></ProtectedRoute>} />
        <Route path="/courses/:id" element={<ProtectedRoute><AppLayout><CourseDetailPage /></AppLayout></ProtectedRoute>} />
        <Route path="/courses/:courseId/lessons/:lessonId" element={<ProtectedRoute><AppLayout><LessonPage /></AppLayout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/doubts" element={<ProtectedRoute><AppLayout><DoubtsPage /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
        <Route path="/instructor" element={<ProtectedRoute><Navigate to={user?.role === 'instructor' || user?.role === 'admin' ? '/courses' : '/dashboard'} replace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function ToastWrapper() {
  const { isDark } = useTheme();
  return <ToastContainer position="top-right" autoClose={3000} theme={isDark ? 'dark' : 'light'} />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <ToastWrapper />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
