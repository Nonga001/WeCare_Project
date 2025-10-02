import { createContext, useContext, useEffect, useState } from "react";

// 1. Create Context
const AuthContext = createContext();

// 2. Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { role, token }
  const [loading, setLoading] = useState(true);

  const login = (data) => {
    // Expecting backend shape: { token, user: { id, name, email, role }, authMethod }
    if (data && data.user) {
      const normalized = { 
        ...data.user, 
        token: data.token,
        authMethod: data.authMethod || 'legacy'
      };
      setUser(normalized);
      
      // Only store in localStorage as fallback for legacy compatibility
      // Secure authentication now uses httpOnly cookies
      if (data.authMethod !== 'secure_cookies') {
        try { 
          localStorage.setItem("wecare:user", JSON.stringify(normalized)); 
        } catch (e) {
          console.warn('LocalStorage not available:', e.message);
        }
      } else {
        // For secure cookie auth, only store user info (no token)
        const userInfo = { ...normalized };
        delete userInfo.token; // Don't store token in localStorage for security
        try {
          localStorage.setItem("wecare:user", JSON.stringify(userInfo));
        } catch (e) {
          console.warn('LocalStorage not available:', e.message);
        }
      }
    } else {
      setUser(data);
    }
  };
  
  const logout = async () => {
    try {
      // Call backend logout to clear httpOnly cookies
      const response = await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('Logout request failed, clearing local session anyway');
      }
    } catch (error) {
      console.warn('Logout error:', error.message);
    } finally {
      // Always clear local state
      setUser(null);
      try { localStorage.removeItem("wecare:user"); } catch {}
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("wecare:user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token && parsed.role) {
          setUser(parsed);
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom Hook (this must exist)
export const useAuth = () => {
  return useContext(AuthContext);
};