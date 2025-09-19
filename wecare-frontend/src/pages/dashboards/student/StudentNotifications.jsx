import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getNotifications, markAsRead, deleteNotification } from "../../../services/notificationService";

const StudentNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications(user?.token);
      setNotifications(data);
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

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(user?.token, notificationId);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark as read");
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(user?.token, notificationId);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete notification");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isRead = (notification) => {
    return notification.isRead.some(read => read.user.toString() === user?._id);
  };

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      
      <div className="rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Notifications</h3>
        
        {notifications.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div 
                key={notification._id} 
                className={`border rounded-lg p-4 ${
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
                      <span>From: {notification.sender?.name}</span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!isRead(notification) && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Mark Read
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
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
    </div>
  );
};

export default StudentNotifications;
