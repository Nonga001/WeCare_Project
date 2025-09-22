import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import notificationRoutes from "./routes/notifications.js";
import aidRoutes from "./routes/aid.js";
import donationRoutes from "./routes/donations.js";
import disbursementRoutes from "./routes/disbursements.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/aid", aidRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/disbursements", disbursementRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
