const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const getWalletBalance = async (token) => {
  const response = await fetch(`${API_BASE}/api/wallet/balance`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw response;
  return response.json();
};

export const getTransactionHistory = async (token, limit = 50, skip = 0) => {
  const response = await fetch(
    `${API_BASE}/api/wallet/transactions?limit=${limit}&skip=${skip}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) throw response;
  return response.json();
};

export const withdrawToMpesa = async (token, amount, phone) => {
  const response = await fetch(`${API_BASE}/api/wallet/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ amount, phone })
  });
  if (!response.ok) throw response;
  return response.json();
};
