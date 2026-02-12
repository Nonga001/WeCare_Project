import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from "../../../services/notificationService";
// Removed localStorage fallback for hidden notifications
import { useSocket } from "../../../context/SocketContext";
import { hideNotificationServer, unhideNotificationServer, getHiddenNotifications } from "../../../services/notificationService";

const StudentNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenList, setHiddenList] = useState([]);
  const { socketRef } = useSocket();
  const [before, setBefore] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(user?.token, { limit: 20 });
      setNotifications(data);
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
      setBefore(data.length > 0 ? data[data.length - 1]._id : null);
      setHasMore((data || []).length >= 20);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      if (!hasMore || !before) return;
      const data = await getNotifications(user?.token, { before, limit: 20 });
      setNotifications(prev => [...prev, ...data]);
      setBefore(data.length > 0 ? data[data.length - 1]._id : before);
      setHasMore((data || []).length >= 20);
    } catch {}
  };

  const markAllAsReadNow = async () => {
    try {
      await markAllAsRead(user?.token);
      await fetchNotifications();
    } catch {}
  };

  useEffect(() => {
    if (user?.token) {
      fetchNotifications();
    }
  }, [user?.token]);

  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;
    const onNew = (n) => {
      setNotifications(prev => [n, ...prev]);
    };
    const onUpdate = (n) => {
      setNotifications(prev => prev.map(x => x._id === n._id ? n : x));
    };
    const onDelete = ({ notificationId }) => {
      setNotifications(prev => prev.filter(x => x._id !== notificationId));
    };
    s.on("notification:new", onNew);
    s.on("notification:update", onUpdate);
    s.on("notification:delete", onDelete);
    return () => {
      try {
        s.off("notification:new", onNew);
        s.off("notification:update", onUpdate);
        s.off("notification:delete", onDelete);
      } catch {}
    };
  }, [socketRef?.current]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(user?.token, notificationId);
      // Optimistically update local state to remove badge immediately
      setNotifications(prev => prev.map(n => n._id === notificationId 
        ? { ...n, isRead: [...(n.isRead || []), { user: user?._id, readAt: new Date().toISOString() }] }
        : n
      ));
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark as read");
    }
  };

  const handleHide = async (notificationId) => {
    try { await hideNotificationServer(user?.token, notificationId); } catch {}
    setNotifications(prev => prev.filter(n => String(n._id) !== String(notificationId)));
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
  };

  const handleDelete = async (notificationId) => {
    try {
      // For recipients, use hide so it is removed only for this user; if sender, backend will delete globally
      await hideNotificationServer(user?.token, notificationId);
    } catch (_) {
      // Fallback to delete endpoint if hide fails (e.g., already hidden)
      try { await deleteNotification(user?.token, notificationId); } catch {}
    }
    try {
      await fetchNotifications();
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
    } catch (err) {
      setNotifications(prev => prev.filter(n => String(n._id) !== String(notificationId)));
      setHiddenList(prev => prev.filter(n => String(n._id) !== String(notificationId)));
      setError(err.response?.data?.message || "Failed to delete notification");
    }
  };

  const handleUnhide = async (notificationId) => {
    try { await unhideNotificationServer(user?.token, notificationId); } catch {}
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
  };

  const toggleHidden = async () => {
    const next = !showHidden;
    setShowHidden(next);
    if (next) {
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
    }
  };

  const formatDateTime = (dateString) => new Date(dateString).toLocaleString();
  const formatDay = (dateString) => {
    const d = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isSameDay = (a,b)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    if (isSameDay(d, today)) return "Today";
    if (isSameDay(d, yesterday)) return "Yesterday";
    return d.toLocaleDateString();
  };

  const isRead = (notification) => {
    const uid = user?._id || user?.id;
    return (notification.isRead || []).some(read => (
      read.user === uid || read.user?._id === uid || String(read.user) === String(uid)
    ));
  };

  const grouped = notifications.reduce((acc, n) => {
    const key = formatDay(n.createdAt);
    acc[key] = acc[key] || [];
    acc[key].push(n);
    return acc;
  }, {});

  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 p-6 space-y-4 dark:border-slate-700 dark:bg-slate-900">
        {[...Array(3)].map((_,i)=>(
          <div key={i} className="animate-pulse space-y-3">
            <div className="h-3 w-24 bg-slate-200 rounded"></div>
            <div className="h-4 w-48 bg-slate-200 rounded"></div>
            <div className="h-16 w-full bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 px-4 py-3 rounded">{error}</div>}
      
      <div className="rounded-xl border border-slate-200 p-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 dark:bg-slate-900/90 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Notifications</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800">
              {unreadCount} unread
            </span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <button onClick={markAllAsReadNow} className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 font-medium">Mark all as read</button>
            {hasMore && (
              <button onClick={loadMore} className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 font-medium">Load older</button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400">No notifications yet. Check your profile or aid status for updates.</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-5">
            {Object.entries(grouped).map(([day, list]) => (
              <div key={day} className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">{day}</div>
                <div className="space-y-3">
                  {list.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => { if (!isRead(notification)) handleMarkAsRead(notification._id); }}
                      className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-sm ${
                        isRead(notification)
                          ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{notification.title}</h4>
                            {!isRead(notification) && (
                              <span className="px-2 py-0.5 bg-amber-700 text-white text-[11px] rounded-full">New</span>
                            )}
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm line-clamp-3">{notification.message}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>From: {notification.sender?.name || notification.senderName || notification.senderRole || 'System'}</span>
                            <span>{formatDateTime(notification.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {!isRead(notification) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                              className="px-3 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleHide(notification._id); }}
                            className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Hide
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(notification._id); }}
                            className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/30"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900">
        <button
          onClick={toggleHidden}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Hidden</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Notifications you removed from your feed</p>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">{showHidden ? "Hide" : "Show"}</span>
        </button>
        {showHidden && (
          <div className="border-t border-slate-200 p-6 dark:border-slate-700">
            {(hiddenList || []).length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No hidden notifications.</p>
            ) : (
              <div className="space-y-3">
                {hiddenList.map((n) => (
                  <div key={n._id} className="border rounded-lg p-4 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{n.title}</h4>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 text-sm line-clamp-3">{n.message}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>From: {n.sender?.name || n.senderName || n.senderRole || 'System'}</span>
                          <span>{formatDateTime(n.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleUnhide(n._id)}
                          className="px-3 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        >
                          Unhide
                        </button>
                        <button
                          onClick={() => handleDelete(n._id)}
                          className="px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
