import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { 
  getNotifications,
  sendNotification,
  editNotification,
  deleteNotification,
  getAdminsForNotification,
  getSentNotifications
} from "../../../services/notificationService";
import { useSocket } from "../../../context/SocketContext";
import { markAsRead } from "../../../services/notificationService";
import { hideNotificationServer, unhideNotificationServer, getHiddenNotifications } from "../../../services/notificationService";

const DonorNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenList, setHiddenList] = useState([]);
  const { socketRef } = useSocket();
  const [before, setBefore] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSendForm, setShowSendForm] = useState(false);
  const [editingSentId, setEditingSentId] = useState(null);
  const [editingSentForm, setEditingSentForm] = useState(null);
  const [showHiddenMessages, setShowHiddenMessages] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);

  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    recipientType: "all_admins",
    recipientId: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifs, adminsData, sentData] = await Promise.all([
        getNotifications(user?.token),
        getAdminsForNotification(user?.token),
        getSentNotifications(user?.token)
      ]);
      setNotifications(notifs);
      setAdmins(adminsData);
      setSent(sentData);
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
      setBefore(notifs.length > 0 ? notifs[notifs.length - 1]._id : null);
      setHasMore((notifs || []).length >= 50);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      if (!hasMore || !before) return;
      const next = await getNotifications(user?.token, { before, limit: 50 });
      setNotifications(prev => [...prev, ...next]);
      setBefore(next.length > 0 ? next[next.length - 1]._id : before);
      setHasMore((next || []).length >= 50);
    } catch {}
  };

  const markAllAsReadNow = async () => {
    try {
      const uid = user?._id || user?.id;
      const unread = notifications.filter(n => !((n.isRead || []).some(r => (r.user === uid) || (r.user?._id === uid) || (String(r.user) === String(uid)))));
      for (const n of unread) {
        await markAsRead(user?.token, n._id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, isRead: [...(n.isRead || []), { user: uid, readAt: new Date().toISOString() }] })));
    } catch {}
  };

  const isRead = (notification) => {
    const uid = user?._id || user?.id;
    return (notification.isRead || []).some(read => (
      read.user === uid || read.user?._id === uid || String(read.user) === String(uid)
    ));
  };

  useEffect(() => {
    if (user?.token) fetchData();
  }, [user?.token]);

  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;
    const onNew = (n) => {
      setNotifications(prev => [n, ...prev]);
      const uid = user?._id || user?.id;
      const sentByUser = (n.sender && (n.sender._id === uid)) || (!!n.senderRole && n.senderRole === user?.role && (!!n.senderName ? n.senderName === user?.name : true));
      if (sentByUser) setSent(prev => [n, ...prev]);
    };
    const onUpdate = (n) => {
      setNotifications(prev => prev.map(x => x._id === n._id ? n : x));
      setSent(prev => prev.map(x => x._id === n._id ? n : x));
    };
    const onDelete = ({ notificationId }) => {
      setNotifications(prev => prev.filter(x => x._id !== notificationId));
      setSent(prev => prev.filter(x => x._id !== notificationId));
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
  }, [socketRef?.current, user?._id, user?.id, user?.role, user?.name]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: sendForm.title,
        message: sendForm.message,
        recipientType: sendForm.recipientType,
        recipientId: sendForm.recipientType === "single_admin" ? sendForm.recipientId : undefined
      };
      await sendNotification(user?.token, payload);
      setError("");
      setSuccess("Notification sent successfully");
      setSendForm({ title: "", message: "", recipientType: "all_admins", recipientId: "" });
      setShowSendForm(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send notification");
      setSuccess("");
    }
  };

  const handleEditSentNotification = async (e) => {
    e.preventDefault();
    try {
      await editNotification(user?.token, editingSentForm._id, {
        title: editingSentForm.title,
        message: editingSentForm.message
      });
      setSuccess("Notification updated successfully");
      setEditingSentId(null);
      setEditingSentForm(null);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit notification");
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await deleteNotification(user?.token, id);
      setSent(prev => prev.filter(n => n._id !== id));
      setSuccess("Notification deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete notification");
    }
  };

  const handleHide = async (id) => {
    try { await hideNotificationServer(user?.token, id); } catch {}
    setNotifications(prev => prev.filter(n => String(n._id) !== String(id)));
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
  };

  const handleDeleteReceivedNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await deleteNotification(user?.token, id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setSuccess("Notification deleted successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete notification");
    }
  };

  const handleUnhide = async (id) => {
    try {
      await unhideNotificationServer(user?.token, id);
      // Refresh all data to show the unhidden notification in Recent Notifications
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unhide notification");
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(user?.token, notificationId);
      setNotifications(prev => prev.map(n => n._id === notificationId 
        ? { ...n, isRead: [...(n.isRead || []), { user: user?._id, readAt: new Date().toISOString() }] }
        : n
      ));
    } catch {}
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();
  const getRecipientText = (n) => {
    switch (n.recipientType) {
      case "all_admins": return "All Admins";
      case "single_admin": return n.recipients?.[0]?.name || "Single Admin";
      case "superadmin": return "Super Admin";
      default: return "Unknown";
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-600">Loading notifications...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}

      {/* Send Notification Card */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Send Notification to Admins</h3>
          <button onClick={() => setShowSendForm(!showSendForm)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-stone-700 to-stone-800 text-white font-semibold hover:from-stone-800 hover:to-stone-900 transition shadow">
            {showSendForm ? "Cancel" : "Send New"}
          </button>
        </div>

        {showSendForm && (
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-100 mb-1">Title</label>
              <input type="text" value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-100 mb-1">Message</label>
              <textarea value={sendForm.message} onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" rows="3" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-800 dark:text-stone-100 mb-1">Recipients</label>
              <select value={sendForm.recipientType} onChange={(e) => setSendForm({ ...sendForm, recipientType: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300">
                <option value="all_admins">All Admins</option>
                <option value="single_admin">Single Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            {sendForm.recipientType === "single_admin" && (
              <div>
                <label className="block text-sm font-medium text-stone-800 dark:text-stone-100 mb-1">Select Admin</label>
                <select value={sendForm.recipientId} onChange={(e) => setSendForm({ ...sendForm, recipientId: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" required>
                  <option value="">Select an admin</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="w-full px-4 py-2 bg-gradient-to-r from-stone-700 to-stone-800 text-white font-semibold rounded-lg hover:from-stone-800 hover:to-stone-900 transition">Send Notification</button>
          </form>
        )}
      </div>

      {/* Sent by You */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Sent by You</h3>
        {sent.filter(n => (!n.isDeleted || n.isDeleted.length === 0)).length === 0 ? (
          <p className="text-slate-500 dark:text-stone-300 text-center py-8">You haven't sent any notifications.</p>
        ) : (
          <div className="space-y-3">
            {sent.filter(n => (!n.isDeleted || n.isDeleted.length === 0)).map((n) => (
              <div key={n._id} className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 bg-stone-50 dark:bg-slate-800/50">
                {editingSentId === n._id ? (
                  <form onSubmit={handleEditSentNotification} className="space-y-3">
                    <input type="text" value={editingSentForm.title} onChange={(e) => setEditingSentForm({ ...editingSentForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" required />
                    <textarea value={editingSentForm.message} onChange={(e) => setEditingSentForm({ ...editingSentForm, message: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300" rows="2" required />
                    <div className="flex gap-2">
                      <button type="submit" className="px-3 py-1 bg-gradient-to-r from-stone-700 to-stone-800 text-white text-sm font-semibold rounded hover:from-stone-800 hover:to-stone-900">Save</button>
                      <button type="button" onClick={() => { setEditingSentId(null); setEditingSentForm(null); }} className="px-3 py-1 bg-slate-500 text-white text-sm rounded hover:bg-slate-600">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-stone-900 dark:text-stone-100">{n.title}</h4>
                        {n.isEdited && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-semibold">Edited</span>
                        )}
                      </div>
                      <p className="text-stone-700 dark:text-stone-200 mt-1 text-sm">{n.message}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600 dark:text-stone-300">
                        <span><strong>To:</strong> {getRecipientText(n)}</span>
                        <span><strong>Sent:</strong> {formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button onClick={() => { setEditingSentId(n._id); setEditingSentForm({ ...n }); }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">Edit</button>
                      <button onClick={() => handleDeleteNotification(n._id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-semibold">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications (Received) */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Recent Notifications</h3>
          <button onClick={markAllAsReadNow} className="text-sm text-stone-700 hover:text-stone-900 dark:text-stone-200 dark:hover:text-stone-100 font-semibold">Mark all as read</button>
        </div>
        {notifications.length === 0 ? (
          <p className="text-slate-500 dark:text-stone-300 text-center py-8">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {(showAllRecent ? notifications : notifications.slice(0, 5)).map((notification) => (
              <div key={notification._id} onClick={() => { if (!isRead(notification)) handleMarkAsRead(notification._id); }} className={`border rounded-lg p-4 transition cursor-pointer ${ isRead(notification) ? "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800/50" : "border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-900/50" }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-stone-900 dark:text-stone-100">{notification.title}</h4>
                    <p className="text-stone-700 dark:text-stone-200 mt-1 text-sm">{notification.message}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600 dark:text-stone-300">
                      <span><strong>From:</strong> {notification.sender?.name || notification.senderName || notification.senderRole || 'System'}</span>
                      <span><strong>Sent:</strong> {formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    {!isRead(notification) && (
                      <button onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }} className="px-2 py-1 text-xs bg-gradient-to-r from-stone-700 to-stone-800 text-white rounded hover:from-stone-800 hover:to-stone-900 font-semibold">Read</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleHide(notification._id); }} className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 font-semibold">Hide</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteReceivedNotification(notification._id); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-semibold">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length > 5 && (
              <div className="mt-3 text-center">
                <button onClick={() => setShowAllRecent(!showAllRecent)} className="px-4 py-2 text-sm bg-gradient-to-r from-stone-700 to-stone-800 text-white rounded-lg hover:from-stone-800 hover:to-stone-900 font-semibold">
                  {showAllRecent ? `Show Less` : `Show More (${notifications.length - 5} more)`}
                </button>
              </div>
            )}
            {showAllRecent && hasMore && (
              <div className="mt-3 text-center">
                <button onClick={loadMore} className="px-3 py-1 text-sm text-stone-700 hover:text-stone-900 dark:text-stone-200 dark:hover:text-stone-100 font-semibold">Load older</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden Messages */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Hidden</h3>
          {(hiddenList || []).length > 0 && (
            <button onClick={() => setShowHiddenMessages(!showHiddenMessages)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-stone-700 to-stone-800 text-white font-semibold hover:from-stone-800 hover:to-stone-900 transition shadow text-sm">
              {showHiddenMessages ? "Hide Messages" : "Show Messages"}
            </button>
          )}
        </div>
        {(hiddenList || []).length === 0 ? (
          <p className="text-slate-500 dark:text-stone-300">No hidden notifications.</p>
        ) : showHiddenMessages ? (
          <div className="space-y-3">
            {hiddenList.map((n) => (
              <div key={n._id} className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 bg-stone-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-stone-900 dark:text-stone-100">{n.title}</h4>
                    <p className="text-stone-700 dark:text-stone-200 mt-1 text-sm">{n.message}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-600 dark:text-stone-300">
                      <span><strong>From:</strong> {n.sender?.name || n.senderName || n.senderRole || 'System'}</span>
                      <span><strong>Sent:</strong> {formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                  <div className="ml-2">
                    <button onClick={() => handleUnhide(n._id)} className="px-2 py-1 bg-gradient-to-r from-stone-700 to-stone-800 text-white text-xs font-semibold rounded hover:from-stone-800 hover:to-stone-900">Unhide</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DonorNotifications;
