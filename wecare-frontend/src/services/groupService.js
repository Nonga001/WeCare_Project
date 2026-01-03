import axios from "axios";

const API_URL = "http://localhost:5000/api/groups";

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const listGroups = async (token, scope = "all") => {
  const res = await axios.get(`${API_URL}?scope=${scope}`, auth(token));
  return res.data;
};

export const createGroup = async (token, payload) => {
  const res = await axios.post(API_URL, payload, auth(token));
  return res.data;
};

export const getGroup = async (token, groupId) => {
  const res = await axios.get(`${API_URL}/${groupId}`, auth(token));
  return res.data;
};

export const joinGroup = async (token, groupId, anonymous = false) => {
  const res = await axios.post(`${API_URL}/${groupId}/join`, { anonymous }, auth(token));
  return res.data;
};

// removed private-group requestJoin API

export const leaveGroup = async (token, groupId) => {
  const res = await axios.post(`${API_URL}/${groupId}/leave`, {}, auth(token));
  return res.data;
};

export const renameGroup = async (token, groupId, name) => {
  const res = await axios.patch(`${API_URL}/${groupId}/rename`, { name }, auth(token));
  return res.data;
};

export const removeMember = async (token, groupId, userId) => {
  const res = await axios.delete(`${API_URL}/${groupId}/members/${userId}`, auth(token));
  return res.data;
};

export const deleteGroup = async (token, groupId) => {
  const res = await axios.delete(`${API_URL}/${groupId}`, auth(token));
  return res.data;
};

export const postMessage = async (token, groupId, text) => {
  const res = await axios.post(`${API_URL}/${groupId}/messages`, { text }, auth(token));
  return res.data;
};

export const deleteMessage = async (token, groupId, messageId) => {
  const res = await axios.delete(`${API_URL}/${groupId}/messages/${messageId}`, auth(token));
  return res.data;
};

export const editMessage = async (token, groupId, messageId, text) => {
  const res = await axios.patch(`${API_URL}/${groupId}/messages/${messageId}`, { text }, auth(token));
  return res.data;
};

// removed private-group join-requests APIs
