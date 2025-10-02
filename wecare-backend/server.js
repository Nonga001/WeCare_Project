import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import notificationRoutes from "./routes/notifications.js";
import aidRoutes from "./routes/aid.js";
import donationRoutes from "./routes/donations.js";
import disbursementRoutes from "./routes/disbursements.js";
import groupRoutes from "./routes/groups.js";
import errorRoutes from "./routes/errors.js";
import Group from "./models/Group.js";
import User from "./models/User.js";
import { initializeSuperAdmin } from "./utils/superAdminInit.js";
import { requestLogger, errorLogger, suspiciousActivityDetector } from "./utils/securityLogger.js";

dotenv.config();
connectDB();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit auth attempts
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use("/api/auth", authLimiter);

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
  credentials: true // Enable cookies for cross-origin requests
}));

app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Enable cookie parsing

// Sanitize user input to prevent NoSQL injection attacks
app.use(mongoSanitize());

// Security logging and monitoring
app.use(requestLogger);
app.use(suspiciousActivityDetector);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/aid", aidRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/disbursements", disbursementRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/errors", errorRoutes);

// Error handling middleware (must be last)
app.use(errorLogger);

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
  // Authenticate via token and join rooms
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) return socket.disconnect(true);
    // Lazily import to avoid circular
    import("./middleware/authMiddleware.js").then(({ verifySocketToken }) => {
      const payload = verifySocketToken(token);
      if (!payload) return socket.disconnect(true);
      const userId = payload.id;
      const role = payload.role;
      if (userId) socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
    }).catch(() => socket.disconnect(true));
  } catch {
    socket.disconnect(true);
  }
});

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try {
    // Initialize secure superadmin system
    console.log("🔐 Initializing SuperAdmin system...");
    await initializeSuperAdmin();
    
    // Ensure a single global group exists for all students
    let global = await Group.findOne({ isGlobal: true, name: "All Universities Students" });
    if (!global) {
      // Make all university admins moderators of this global group
      const admins = await User.find({ role: "admin" }).select("_id");
      const superAdmin = await User.findOne({ role: "superadmin" });
      
      global = await Group.create({
        name: "All Universities Students",
        isGlobal: true,
        createdBy: admins[0]?._id || superAdmin?._id,
        moderators: admins.map(a => a._id)
      });
      console.log("✅ Created global group: All Universities Students");
    }
  } catch (e) {
    console.error("❌ Initialization error:", e?.message || e);
  }
});
