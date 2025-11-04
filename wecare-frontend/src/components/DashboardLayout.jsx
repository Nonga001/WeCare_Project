// src/components/DashboardLayout.jsx
import { useAuth } from "../context/AuthContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
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

  const isStudentDashboard = location.pathname.startsWith("/dashboard/student");
  const isAdminDashboard = location.pathname.startsWith("/dashboard/admin");
  const isDonorDashboard = location.pathname.startsWith("/dashboard/donor");
  const isSuperAdminDashboard = location.pathname.startsWith("/dashboard/superadmin");
  const isVerifiedStudent = user?.role === "superadmin" ? true : user?.isApproved || false;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const compact = window.innerWidth <= (window.screen?.width || 1024) / 2 || window.innerWidth < 768;
        setIsCompact(compact);
      } catch {
        setIsCompact(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Prevent body scroll when mobile side nav is open to avoid layout/content overlap
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return;
  }, [mobileOpen]);

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
            {/* Left: WeCare + Role */}
            <div className="flex items-center gap-3">
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100">
                WeCare{user?.role === 'student' ? ' Student' : user?.role === 'donor' ? ' Donor' : user?.role === 'admin' ? ' Admin' : user?.role === 'superadmin' ? ' SuperAdmin' : ''}
              </h1>
            </div>
            {/* Right: tabs (on desktop), avatar/name, bell, theme. On compact screens show hamburger instead of tabs */}
            <div className="flex items-center gap-3">
              {/* Tabs on larger screens (hidden when compact) - Student */}
              {isStudentDashboard && user?.role === 'student' && !isCompact && (
                <nav className="flex items-center gap-2">
                  <NavLink
                    to="/dashboard/student"
                    end
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Home</NavLink>
                  <NavLink
                    to="/dashboard/student/profile"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Profile</NavLink>
                  <NavLink
                    to="/dashboard/student/aid"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Aid</NavLink>
                  <NavLink
                    to="/dashboard/student/support"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Support</NavLink>
                  <NavLink
                    to="/dashboard/student/notifications"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Notifications</NavLink>
                </nav>
              )}

              {/* Tabs on larger screens (hidden when compact) - Admin */}
              {isAdminDashboard && user?.role === 'admin' && !isCompact && (
                <nav className="flex items-center gap-2">
                  <NavLink
                    to="/dashboard/admin"
                    end
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Home</NavLink>
                  <NavLink
                    to="/dashboard/admin/profile"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Profile</NavLink>
                  <NavLink
                    to="/dashboard/admin/verify"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Verify</NavLink>
                  <NavLink
                    to="/dashboard/admin/aid"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Aid</NavLink>
                  <NavLink
                    to="/dashboard/admin/groups"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Groups</NavLink>
                  <NavLink
                    to="/dashboard/admin/reports"
                    onClick={(e) => { if (!isVerifiedStudent) e.preventDefault(); }}
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : `${!isVerifiedStudent ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}`}
                  >Reports</NavLink>
                  <NavLink
                    to="/dashboard/admin/notifications"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Notifications</NavLink>
                </nav>
              )}

              {/* Tabs on larger screens (hidden when compact) - Donor */}
              {isDonorDashboard && user?.role === 'donor' && !isCompact && (
                <nav className="flex items-center gap-2">
                  <NavLink
                    to="/dashboard/donor"
                    end
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Home</NavLink>
                  <NavLink
                    to="/dashboard/donor/profile"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Profile</NavLink>
                  <NavLink
                    to="/dashboard/donor/donations"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Donations</NavLink>
                  <NavLink
                    to="/dashboard/donor/browse"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Browse</NavLink>
                  <NavLink
                    to="/dashboard/donor/reports"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Reports</NavLink>
                  <NavLink
                    to="/dashboard/donor/notifications"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Notifications</NavLink>
                </nav>
              )}

              {/* Tabs on larger screens (hidden when compact) - SuperAdmin */}
              {isSuperAdminDashboard && user?.role === 'superadmin' && !isCompact && (
                <nav className="flex items-center gap-2">
                  <NavLink
                    to="/dashboard/superadmin"
                    end
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Home</NavLink>
                  <NavLink
                    to="/dashboard/superadmin/profile"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Profile</NavLink>
                  <NavLink
                    to="/dashboard/superadmin/users"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Users</NavLink>
                  <NavLink
                    to="/dashboard/superadmin/settings"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Settings</NavLink>
                  <NavLink
                    to="/dashboard/superadmin/analytics"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Analytics</NavLink>
                  <NavLink
                    to="/dashboard/superadmin/notifications"
                    className={({ isActive }) => `px-3 py-1 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  >Notifications</NavLink>
                </nav>
              )}

              {/* Avatar + name */}
              <div className="flex items-center gap-2 ml-2">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-400 flex items-center justify-center text-sm font-semibold text-slate-800 dark:text-slate-900">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-sm text-slate-700 dark:text-slate-200">{user?.name || 'User'}</div>
              </div>

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
              {/* Compact hamburger to open side nav (placed to the right of theme toggle) */}
              {isCompact && (
                <button aria-label="Open menu" onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Mobile side nav overlay */}
          {mobileOpen && (
            <>
              {/* Backdrop - click to close */}
              <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-40" onClick={()=>setMobileOpen(false)} />
              {/* Panel on the right */}
              <aside className={`fixed right-0 top-0 w-72 max-w-full p-6 border-l border-slate-200 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-400 flex items-center justify-center text-lg font-semibold text-slate-800 dark:text-slate-900">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name || 'User'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email || ''}</div>
                    </div>
                  </div>
                  <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"> 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-700 dark:text-slate-200" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <nav className="flex flex-col gap-3">
                  {/* Student Navigation */}
                  {isStudentDashboard && user?.role === 'student' && (
                    <>
                      <NavLink to="/dashboard/student" end onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Home</span>
                      </NavLink>
                      <NavLink to="/dashboard/student/profile" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Profile</span>
                      </NavLink>
                      <NavLink to="/dashboard/student/aid" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Aid</span>
                      </NavLink>
                      <NavLink to="/dashboard/student/support" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Support</span>
                      </NavLink>
                      <NavLink to="/dashboard/student/notifications" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Notifications</span>
                      </NavLink>
                    </>
                  )}

                  {/* Admin Navigation */}
                  {isAdminDashboard && user?.role === 'admin' && (
                    <>
                      <NavLink to="/dashboard/admin" end onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Home</span>
                      </NavLink>
                      <NavLink to="/dashboard/admin/profile" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Profile</span>
                      </NavLink>
                      <NavLink to="/dashboard/admin/verify" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Verify</span>
                      </NavLink>
                      <NavLink to="/dashboard/admin/aid" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Aid</span>
                      </NavLink>
                      <NavLink to="/dashboard/admin/groups" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Groups</span>
                      </NavLink>
                      <NavLink to="/dashboard/admin/reports" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Reports</span>
                      </NavLink>
                      <NavLink to="/dashboard/admin/notifications" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Notifications</span>
                      </NavLink>
                    </>
                  )}

                  {/* Donor Navigation */}
                  {isDonorDashboard && user?.role === 'donor' && (
                    <>
                      <NavLink to="/dashboard/donor" end onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Home</span>
                      </NavLink>
                      <NavLink to="/dashboard/donor/profile" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Profile</span>
                      </NavLink>
                      <NavLink to="/dashboard/donor/donations" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Donations</span>
                      </NavLink>
                      <NavLink to="/dashboard/donor/browse" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Browse</span>
                      </NavLink>
                      <NavLink to="/dashboard/donor/reports" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Reports</span>
                      </NavLink>
                      <NavLink to="/dashboard/donor/notifications" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Notifications</span>
                      </NavLink>
                    </>
                  )}

                  {/* SuperAdmin Navigation */}
                  {isSuperAdminDashboard && user?.role === 'superadmin' && (
                    <>
                      <NavLink to="/dashboard/superadmin" end onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Home</span>
                      </NavLink>
                      <NavLink to="/dashboard/superadmin/profile" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Profile</span>
                      </NavLink>
                      <NavLink to="/dashboard/superadmin/users" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Users</span>
                      </NavLink>
                      <NavLink to="/dashboard/superadmin/settings" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Settings</span>
                      </NavLink>
                      <NavLink to="/dashboard/superadmin/analytics" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Analytics</span>
                      </NavLink>
                      <NavLink to="/dashboard/superadmin/notifications" onClick={()=>setMobileOpen(false)} className={({isActive})=>`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive? 'bg-gradient-to-r from-green-500 to-lime-600 text-white shadow' : 'text-slate-800 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                        <span className="text-sm font-medium">Notifications</span>
                      </NavLink>
                    </>
                  )}
                </nav>

                <div className="mt-6">
                  <button onClick={toggleTheme} className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-green-500 to-lime-600 text-white text-sm flex items-center justify-center gap-2">
                    {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
                  </button>
                </div>
              </aside>
            </>
          )}
          <div className="mt-0.5">
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
