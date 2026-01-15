import axios from "axios";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/notifications`;

export const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const getNotifications = async (token, params = {}) => {
  const res = await axios.get(API_URL, { ...getAuthHeaders(token), params });
  return res.data;
};

export const getSentNotifications = async (token) => {
  const res = await axios.get(`${API_URL}/sent`, getAuthHeaders(token));
  return res.data;
};

export const sendNotification = async (token, notificationData) => {
  const res = await axios.post(`${API_URL}/send`, notificationData, getAuthHeaders(token));
  return res.data;
};

export const getStudentsForNotification = async (token) => {
  const res = await axios.get(`${API_URL}/students`, getAuthHeaders(token));
  return res.data;
};

export const getAdminsForNotification = async (token) => {
  const res = await axios.get(`${API_URL}/admins`, getAuthHeaders(token));
  return res.data;
};

export const getDonorsForNotification = async (token) => {
  const res = await axios.get(`${API_URL}/donors`, getAuthHeaders(token));
  return res.data;
};

export const markAsRead = async (token, notificationId) => {
  const res = await axios.patch(`${API_URL}/${notificationId}/read`, {}, getAuthHeaders(token));
  return res.data;
};

export const getUnreadCount = async (token) => {
  const res = await axios.get(`${API_URL}/unread-count`, getAuthHeaders(token));
  return res.data?.count || 0;
};

export const deleteNotification = async (token, notificationId) => {
  const res = await axios.delete(`${API_URL}/${notificationId}`, getAuthHeaders(token));
  return res.data;
};

export const editNotification = async (token, notificationId, notificationData) => {
  const res = await axios.put(`${API_URL}/${notificationId}`, notificationData, getAuthHeaders(token));
  return res.data;
};

export const hideNotificationServer = async (token, notificationId) => {
  const res = await axios.post(`${API_URL}/${notificationId}/hide`, {}, getAuthHeaders(token));
  return res.data;
};

export const unhideNotificationServer = async (token, notificationId) => {
  const res = await axios.delete(`${API_URL}/${notificationId}/hide`, getAuthHeaders(token));
  return res.data;
};

export const getHiddenNotifications = async (token) => {
  const res = await axios.get(`${API_URL}/hidden`, getAuthHeaders(token));
  return res.data || [];
};
