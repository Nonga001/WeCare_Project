import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}`;
const API_URL = `${BASE_URL}/api/donations`;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const createDonation = async (token, payload) => {
  const res = await axios.post(API_URL, payload, auth(token));
  return res.data;
};

export const getMyDonations = async (token) => {
  const res = await axios.get(`${API_URL}/mine`, auth(token));
  return res.data;
};

export const clearMyDonations = async (token) => {
  const res = await axios.delete(`${API_URL}/mine`, auth(token));
  return res.data;
};

export const queryDonationStatus = async (token, donationId) => {
  const res = await axios.get(`${API_URL}/${donationId}/status`, auth(token));
  return res.data;
};

export const getGlobalAidRequests = async (token, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.minAmount) params.append('minAmount', filters.minAmount);
  
  const res = await axios.get(`${API_URL}/global-requests?${params}`, auth(token));
  return res.data;
};

export const getDonorStats = async (token, period) => {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  const query = params.toString();
  const url = query ? `${API_URL}/stats?${query}` : `${API_URL}/stats`;
  const res = await axios.get(url, auth(token));
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
