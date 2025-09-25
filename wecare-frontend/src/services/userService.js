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

export const listStudentsForAdmin = async (token) => {
  const res = await axios.get(`${API_URL}/students`, getAuthHeaders(token));
  return res.data;
};

export const approveStudent = async (token, studentId) => {
  const res = await axios.post(`${API_URL}/approve/student/${studentId}`, {}, getAuthHeaders(token));
  return res.data;
};

export const rejectStudent = async (token, studentId) => {
  const res = await axios.post(`${API_URL}/reject/student/${studentId}`, {}, getAuthHeaders(token));
  return res.data;
};

export const getAdminStats = async (token) => {
  const res = await axios.get(`${API_URL}/admin/stats`, getAuthHeaders(token));
  return res.data;
};

export const updateStudentProfile = async (token, profileData) => {
  const res = await axios.patch(`${API_URL}/profile`, profileData, getAuthHeaders(token));
  return res.data;
};

// Donor: update profile (e.g., phone)
export const updateDonorProfile = async (token, profileData) => {
  const res = await axios.patch(`${API_URL}/profile`, profileData, getAuthHeaders(token));
  return res.data;
};

export const submitProfileForApproval = async (token) => {
  const res = await axios.post(`${API_URL}/profile/submit`, {}, getAuthHeaders(token));
  return res.data;
};

export const getProfileCompletion = async (token) => {
  const res = await axios.get(`${API_URL}/profile/completion`, getAuthHeaders(token));
  return res.data;
};

// Admin: update department
export const updateAdminDepartment = async (token, department) => {
  const res = await axios.patch(`${API_URL}/profile/admin`, { department }, getAuthHeaders(token));
  return res.data;
};

// All roles: change password
export const changePassword = async (token, payload) => {
  const res = await axios.post(`${API_URL}/password/change`, payload, getAuthHeaders(token));
  return res.data;
};


