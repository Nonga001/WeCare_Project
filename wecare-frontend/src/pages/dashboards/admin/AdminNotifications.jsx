import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { 
  getNotifications, 
  sendNotification, 
  getStudentsForNotification, 
  deleteNotification, 
  editNotification,
  getSentNotifications
} from "../../../services/notificationService";
// Removed localStorage fallback for hidden notifications
import { useSocket } from "../../../context/SocketContext";
import { markAsRead } from "../../../services/notificationService";
import { hideNotificationServer, unhideNotificationServer, getHiddenNotifications } from "../../../services/notificationService";

const AdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [students, setStudents] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenList, setHiddenList] = useState([]);
  const [openSentId, setOpenSentId] = useState(null);
  const [showHiddenList, setShowHiddenList] = useState(false);
  const { socketRef } = useSocket();
  const [before, setBefore] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSendForm, setShowSendForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  
  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    recipientType: "university_students",
    recipientId: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notificationsData, studentsData, sentData] = await Promise.all([
        getNotifications(user?.token),
        getStudentsForNotification(user?.token),
        getSentNotifications(user?.token)
      ]);
      setNotifications(notificationsData);
      setStudents(studentsData);
      setSent(sentData);
      try { setHiddenList(await getHiddenNotifications(user?.token)); } catch {}
      setBefore(notificationsData.length > 0 ? notificationsData[notificationsData.length - 1]._id : null);
      setHasMore((notificationsData || []).length >= 50);
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

  useEffect(() => {
    if (user?.token) {
      fetchData();
    }
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
        recipientId: sendForm.recipientType === "single_student" ? sendForm.recipientId : undefined,
        university: user?.university
      };
      
      await sendNotification(user?.token, payload);
      setError("");
      setSuccess("Notification sent successfully");
      setSendForm({ title: "", message: "", recipientType: "university_students", recipientId: "" });
      setShowSendForm(false);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send notification");
      setSuccess("");
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(user?.token, id);
      await fetchData();
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
    try {
      await unhideNotificationServer(user?.token, id);
      await fetchData();
    } catch {}
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
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to edit notification");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

  const getRecipientText = (n) => {
    switch (n.recipientType) {
      case "everyone": return "Everyone";
      case "all_students": return "All Students";
      case "all_donors": return "All Donors";
      case "all_admins": return "All University Admins";
      case "university_students": return `${user?.university} Students`;
      case "single_student": return n.recipients?.[0]?.name || "Single Student";
      case "single_admin": return n.recipients?.[0]?.name || "Single Admin";
      case "single_donor": return n.recipients?.[0]?.name || "Single Donor";
      case "superadmin": return "Super Admin";
      default: return "Unknown";
    }
  };

  const isSender = (n) => {
    const uid = user?._id || user?.id;
    return (
      (n.sender && (n.sender._id === uid)) ||
      (!!n.senderRole && n.senderRole === user?.role && (!!n.senderName ? n.senderName === user?.name : true))
    );
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
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}
      
      {/* Send Notification Form */}
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Send Notification</h3>
          <button
            onClick={() => setShowSendForm(!showSendForm)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            {showSendForm ? "Cancel" : "Send New"}
          </button>
        </div>

        {showSendForm && (
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={sendForm.title}
                onChange={(e) => setSendForm({...sendForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                rows="3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipients</label>
              <select
                value={sendForm.recipientType}
                onChange={(e) => setSendForm({...sendForm, recipientType: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="university_students">All Students in ({user?.university || user?.organization || 'your university'})</option>
                <option value="single_student">Single Student</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>

            {sendForm.recipientType === "single_student" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Student</label>
                <select
                  value={sendForm.recipientId}
                  onChange={(e) => setSendForm({...sendForm, recipientId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student._id} value={student._id}>{student.name} ({student.email})</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Send Notification
            </button>
          </form>
        )}
      </div>

      {/* Notifications List */}
      <div className="rounded-xl border border-slate-200 p-0 overflow-hidden">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Recent Notifications</h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              {unreadCount} unread
            </span>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <button onClick={markAllAsReadNow} className="text-sm text-amber-700 hover:text-amber-800 font-medium">Mark all as read</button>
            {hasMore && (
              <button onClick={loadMore} className="text-sm text-amber-700 hover:text-amber-800 font-medium">Load older</button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-500">No notifications yet.</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-5">
            {Object.entries(grouped).map(([day, list]) => (
              <div key={day} className="space-y-3">
                <div className="text-xs font-semibold text-slate-500 tracking-wide">{day}</div>
                <div className="space-y-3">
                  {list.map((notification) => (
                    <div
                      key={notification._id}
                      onClick={() => { if (!isRead(notification)) handleMarkAsRead(notification._id); }}
                      className={`border rounded-lg p-4 cursor-pointer transition hover:shadow-sm ${
                        isRead(notification)
                          ? "border-slate-200 bg-white"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      {editingNotification?._id === notification._id ? (
                        <form onSubmit={handleEditNotification} className="space-y-3">
                          <input
                            type="text"
                            value={editingNotification.title}
                            onChange={(e) => setEditingNotification({...editingNotification, title: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <textarea
                            value={editingNotification.message}
                            onChange={(e) => setEditingNotification({...editingNotification, message: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            rows="2"
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700">Save</button>
                            <button type="button" onClick={() => setEditingNotification(null)} className="px-3 py-1 bg-slate-500 text-white rounded hover:bg-slate-600">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-800 truncate">{notification.title}</h4>
                                {!isRead(notification) && (
                                  <span className="px-2 py-0.5 bg-amber-700 text-white text-[11px] rounded-full">New</span>
                                )}
                              </div>
                              <p className="text-slate-600 mt-1 text-sm line-clamp-3">{notification.message}</p>
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                                <span>To: {getRecipientText(notification)}</span>
                                <span>{formatDateTime(notification.createdAt)}</span>
                                <span>By: {notification.sender?.name || notification.senderName || notification.senderRole || 'System'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {!isRead(notification) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification._id); }}
                                  className="px-3 py-1 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium"
                                >
                                  Mark read
                                </button>
                              )}
                              {isSender(notification) && (
                                <button
                                  onClick={() => setEditingNotification(notification)}
                                  className="px-3 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 text-xs font-medium"
                                >
                                  Edit
                                </button>
                              )}
                              {isSender(notification) ? (
                                <button
                                  onClick={async (e) => { e.stopPropagation(); await handleDeleteNotification(notification._id); setNotifications(prev => prev.filter(x => x._id !== notification._id)); }}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                                >
                                  Delete
                                </button>
                              ) : (
                                <div className="flex flex-col gap-1 w-full items-end">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleHide(notification._id); }}
                                    className="px-3 py-1 border border-amber-200 text-amber-700 rounded hover:bg-amber-50 text-xs font-medium"
                                  >
                                    Hide
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleHide(notification._id); }}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent by You */}
      <div className="rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Sent by You</h3>
        {sent.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No notifications sent yet.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "520px" }}>
            {sent.map((n) => {
              const isOpen = openSentId === n._id;
              const isEditing = editingNotification?._id === n._id;
              return (
                <div key={n._id} className="border border-slate-200 rounded-lg p-4 bg-white">
                  {isEditing ? (
                    <form onSubmit={handleEditNotification} className="space-y-3">
                      <input
                        type="text"
                        value={editingNotification.title}
                        onChange={(e) => setEditingNotification({ ...editingNotification, title: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <textarea
                        value={editingNotification.message}
                        onChange={(e) => setEditingNotification({ ...editingNotification, message: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                        rows="2"
                      />
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700">Save</button>
                        <button type="button" onClick={() => setEditingNotification(null)} className="px-3 py-1 bg-slate-500 text-white rounded hover:bg-slate-600">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-medium text-slate-800 truncate">{n.title}</h4>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>{formatDateTime(n.createdAt)}</span>
                            <span>To: {getRecipientText(n)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setOpenSentId(isOpen ? null : n._id)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          {isOpen ? "Close" : "Show more"}
                        </button>
                      </div>

                      {isOpen && (
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p className="leading-relaxed whitespace-pre-wrap">{n.message}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>By: {n.sender?.name || n.senderName || n.senderRole || 'System'}</span>
                          </div>
                          {isSender(n) && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setEditingNotification(n); setOpenSentId(n._id); }}
                                className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => { await handleDeleteNotification(n._id); setSent(prev => prev.filter(x => x._id !== n._id)); if (openSentId === n._id) setOpenSentId(null); }}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden */}
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Hidden</h3>
          {(hiddenList || []).length > 0 && (
            <button
              onClick={() => setShowHiddenList(!showHiddenList)}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              {showHiddenList ? "Close" : "Show"}
            </button>
          )}
        </div>
        {(hiddenList || []).length === 0 ? (
          <p className="text-slate-500">No hidden notifications.</p>
        ) : !showHiddenList ? (
          <p className="text-slate-600 text-sm">Hidden notifications are collapsed. Click Show to view them.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "360px" }}>
            {hiddenList.map((n) => (
              <div key={n._id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <h4 className="font-medium text-slate-800">{n.title}</h4>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>{formatDate(n.createdAt)}</span>
                      <span>To: {getRecipientText(n)}</span>
                      <span>By: {n.sender?.name || n.senderName || n.senderRole || 'System'}</span>
                    </div>
                  </div>
                  <button onClick={() => handleUnhide(n._id)} className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs font-medium">Unhide</button>
                </div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;