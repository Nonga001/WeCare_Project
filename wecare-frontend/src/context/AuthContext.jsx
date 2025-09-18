import { createContext, useContext, useState } from "react";

// 1. Create Context
const AuthContext = createContext();

// 2. Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { role, token }

  const login = (data) => {
    // Expecting backend shape: { token, user: { id, name, email, role } }
    if (data && data.user && data.token) {
      const normalized = { ...data.user, token: data.token };
      setUser(normalized);
    } else {
      setUser(data);
    }
  };
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom Hook (this must exist)
export const useAuth = () => {
  return useContext(AuthContext);
};