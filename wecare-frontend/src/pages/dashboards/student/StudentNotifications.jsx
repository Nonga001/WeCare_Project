import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getNotifications, markAsRead } from "../../../services/notificationService";
import { getHiddenIds, hideNotificationId, unhideNotificationId, isHiddenId } from "../../../utils/notificationPrefs";
import { useSocket } from "../../../context/SocketContext";
import { hideNotificationServer, unhideNotificationServer, getHiddenNotifications } from "../../../services/notificationService";

const StudentNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [hiddenList, setHiddenList] = useState([]);
  const { socketRef } = useSocket();
  const [before, setBefore] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(user?.token, { limit: 20 });
      setNotifications(data);
      setHiddenIds(getHiddenIds(user));
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
      setBefore(data.length > 0 ? data[data.length - 1]._id : null);
      setHasMore((data || []).length >= 20);
  const loadMore = async () => {
    try {
      if (!hasMore || !before) return;
      const data = await getNotifications(user?.token, { before, limit: 20 });
      setNotifications(prev => [...prev, ...data]);
      setBefore(data.length > 0 ? data[data.length - 1]._id : before);
      setHasMore((data || []).length >= 20);
    } catch {}
  };
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
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
    hideNotificationId(user, notificationId);
    setHiddenIds(getHiddenIds(user));
    setNotifications(prev => prev.filter(n => String(n._id) !== String(notificationId)));
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
  };

  const handleUnhide = async (notificationId) => {
    try { await unhideNotificationServer(user?.token, notificationId); } catch {}
    unhideNotificationId(user, notificationId);
    setHiddenIds(getHiddenIds(user));
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isRead = (notification) => {
    const uid = user?._id || user?.id;
    return (notification.isRead || []).some(read => (
      read.user === uid || read.user?._id === uid || String(read.user) === String(uid)
    ));
  };

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      
      <div className="rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Notifications</h3>
        
        {notifications.filter(n => !isHiddenId(user, n._id)).length === 0 ? (
          <p className="text-slate-500 text-center py-8">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.filter(n => !isHiddenId(user, n._id)).map((notification) => (
              <div 
                key={notification._id} 
                onClick={() => { if (!isRead(notification)) handleMarkAsRead(notification._id); }}
                className={`border rounded-lg p-4 cursor-pointer ${
                  isRead(notification) 
                    ? "border-slate-200 bg-slate-50" 
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-800">{notification.title}</h4>
                      {!isRead(notification) && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">New</span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-1">{notification.message}</p>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                      <span>From: {notification.sender?.name || notification.senderName || notification.senderRole || 'System'}</span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                    <div className="flex gap-2 ml-4">
                      {!isRead(notification) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Mark as Read
                        </button>
                      )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleHide(notification._id); }}
                      className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-3 text-center">
              {hasMore && (
                <button onClick={loadMore} className="px-3 py-1 text-sm text-blue-600 hover:underline">Load older</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden */}
      <div className="rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Hidden</h3>
        {(hiddenList || []).length === 0 ? (
          <p className="text-slate-500">No hidden notifications.</p>
        ) : (
          <div className="space-y-3">
            {hiddenList.map((n) => (
              <div key={n._id} className="border rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{n.title}</h4>
                    <p className="text-slate-600 mt-1">{n.message}</p>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500">
                      <span>From: {n.sender?.name || n.senderName || n.senderRole || 'System'}</span>
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleUnhide(n._id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Unhide
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentNotifications;
