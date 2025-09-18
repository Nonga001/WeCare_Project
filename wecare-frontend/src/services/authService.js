import axios from "axios";

const API_URL = "http://localhost:5000/api/auth"; // backend endpoint

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