import axios from "axios";

// Choose backend URL from env, fall back to local dev
const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

// Register user
export const register = async (role, userData) => {
  const res = await axios.post(`${API_URL}/register/${role}`, userData);
  return res.data;
};

// Login
export const login = async (credentials) => {
  const res = await axios.post(`${API_URL}/login`, credentials);
  return res.data;
};