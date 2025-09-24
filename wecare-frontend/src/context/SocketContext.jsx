import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io as clientIO } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext({ socketRef: null, status: "disconnected" });

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [status, setStatus] = useState("disconnected");

  const url = useMemo(() => {
    return "http://localhost:5000";
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    const s = clientIO(url, {
      transports: ["websocket"],
      auth: { token: user.token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = s;
    s.on("connect", () => setStatus("connected"));
    s.on("disconnect", () => setStatus("disconnected"));
    s.on("reconnect_attempt", () => setStatus("reconnecting"));
    return () => {
      try { s.close(); } catch {}
      socketRef.current = null;
      setStatus("disconnected");
    };
  }, [user?.token, url]);

  return (
    <SocketContext.Provider value={{ socketRef, status }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);


