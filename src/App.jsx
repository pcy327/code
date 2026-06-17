import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <RouterProvider router={router} />;
}
