import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NoteProvider } from './store/NoteContext';
import { AuthProvider, ProtectedRoute } from './store/AuthContext';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NoteProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/workspace/:noteId?" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NoteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
