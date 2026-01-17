import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}`;
const API_URL = `${BASE_URL}/api/disbursements`;

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getAvailableDonations = async (token) => {
  const res = await axios.get(`${API_URL}/available`, auth(token));
  return res.data;
};

export const disburseWithMatch = async (token, aidRequestId, donationId) => {
  const res = await axios.post(`${API_URL}/disburse`, { aidRequestId, donationId }, auth(token));
  return res.data;
};

export const getDisbursementHistory = async (token) => {
  const res = await axios.get(`${API_URL}/history`, auth(token));
  return res.data;
};

export const getAvailableBalances = async (token) => {
  const res = await axios.get(`${API_URL}/balances`, auth(token));
  return res.data;
};
