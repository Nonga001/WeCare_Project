import { createContext, useContext, useEffect, useState } from "react";

// 1. Create Context
const AuthContext = createContext();

// 2. Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { role, token }
  const [loading, setLoading] = useState(true);

  const login = (data) => {
    // Expecting backend shape: { token, user: { id, name, email, role } }
    if (data && data.user && data.token) {
      const normalized = { ...data.user, token: data.token };
      setUser(normalized);
      try { localStorage.setItem("wecare:user", JSON.stringify(normalized)); } catch {}
    } else {
      setUser(data);
      try { localStorage.setItem("wecare:user", JSON.stringify(data)); } catch {}
    }
  };
  const logout = () => {
    setUser(null);
    try { localStorage.removeItem("wecare:user"); } catch {}
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