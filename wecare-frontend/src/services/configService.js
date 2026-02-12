import axios from "axios";

const API_BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

// Get system configuration (public - no auth needed)
export const getSystemConfig = async () => {
  const res = await axios.get(`${API_BASE_URL}/config/system`);
  return res.data;
};

// Update system configuration (super admin only)
export const updateSystemConfig = async (token, config) => {
  const res = await axios.put(
    `${API_BASE_URL}/config/system`,
    config,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return res.data;
};
