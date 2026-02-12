import bcrypt from "bcryptjs";
import User from "../models/User.js";
import DeletionRequest from "../models/DeletionRequest.js";

/**
 * Process account deletions for records past their grace period
 * Runs every hour to check for expired deletion requests
 */
export const processPendingDeletions = async () => {
  try {
    const now = new Date();

    // Find all confirmed deletion requests that have passed their scheduled deletion date
    const expiredRequests = await DeletionRequest.find({
      status: "confirmed",
      scheduledDeletionDate: { $lte: now }
    });

    if (expiredRequests.length === 0) {
      console.log(`[Deletion Service] No expired deletion requests to process at ${now.toISOString()}`);
      return;
    }

    console.log(`[Deletion Service] Processing ${expiredRequests.length} expired deletion request(s) at ${now.toISOString()}`);

    for (const request of expiredRequests) {
      try {
        // Soft delete: anonymize user data instead of hard delete
        const user = await User.findById(request.userId);

        if (user) {
          const randomPassword = `${request.userId}-${Date.now()}-${Math.random()}`;
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          // Anonymize user data
          user.name = `Deleted User ${request.userId.toString().slice(-6).toUpperCase()}`;
          user.email = `deleted-${request.userId}@noreply.local`;
          user.phone = "";
          user.universityId = "";
          user.university = "";
          user.idNumber = "";
          user.course = "";
          user.year = "";
          user.department = "";
          user.profileDocument = "";
          user.profileCompletion = 0;
          user.password = hashedPassword;
          user.isApproved = false;
          user.isSuspended = true;
          user.deletionRequested = false;
          user.deletionRequestedAt = null;
          user.deletionScheduledFor = null;

          await user.save();
          console.log(`[Deletion Service] Anonymized user ${request.userId} (${request.userEmail})`);
        }

        // Mark deletion request as completed
        request.status = "completed";
        request.completedAt = new Date();
        await request.save();
        console.log(`[Deletion Service] Marked deletion request ${request._id} as completed`);

      } catch (error) {
        console.error(`[Deletion Service] Error processing deletion request ${request._id}:`, error.message);
      }
    }

    console.log(`[Deletion Service] Finished processing deletions at ${now.toISOString()}`);
  } catch (error) {
    console.error("[Deletion Service] Error in processPendingDeletions:", error.message);
  }
};

/**
 * Start the background deletion job
 * Runs every hour to process expired deletion requests
 */
export const startDeletionScheduler = () => {
  // Run immediately on startup
  processPendingDeletions();

  // Then run every hour (3600000 milliseconds)
  const intervalId = setInterval(() => {
    processPendingDeletions();
  }, 3600000); // 1 hour

  console.log("[Deletion Service] Background deletion scheduler started (runs every hour)");

  return intervalId;
};
