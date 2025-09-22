import axios from "axios";

const API_URL = "http://localhost:5000/api/donations";

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const createDonation = async (token, payload) => {
  const res = await axios.post(API_URL, payload, auth(token));
  return res.data;
};

export const getMyDonations = async (token) => {
  const res = await axios.get(`${API_URL}/mine`, auth(token));
  return res.data;
};

export const getGlobalAidRequests = async (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.minAmount) params.append('minAmount', filters.minAmount);
  
  const res = await axios.get(`${API_URL}/global-requests?${params}`, auth(token));
  return res.data;
};

export const getDonorStats = async (token) => {
  const res = await axios.get(`${API_URL}/stats`, auth(token));
  return res.data;
};

export const getAllDonations = async (token) => {
  const res = await axios.get(`${API_URL}/all`, auth(token));
  return res.data;
};

export const getGlobalStats = async (token) => {
  const res = await axios.get(`${API_URL}/global-stats`, auth(token));
  return res.data;
};

export const getSuperAnalytics = async (token) => {
  const res = await axios.get(`${API_URL}/super-analytics`, auth(token));
  return res.data;
};
