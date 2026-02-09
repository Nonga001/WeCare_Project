import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { io as clientIO } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext({ socketRef: null, status: "disconnected" });

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [status, setStatus] = useState("disconnected");

  const url = useMemo(() => {
    return import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "http://localhost:5000";
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
    s.on("connect", () => {
      setStatus("connected");
      toast.success("Connected to realtime updates");
    });
    s.on("disconnect", (reason) => {
      setStatus("disconnected");
      toast.error(reason === "io client disconnect" ? "Disconnected" : "Connection lost. Reconnecting...");
    });
    s.on("reconnect_attempt", () => {
      setStatus("reconnecting");
      toast.info("Reconnecting...");
    });
    const onNotification = (n) => {
      if (!n) return;
      toast.message(n.title || "New notification", {
        description: n.message || "",
      });
    };

    const onGroupMessage = (data) => {
      const msg = data?.message;
      if (!msg || msg.isAIGenerated) return;
      const uid = user?._id || user?.id;
      if (uid && String(msg.sender) === String(uid)) return;
      toast.message(`New message from ${msg.senderName || "Member"}`, {
        description: msg.text || "",
      });
    };

    s.on("notification:new", onNotification);
    s.on("group:message", onGroupMessage);

    return () => {
      try { s.off("notification:new", onNotification); } catch {}
      try { s.off("group:message", onGroupMessage); } catch {}
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


