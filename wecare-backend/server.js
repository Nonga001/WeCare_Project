import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import notificationRoutes from "./routes/notifications.js";
import aidRoutes from "./routes/aid.js";
import donationRoutes from "./routes/donations.js";
import disbursementRoutes from "./routes/disbursements.js";
import groupRoutes from "./routes/groups.js";
import mpesaRoutes from "./routes/mpesa.js";
import configRoutes from "./routes/config.js";
import walletRoutes from "./routes/wallet.js";
import { startDeletionScheduler } from "./services/deletionService.js";
import Group from "./models/Group.js";
import User from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files from /uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/aid", aidRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/disbursements", disbursementRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/config", configRoutes);
app.use("/api/wallet", walletRoutes);

const PORT = process.env.PORT || 5000;
// Create HTTP server and Socket.IO
import http from "http";
import { Server as SocketIOServer } from "socket.io";
const httpServer = http.createServer(app);
const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [frontendOrigin]
  : ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"];

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

io.on("connection", (socket) => {
  // Authenticate via token and join rooms
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) return socket.disconnect(true);
    // Lazily import to avoid circular
    import("./middleware/authMiddleware.js").then(async ({ verifySocketToken }) => {
      const payload = verifySocketToken(token);
      if (!payload) return socket.disconnect(true);
      const userId = payload.id;
      const role = payload.role;
      if (userId) socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
      
      // Join all groups the user is a member of
      try {
        const userGroups = await Group.find({ 'members.user': userId });
        userGroups.forEach(g => socket.join(`group:${g._id}`));
      } catch {}
    }).catch(() => socket.disconnect(true));
  } catch {
    socket.disconnect(true);
  }
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    // Ensure a single global group exists for all students
    const admins = await User.find({ role: "admin" }).select("_id");
    const superadmin = await User.findOne({ role: "superadmin" }).select("_id");
    const seededSuperadmin = await User.findOne({ email: "wecare@admin.com" }).select("_id");
    const creatorId = admins[0]?._id || superadmin?._id || seededSuperadmin?._id;
    
    if (creatorId) {
      let global = await Group.findOne({ isGlobal: true, name: "All Universities Students" });
      if (!global) {
        // Make all university admins moderators of this global group
        global = await Group.create({
          name: "All Universities Students",
          isGlobal: true,
          createdBy: creatorId,
          moderators: admins.map(a => a._id)
        });
        console.log("✅ Created global group: All Universities Students");
      }
    } else {
      console.log("ℹ️  Skipping global group creation - no admins or superadmin found");
    }
  } catch (e) {
    console.error("Failed to ensure global group:", e?.message || e);
  }

  // Start background deletion scheduler
  startDeletionScheduler();

  // Background task: Sync old pending donations with M-Pesa status
  const syncPendingDonations = async () => {
    try {
      const Donation = (await import("./models/Donation.js")).default;
      const { querySTKPushStatus } = await import("./services/mpesaService.js");
      
      // Find donations pending for more than 2 minutes but less than 3 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      
      const pendingDonations = await Donation.find({
        status: "pending",
        paymentMethod: "mpesa",
        mpesaCheckoutRequestId: { $exists: true, $ne: null },
        createdAt: { $lt: twoMinutesAgo }
      }).limit(10);

      for (const donation of pendingDonations) {
        try {
          const response = await querySTKPushStatus(donation.mpesaCheckoutRequestId);
          const resultCode = Number(response?.ResultCode ?? response?.ResponseCode ?? NaN);
          
          if (!Number.isNaN(resultCode)) {
            donation.mpesaResultCode = resultCode;
            donation.mpesaResultDesc = response?.ResultDesc || response?.ResponseDescription;
            
            if (resultCode === 0) {
              donation.status = "confirmed";
              await donation.save();
              console.log(`[Sync] Updated donation ${donation._id.toString()} to confirmed`);
            } else if (resultCode === 1001 || resultCode === 1002) {
              donation.status = "failed";
              if (resultCode === 1001) {
                donation.mpesaResultDesc = "User cancelled the payment prompt";
              }
              await donation.save();
              console.log(`[Sync] Updated donation ${donation._id.toString()} to failed`);
            }
          }
        } catch (err) {
          console.warn(`[Sync] Failed to check donation ${donation._id.toString()}:`, err.message);
        }
      }
    } catch (err) {
      console.warn("[Sync] Background sync task failed:", err.message);
    }
  };

  // Run sync task every 30 seconds
  setInterval(syncPendingDonations, 30 * 1000);
  console.log("✅ Background donation sync task started");

});
