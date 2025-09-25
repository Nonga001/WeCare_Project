// src/components/DashboardLayout.jsx
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getNotifications, getUnreadCount, markAsRead } from "../services/notificationService";
import { useSocket } from "../context/SocketContext";

const DashboardLayout = ({ title, children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socketRef, status: socketStatus } = useSocket();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef(null);
  const [dropdownItems, setDropdownItems] = useState([]);
  const latestBefore = useRef(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme:dark");
      const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const enabled = saved === 'true' || (saved === null && prefers);
      setIsDark(enabled);
      document.documentElement.classList.toggle('dark', enabled);
    } catch {}
  }, []);

  useEffect(() => {
    let intervalId;
    const loadUnread = async () => {
      try {
        if (!user?.token) return;
        const count = await getUnreadCount(user.token);
        setUnreadCount(Number(count) || 0);
      } catch {}
    };
    loadUnread();
    intervalId = setInterval(loadUnread, 60000);
    return () => intervalId && clearInterval(intervalId);
  }, [user?.token, user?._id, user?.id]);

  // Refresh unread count on route changes and when window regains focus/visibility
  useEffect(() => {
    const refresh = async () => {
      try {
        if (!user?.token) return;
        const count = await getUnreadCount(user.token);
        setUnreadCount(Number(count) || 0);
      } catch {}
    };
    refresh();
  }, [location.pathname, user?.token]);

  useEffect(() => {
    const onFocusOrVisible = async () => {
      try {
        if (!user?.token) return;
        const count = await getUnreadCount(user.token);
        setUnreadCount(Number(count) || 0);
        if (showDropdown) {
          const latest = await getNotifications(user.token, { limit: 5 });
          setDropdownItems(latest);
        }
      } catch {}
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [user?.token, showDropdown]);

  // Live update unread counter and dropdown on socket events
  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;
    const refresh = async () => {
      try {
        if (!user?.token) return;
        const count = await getUnreadCount(user.token);
        setUnreadCount(Number(count) || 0);
        const latest = await getNotifications(user.token, { limit: 5 });
        setDropdownItems(latest);
      } catch {}
    };
    // Optimistic updates for immediate UI response
    const onNew = (n) => {
      setUnreadCount((c) => (Number(c) || 0) + 1);
      setDropdownItems((items) => [n, ...items].slice(0, 5));
      // Background sync
      refresh();
    };
    const onRead = ({ userId }) => {
      const uid = user?._id || user?.id;
      if ((String(userId) === String(uid))) {
        setUnreadCount((c) => Math.max(0, (Number(c) || 0) - 1));
        refresh();
      }
    };
    s.on("notification:new", onNew);
    s.on("notification:update", refresh);
    s.on("notification:delete", refresh);
    s.on("notification:read", onRead);
    return () => {
      try {
        s.off("notification:new", onNew);
        s.off("notification:update", refresh);
        s.off("notification:delete", refresh);
        s.off("notification:read", onRead);
      } catch {}
    };
  }, [socketRef?.current, user?.token, user?._id, user?.id]);

  useEffect(() => {
    const loadLatest = async () => {
      try {
        if (!user?.token) return;
        const latest = await getNotifications(user.token, { limit: 5 });
        setDropdownItems(latest);
      } catch {}
    };
    loadLatest();
  }, [user?.token]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showDropdown) return;
      const el = bellRef.current;
      if (el && !el.contains(e.target)) setShowDropdown(false);
    };
    const handleKeyDown = (e) => {
      if (!showDropdown) return;
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const markAllAsRead = async () => {
    try {
      const uid = user?._id || user?.id;
      const toMark = dropdownItems.filter(n => !(n.isRead || []).some(r => (r.user === uid) || (r.user?._id === uid) || (String(r.user) === String(uid))));
      // Optimistically reset unread counter and clear dropdown
      if (toMark.length > 0) {
        setUnreadCount(0);
        setDropdownItems([]);
      }
      for (const n of toMark) {
        await markAsRead(user?.token, n._id);
      }
      const latest = await getNotifications(user?.token, { limit: 5 });
      // If backend still returns items, keep UI decision: show empty after mark-all
      setDropdownItems([]);
      const count = await getUnreadCount(user?.token);
      setUnreadCount(Number(count) || 0);
    } catch {}
  };
  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme:dark', String(next)); } catch {}
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:bg-slate-950 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <header className="fixed top-0 left-0 right-0 w-full h-14 sm:h-16 lg:h-20 px-3 sm:px-4 lg:px-6 border-b border-slate-200 bg-white/95 backdrop-blur z-40 dark:bg-slate-900/95 dark:border-slate-800">
        <div className="w-full h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{title}</h1>
            <div className="flex items-center gap-2">
              <div className="relative" ref={bellRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="btn btn-ghost relative"
                title="Notifications"
              >
                <span className="relative inline-flex items-center">
                  <span>🔔</span>
                  <span className={`ml-1 w-2 h-2 rounded-full ${socketStatus === 'connected' ? 'bg-emerald-500' : socketStatus === 'reconnecting' ? 'bg-yellow-500' : 'bg-slate-400'}`}></span>
                </span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-rose-600 text-white text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-50">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Notifications</span>
                    <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">Mark all as read</button>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {dropdownItems.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">No recent notifications</div>
                    ) : (
                      dropdownItems.map((n) => (
                        <button key={n._id} onClick={() => {
                          const role = user?.role;
                          if (role === 'student') navigate('/dashboard/student/notifications');
                          else if (role === 'donor') navigate('/dashboard/donor');
                          else if (role === 'admin') navigate('/dashboard/admin/notifications');
                          else if (role === 'superadmin') navigate('/dashboard/superadmin/notifications');
                          setShowDropdown(false);
                        }} className="w-full text-left p-3 hover:bg-slate-50">
                          <div className="flex items-start gap-2">
                            {!((n.isRead||[]).some(r => (r.user === (user?._id||user?.id)) || (r.user?._id === (user?._id||user?.id)) || (String(r.user)===String(user?._id||user?.id)))) && (
                              <span className="mt-1 inline-block w-2 h-2 rounded-full bg-blue-600"></span>
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-800 truncate">{n.title}</div>
                              <div className="text-xs text-slate-600 truncate">{n.message}</div>
                              <div className="text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-100 text-right">
                    <button onClick={() => {
                      const role = user?.role;
                      if (role === 'student') navigate('/dashboard/student/notifications');
                      else if (role === 'donor') navigate('/dashboard/donor');
                      else if (role === 'admin') navigate('/dashboard/admin/notifications');
                      else if (role === 'superadmin') navigate('/dashboard/superadmin/notifications');
                      setShowDropdown(false);
                    }} className="text-sm text-blue-600 hover:underline">View all</button>
                  </div>
                </div>
              )}
              </div>
              <button onClick={toggleTheme} className="btn btn-ghost">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
          <div className="mt-0.5">
            <p className="text-slate-600 text-[12px] sm:text-[13px] dark:text-slate-300">
              Welcome, <span className="font-semibold text-slate-800 dark:text-slate-100">{user?.name || "User"}</span> 👋
              <span className="ml-2 text-slate-500 dark:text-slate-400">Role: {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "N/A"}</span>
            </p>
            {(user?.role === "admin" || user?.role === "student") && user?.isApproved === false && (
              <div className="mt-1 alert alert-warn">
                Awaiting approval. Some features are disabled until your account is verified.
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-10 pt-16 sm:pt-20 lg:pt-24 pb-16">
        {children}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 w-full h-12 px-3 sm:px-4 lg:px-6 flex items-center justify-center bg-slate-50/95 border-t border-slate-200 text-center dark:bg-slate-900/95 dark:border-slate-800">
        {(user?.role === "admin" || user?.role === "student") && user?.isApproved === false && (
          <div className="mb-4 alert alert-warn">
            <p className="font-medium">Account Pending Approval</p>
            <p>Please wait for approval from {user?.role === "admin" ? "Super Admin" : "your University Admin"} to access all features.</p>
          </div>
        )}
        <button
          onClick={logout}
          className="btn btn-secondary"
        >
          Logout
        </button>
      </footer>
    </div>
  );
};

export default DashboardLayout;
