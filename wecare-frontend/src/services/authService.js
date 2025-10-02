import axios from "axios";

const API_URL = "http://localhost:5000/api/auth"; // backend endpoint

// Register user
export const register = async (role, userData) => {
  const res = await axios.post(`${API_URL}/register/${role}`, userData);
  return res.data;
};

// Configure axios to include cookies for secure authentication
axios.defaults.withCredentials = true;

// Login
export const login = async (credentials) => {
  const res = await axios.post(`${API_URL}/login`, credentials, {
    withCredentials: true // Include httpOnly cookies
  });
  return res.data;
};

// Logout 
export const logout = async () => {
  const res = await axios.post(`${API_URL}/logout`, {}, {
    withCredentials: true // Include httpOnly cookies for secure logout
  });
  return res.data;
};