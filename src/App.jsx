import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { NoteProvider } from './store/NoteContext';
import { AuthProvider, ProtectedRoute } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SharedNotePage = lazy(() => import('./pages/SharedNotePage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <NoteProvider>
            <Routes>
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
            <Route path="/shared/:token" element={<Suspense fallback={<PageLoader />}><SharedNotePage /></Suspense>} />
            <Route path="/" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>} />
            <Route path="/trash" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><TrashPage /></Suspense></ProtectedRoute>} />
            <Route path="/workspace/:noteId?" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Workspace /></Suspense></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NoteProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
