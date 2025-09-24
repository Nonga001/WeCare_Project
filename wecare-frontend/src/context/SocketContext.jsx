import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { io as clientIO } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  const url = useMemo(() => {
    return "http://localhost:5000";
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    const s = clientIO(url, {
      transports: ["websocket"],
      auth: { token: user.token },
    });
    socketRef.current = s;
    return () => {
      try { s.close(); } catch {}
      socketRef.current = null;
    };
  }, [user?.token, url]);

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);


