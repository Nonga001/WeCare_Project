import { useState, useEffect } from "react";
import { getSystemConfig } from "../services/configService";

const AnnouncementBanner = () => {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const systemConfig = await getSystemConfig();
        setConfig(systemConfig);
      } catch (err) {
        console.error("Failed to load system config:", err);
      }
    };
    loadConfig();
    
    // Optionally refresh every 5 minutes
    const interval = setInterval(loadConfig, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!config || !config.showAnnouncement || !config.announcementBanner) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 pt-0.5">
            {/* Megaphone/Announcement Icon */}
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 11c0 1.657-1.343 3-3 3v2c2.761 0 5-2.239 5-5s-2.239-5-5-5V8c1.657 0 3 1.343 3 3zM15 3v18c0 .55-.45 1-1 1s-1-.45-1-1v-2H5c-1.105 0-2-.895-2-2v-5c0-1.105.895-2 2-2h8V8c-1.657 0-3-1.343-3-3V3c0-.55.45-1 1-1s1 .45 1 1v2c0 1.657 1.343 3 3 3zM5 11v6h8v-6H5z"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">
              <span className="font-bold">Announcement:</span> {config.announcementBanner}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
