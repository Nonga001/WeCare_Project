import { useEffect } from 'react'
import { Toaster } from 'sonner'
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ErrorBoundary from "./components/ErrorBoundary";

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
    <ErrorBoundary level="page">
      <AuthProvider>
        <ErrorBoundary level="section">
          <SocketProvider>
            <ErrorBoundary level="component">
              <AppRoutes />
            </ErrorBoundary>
            <Toaster richColors position="top-right" />
          </SocketProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App