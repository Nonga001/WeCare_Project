import SuperAdminConfig from "../models/SuperAdminConfig.js";

// Get system configuration (public - no auth needed for maintenance check)
export const getSystemConfig = async (req, res) => {
  try {
    const [
      maintenanceConfig,
      announcementConfig,
      showAnnouncementConfig,
      sessionTimeoutConfig,
      maxLoginAttemptsConfig,
      lockoutDurationConfig
    ] = await Promise.all([
      SuperAdminConfig.findOne({ key: "maintenanceMode" }),
      SuperAdminConfig.findOne({ key: "announcementBanner" }),
      SuperAdminConfig.findOne({ key: "showAnnouncement" }),
      SuperAdminConfig.findOne({ key: "sessionTimeoutHours" }),
      SuperAdminConfig.findOne({ key: "maxLoginAttempts" }),
      SuperAdminConfig.findOne({ key: "lockoutDurationMinutes" })
    ]);

    res.json({
      maintenanceMode: maintenanceConfig?.value === "true",
      announcementBanner: announcementConfig?.value || "",
      showAnnouncement: showAnnouncementConfig?.value === "true",
      sessionTimeoutHours: sessionTimeoutConfig?.value || "24",
      maxLoginAttempts: maxLoginAttemptsConfig?.value || "5",
      lockoutDurationMinutes: lockoutDurationConfig?.value || "30"
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update system configuration (super admin only)
export const updateSystemConfig = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only super admin can update system configuration" });
    }

    const {
      maintenanceMode,
      announcementBanner,
      showAnnouncement,
      sessionTimeoutHours,
      maxLoginAttempts,
      lockoutDurationMinutes
    } = req.body;

    // Update or create maintenance mode
    if (maintenanceMode !== undefined) {
      await SuperAdminConfig.findOneAndUpdate(
        { key: "maintenanceMode" },
        { value: String(maintenanceMode) },
        { upsert: true, new: true }
      );
    }

    // Update or create announcement banner
    if (announcementBanner !== undefined) {
      await SuperAdminConfig.findOneAndUpdate(
        { key: "announcementBanner" },
        { value: String(announcementBanner) },
        { upsert: true, new: true }
      );
    }

    // Update or create show announcement toggle
    if (showAnnouncement !== undefined) {
      await SuperAdminConfig.findOneAndUpdate(
        { key: "showAnnouncement" },
        { value: String(showAnnouncement) },
        { upsert: true, new: true }
      );
    }

    if (sessionTimeoutHours !== undefined) {
      await SuperAdminConfig.findOneAndUpdate(
        { key: "sessionTimeoutHours" },
        { value: String(sessionTimeoutHours) },
        { upsert: true, new: true }
      );
    }

    if (maxLoginAttempts !== undefined) {
      await SuperAdminConfig.findOneAndUpdate(
        { key: "maxLoginAttempts" },
        { value: String(maxLoginAttempts) },
        { upsert: true, new: true }
      );
    }

    if (lockoutDurationMinutes !== undefined) {
      await SuperAdminConfig.findOneAndUpdate(
        { key: "lockoutDurationMinutes" },
        { value: String(lockoutDurationMinutes) },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "System configuration updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
