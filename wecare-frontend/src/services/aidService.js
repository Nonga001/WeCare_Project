import axios from "axios";

const API_URL = "http://localhost:5000/api/aid";

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const createAid = async (token, payload) => {
  const res = await axios.post(API_URL, payload, auth(token));
  return res.data;
};

export const myAidRequests = async (token) => {
  const res = await axios.get(`${API_URL}/mine`, auth(token));
  return res.data;
};

export const uniAidRequests = async (token) => {
  const res = await axios.get(`${API_URL}/university`, auth(token));
  return res.data;
};

export const setAidStatus = async (token, id, status) => {
  const res = await axios.patch(`${API_URL}/${id}/status`, { status }, auth(token));
  return res.data;
};

export const moveToWaiting = async (token, id) => {
  const res = await axios.patch(`${API_URL}/${id}/waiting`, {}, auth(token));
  return res.data;
};

export const disburseAid = async (token, id) => {
  const res = await axios.post(`${API_URL}/${id}/disburse`, {}, auth(token));
  return res.data;
};

export const getAidStats = async (token) => {
  const res = await axios.get(`${API_URL}/stats`, auth(token));
  return res.data;
};


