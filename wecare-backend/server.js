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
import groupRoutes from "./routes/groups.js";
import Group from "./models/Group.js";
import User from "./models/User.js";

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
app.use("/api/groups", groupRoutes);

const PORT = process.env.PORT || 5000;
// Create HTTP server and Socket.IO
import http from "http";
import { Server as SocketIOServer } from "socket.io";
const httpServer = http.createServer(app);
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  // Optionally join by role or user id if sent in handshake query later
  // socket.join(`user:${userId}`) or socket.join(`role:${role}`)
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    // Ensure a single global group exists for all students
    let global = await Group.findOne({ isGlobal: true, name: "All Universities Students" });
    if (!global) {
      // Make all university admins moderators of this global group
      const admins = await User.find({ role: "admin" }).select("_id");
      global = await Group.create({
        name: "All Universities Students",
        isGlobal: true,
        createdBy: admins[0]?._id || (await User.findOne({ role: "superadmin" }))?._id,
        moderators: admins.map(a => a._id)
      });
      console.log("✅ Created global group: All Universities Students");
    }
  } catch (e) {
    console.error("Failed to ensure global group:", e?.message || e);
  }
});
