import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NoteProvider } from './store/NoteContext';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';

export default function App() {
  return (
    <BrowserRouter>
      <NoteProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workspace/:noteId?" element={<Workspace />} />
        </Routes>
      </NoteProvider>
    </BrowserRouter>
  );
}
