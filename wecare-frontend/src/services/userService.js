import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

export const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const listUsers = async (token) => {
  const res = await axios.get(API_URL, getAuthHeaders(token));
  return res.data;
};

export const approveAdmin = async (token, adminId) => {
  const res = await axios.post(`${API_URL}/approve/admin/${adminId}`, {}, getAuthHeaders(token));
  return res.data;
};

export const suspendUser = async (token, userId, suspended) => {
  const res = await axios.patch(`${API_URL}/${userId}/suspend`, { suspended }, getAuthHeaders(token));
  return res.data;
};


