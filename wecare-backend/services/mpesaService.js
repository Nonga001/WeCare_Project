import axios from "axios";

const getMpesaConfig = () => ({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  environment: process.env.MPESA_ENVIRONMENT || "sandbox",
});

const REQUIRED_CONFIG = [
  ["consumerKey", "MPESA_CONSUMER_KEY"],
  ["consumerSecret", "MPESA_CONSUMER_SECRET"],
  ["shortcode", "MPESA_SHORTCODE"],
  ["passkey", "MPESA_PASSKEY"],
  ["callbackUrl", "MPESA_CALLBACK_URL"],
];

const getBaseUrl = (config) =>
  config.environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

const assertMpesaConfig = (config) => {
  const missing = REQUIRED_CONFIG
    .filter(([key]) => !config[key])
    .map(([, env]) => env);

  if (missing.length > 0) {
    const error = new Error(
      `M-Pesa is not configured. Missing: ${missing.join(", ")}`
    );
    error.code = "MPESA_CONFIG_MISSING";
    throw error;
  }
};

const buildMpesaError = (err, fallbackMessage) => {
  const detail =
    err?.response?.data?.errorMessage ||
    err?.response?.data?.error ||
    err?.response?.data?.ResponseDescription;
  const message = detail
    ? `${fallbackMessage}: ${detail}`
    : `${fallbackMessage}: ${err?.message || "Unknown error"}`;
  const error = new Error(message);
  error.code = "MPESA_REQUEST_FAILED";
  return error;
};

const getOAuthToken = async () => {
  const config = getMpesaConfig();
  assertMpesaConfig(config);
  const auth = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  try {
    const response = await axios.get(
      `${getBaseUrl(config)}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data.access_token;
  } catch (err) {
    throw buildMpesaError(err, "Failed to get M-Pesa OAuth token");
  }
};

const generateTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const generatePassword = (config, timestamp) => {
  const str = `${config.shortcode}${config.passkey}${timestamp}`;
  return Buffer.from(str).toString("base64");
};

const normalizePhone = (phoneNumber) => {
  let formatted = String(phoneNumber || "").replace(/\s/g, "");
  if (formatted.startsWith("0")) {
    formatted = `254${formatted.substring(1)}`;
  } else if (formatted.startsWith("+")) {
    formatted = formatted.substring(1);
  }
  return formatted;
};

export const initiateSTKPush = async (
  phoneNumber,
  amount,
  accountReference,
  transactionDesc
) => {
  const config = getMpesaConfig();
  assertMpesaConfig(config);
  const token = await getOAuthToken();
  const timestamp = generateTimestamp();
  const password = generatePassword(config, timestamp);
  const formattedPhone = normalizePhone(phoneNumber);
  const finalAmount = Math.max(1, Math.round(Number(amount) || 0));

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: finalAmount,
    PartyA: formattedPhone,
    PartyB: config.shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: config.callbackUrl,
    AccountReference: accountReference || "Donation",
    TransactionDesc: transactionDesc || "Donation",
  };

  try {
    const response = await axios.post(
      `${getBaseUrl(config)}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    throw buildMpesaError(err, "M-Pesa STK push failed");
  }
};

export const querySTKPushStatus = async (checkoutRequestId) => {
  const config = getMpesaConfig();
  assertMpesaConfig(config);
  const token = await getOAuthToken();
  const timestamp = generateTimestamp();
  const password = generatePassword(config, timestamp);

  const payload = {
    BusinessShortCode: config.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  try {
    const response = await axios.post(
      `${getBaseUrl(config)}/mpesa/stkpushquery/v1/query`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (err) {
    throw buildMpesaError(err, "M-Pesa status query failed");
  }
};

export const mpesaConfig = getMpesaConfig;
