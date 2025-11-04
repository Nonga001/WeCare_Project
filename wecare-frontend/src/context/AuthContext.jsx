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
      // Normalize user to include both `id` and `_id` so components that check
      // either form work consistently across the app.
      const normalized = { ...data.user, token: data.token };
      if (normalized.id && !normalized._id) normalized._id = normalized.id;
      if (normalized._id && !normalized.id) normalized.id = normalized._id;
      setUser(normalized);
      try { localStorage.setItem("wecare:user", JSON.stringify(normalized)); } catch {}
    } else {
      // If data is already a raw user object, try to normalize it as well.
      const raw = data || null;
      if (raw) {
        const normalized = { ...raw };
        if (normalized.id && !normalized._id) normalized._id = normalized.id;
        if (normalized._id && !normalized.id) normalized.id = normalized._id;
        setUser(normalized);
        try { localStorage.setItem("wecare:user", JSON.stringify(normalized)); } catch {}
      } else {
        setUser(null);
      }
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
          // Ensure both id/_id fields exist for compatibility
          if (parsed.id && !parsed._id) parsed._id = parsed.id;
          if (parsed._id && !parsed.id) parsed.id = parsed._id;
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