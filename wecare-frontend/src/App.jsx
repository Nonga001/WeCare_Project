import { useEffect } from 'react'
import { Toaster } from 'sonner'
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

function App() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme:dark");
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const enabled = saved === 'true' || (saved === null && prefers);
      document.documentElement.classList.toggle('dark', enabled);
    } catch {}
  }, []);

 return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App