import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { 
  getNotifications, 
  sendNotification, 
  deleteNotification, 
  editNotification,
  getAdminsForNotification,
  getDonorsForNotification
} from "../../../services/notificationService";

const SuperAdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [donors, setDonors] = useState([]);
  const [error, setError] = useState("");
  const [showSendForm, setShowSendForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  
  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    recipientType: "everyone",
    recipientId: ""
  });

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
      setSendForm({ title: "", message: "", recipientType: "everyone", recipientId: "" });
      setShowSendForm(false);
      await fetchNotifications();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send notification");
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

  const getRecipientText = (notification) => {
    switch (notification.recipientType) {
      case "all_students": return "All Students";
      case "university_students": return `${notification.university} Students`;
      case "single_student": return "Single Student";
      case "superadmin": return "Super Admin";
      default: return "Unknown";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      
      {/* Send Notification Form */}
      <div className="rounded-xl border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Send System Notification</h3>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={sendForm.title}
                onChange={(e) => setSendForm({...sendForm, title: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                value={sendForm.message}
                onChange={(e) => setSendForm({...sendForm, message: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipients</label>
              <select
                value={sendForm.recipientType}
                onChange={(e) => setSendForm({...sendForm, recipientType: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Admin</label>
                <select
                  value={sendForm.recipientId}
                  onChange={(e) => setSendForm({...sendForm, recipientId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Donor</label>
                <select
                  value={sendForm.recipientId}
                  onChange={(e) => setSendForm({...sendForm, recipientId: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Notifications List */}
      <div className="rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">System Notifications</h3>
        
        {notifications.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No notifications sent yet.</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification._id} className="border border-slate-200 rounded-lg p-4">
                {editingNotification?._id === notification._id ? (
                  <form onSubmit={handleEditNotification} className="space-y-3">
                    <input
                      type="text"
                      value={editingNotification.title}
                      onChange={(e) => setEditingNotification({...editingNotification, title: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={editingNotification.message}
                      onChange={(e) => setEditingNotification({...editingNotification, message: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <h4 className="font-medium text-slate-800">{notification.title}</h4>
                        <p className="text-slate-600 mt-1">{notification.message}</p>
                        <div className="flex gap-4 mt-2 text-sm text-slate-500">
                          <span>To: {getRecipientText(notification)}</span>
                          <span>Sent: {formatDate(notification.createdAt)}</span>
                          <span>By: {notification.sender?.name}</span>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminNotifications;