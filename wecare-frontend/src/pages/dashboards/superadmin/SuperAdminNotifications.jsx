import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { 
  getNotifications, 
  sendNotification, 
  deleteNotification, 
  editNotification,
  getAdminsForNotification,
  getDonorsForNotification,
  getSentNotifications,
  markAllAsRead
} from "../../../services/notificationService";
// Removed localStorage fallback for hidden notifications
import { useSocket } from "../../../context/SocketContext";
import { markAsRead } from "../../../services/notificationService";
import { hideNotificationServer, unhideNotificationServer, getHiddenNotifications } from "../../../services/notificationService";

const SuperAdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [donors, setDonors] = useState([]);
  const [sent, setSent] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSendForm, setShowSendForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [hiddenList, setHiddenList] = useState([]);
  const { socketRef } = useSocket();
  const [before, setBefore] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [sentBefore, setSentBefore] = useState(null);
  const [sentHasMore, setSentHasMore] = useState(true);
  
  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    recipientType: "everyone",
    recipientId: ""
  });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [inbox, sentData] = await Promise.all([
        getNotifications(user?.token),
        getSentNotifications(user?.token)
      ]);
      setNotifications(inbox);
      setSent(sentData);
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
      setBefore(inbox.length > 0 ? inbox[inbox.length - 1]._id : null);
      setHasMore((inbox || []).length >= 50);
      setSentBefore(sentData.length > 0 ? sentData[sentData.length - 1]._id : null);
      setSentHasMore((sentData || []).length >= 50);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load notifications");
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

  const loadMoreSent = async () => {
    try {
      if (!sentHasMore || !sentBefore) return;
      const next = await getSentNotifications(user?.token, { before: sentBefore, limit: 50 });
      setSent(prev => [...prev, ...next]);
      setSentBefore(next.length > 0 ? next[next.length - 1]._id : sentBefore);
      setSentHasMore((next || []).length >= 50);
    } catch {}
  };

  const markAllAsReadNow = async () => {
    try {
      await markAllAsRead(user?.token);
      await fetchNotifications();
    } catch {}
  };

  const fetchTargets = async () => {
    try {
      const [adminsData, donorsData] = await Promise.all([
        getAdminsForNotification(user?.token),
        getDonorsForNotification(user?.token)
      ]);
      setAdmins(adminsData);
      setDonors(donorsData);
    } catch (err) {
      // ignore; UI will just hide selects
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchNotifications();
      fetchTargets();
    }
  }, [user?.token]);

  useEffect(() => {
    const s = socketRef?.current;
    if (!s) return;
    const onNew = (n) => {
      setNotifications(prev => [n, ...prev]);
      // If current user is sender, also update sent
      const uid = user?._id || user?.id;
      const senderId = n.sender?._id || n.sender;
      const sentByUser = (senderId && String(senderId) === String(uid)) || (!!n.senderRole && n.senderRole === user?.role && (!!n.senderName ? n.senderName === user?.name : true));
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
        recipientId: ["single_admin", "single_donor"].includes(sendForm.recipientType) ? sendForm.recipientId : undefined
      };
      
      await sendNotification(user?.token, payload);
      setError("");
      setSuccess("Notification sent successfully");
      setSendForm({ title: "", message: "", recipientType: "everyone", recipientId: "" });
      setShowSendForm(false);
      await fetchNotifications();
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      const detail = err?.response?.data?.error;
      setError(apiMsg ? `${apiMsg}${detail ? `: ${detail}` : ''}` : "Failed to send notification");
      setSuccess("");
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(user?.token, id);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete notification");
    }
  };

  const handleHide = async (id) => {
    try { await hideNotificationServer(user?.token, id); } catch {}
    setNotifications(prev => prev.filter(n => String(n._id) !== String(id)));
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
  };

  const handleUnhide = async (id) => {
    try { await unhideNotificationServer(user?.token, id); } catch {}
    try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
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

  const handleEditNotification = async (e) => {
    e.preventDefault();
    try {
      await editNotification(user?.token, editingNotification._id, {
        title: editingNotification.title,
        message: editingNotification.message
      });
      setEditingNotification(null);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit notification");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getRecipientText = (n) => {
    switch (n.recipientType) {
      case "everyone": return "Everyone";
      case "all_students": return "All Students";
      case "all_donors": return "All Donors";
      case "all_admins": return "All University Admins";
      case "university_students": return `${n.university || 'University'} Students`;
      case "single_student": return n.recipients?.[0]?.name || "Single Student";
      case "single_admin": return n.recipients?.[0]?.name || "Single Admin";
      case "single_donor": return n.recipients?.[0]?.name || "Single Donor";
      case "superadmin": return "Super Admin";
      default: return "Unknown";
    }
  };

  const isSender = (n) => {
    const uid = user?._id || user?.id;
    const senderId = n.sender?._id || n.sender;
    return (
      (senderId && String(senderId) === String(uid)) ||
      (!!n.senderRole && n.senderRole === user?.role && (!!n.senderName ? n.senderName === user?.name : true))
    );
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
    <div className="space-y-6">
      {error && <div className="bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800 text-red-700 dark:text-rose-200 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-emerald-950/40 border border-green-200 dark:border-emerald-800 text-green-700 dark:text-emerald-200 px-4 py-3 rounded">{success}</div>}
      
      {/* Send Notification Form */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Send System Notification</h3>
          <button
            onClick={() => setShowSendForm(!showSendForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showSendForm ? "Cancel" : "Send New"}
          </button>
        </div>

        {showSendForm && (
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={sendForm.title}
                onChange={(e) => setSendForm({...sendForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipients</label>
              <select
                value={sendForm.recipientType}
                onChange={(e) => setSendForm({...sendForm, recipientType: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="everyone">Everyone</option>
                <option value="all_students">All Students</option>
                <option value="all_donors">All Donors</option>
                <option value="all_admins">All Admins</option>
                <option value="single_admin">Single Admin</option>
                <option value="single_donor">Single Donor</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            {sendForm.recipientType === "single_admin" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Admin</label>
                <select
                  value={sendForm.recipientId}
                  onChange={(e) => setSendForm({...sendForm, recipientId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an admin</option>
                  {admins.map(a => (
                    <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>
            )}

            {sendForm.recipientType === "single_donor" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Donor</label>
                <select
                  value={sendForm.recipientId}
                  onChange={(e) => setSendForm({...sendForm, recipientId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a donor</option>
                  {donors.map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.email})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Send System Notification
            </button>
          </form>
        )}
      </div>

      {/* Recent Notifications */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Notifications</h3>
          <button
            onClick={markAllAsReadNow}
            className="text-sm text-blue-600 hover:underline dark:text-blue-300"
          >
            Mark all as read
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-6">No notifications yet.</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => { if (!isRead(n)) handleMarkAsRead(n._id); }}
                className={`border rounded-lg p-4 ${isRead(n) ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50" : "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-slate-800 dark:text-slate-100">{n.title}</h4>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                    <div className="flex gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>To: {getRecipientText(n)}</span>
                      <span>Sent: {formatDate(n.createdAt)}</span>
                      <span>By: {n.sender?.name || n.senderName || n.senderRole || 'System'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleHide(n._id)}
                      className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700"
                    >
                      Hide
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-3 text-center">
              {hasMore && (
                <button onClick={loadMore} className="px-3 py-1 text-sm text-blue-600 dark:text-blue-300 hover:underline">Load older</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Notifications List - show only items sent by current super admin */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">System Notifications</h3>
        </div>
        
        {sent.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">No notifications sent yet.</p>
        ) : (
          <div className="space-y-4">
            {sent.map((notification) => (
              <div key={notification._id} onClick={() => { if (!isRead(notification)) handleMarkAsRead(notification._id); }} className={`border rounded-lg p-4 ${isRead(notification) ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50" : "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"}`}>
                {editingNotification?._id === notification._id ? (
                  <form onSubmit={handleEditNotification} className="space-y-3">
                    <input
                      type="text"
                      value={editingNotification.title}
                      onChange={(e) => setEditingNotification({...editingNotification, title: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={editingNotification.message}
                      onChange={(e) => setEditingNotification({...editingNotification, message: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                      <button type="button" onClick={() => setEditingNotification(null)} className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-slate-800 dark:text-slate-100">{notification.title}</h4>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{notification.message}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <span>To: {getRecipientText(notification)}</span>
                          <span>Sent: {formatDate(notification.createdAt)}</span>
                          <span>By: {notification.sender?.name || notification.senderName || notification.senderRole || 'System'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingNotification(notification)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNotification(notification._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="mt-3 text-center">
              {sentHasMore && (
                <button onClick={loadMoreSent} className="px-3 py-1 text-sm text-blue-600 dark:text-blue-300 hover:underline">Load older</button>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SuperAdminNotifications;