import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const BASE_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}`;

const EthicalFeedback = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [ratings, setRatings] = useState({
    // Data Privacy & Necessity
    dataCollectionClarity: 3,
    necessaryDataOnly: 3,
    // Transparency & Consent
    dataStorageTransparency: 3,
    informedConsent: 3,
    // Fairness & Bias
    fairTreatment: 3,
    noBias: 3,
    // Accessibility & Inclusion
    easyToUse: 3,
    considerDisabilities: 3,
    // Security & Trust
    dataSecurityConfidence: 3,
    preventMisuse: 3,
    // User Control & Autonomy
    userControl: 3,
    noPressure: 3,
    // Social Impact
    addressesProblem: 3,
    benefitsOutweighHarms: 3,
  });

  const [openEnded, setOpenEnded] = useState({
    ethicalConcern: "",
    realWorldTrust: "",
  });

  const handleRatingChange = (field, value) => {
    setRatings((prev) => ({ ...prev, [field]: parseInt(value) }));
  };

  const handleOpenEndedChange = (field, value) => {
    setOpenEnded((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!openEnded.ethicalConcern.trim() || !openEnded.realWorldTrust.trim()) {
      setError("Please answer both open-ended questions");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await axios.post(
        `${BASE_URL}/api/users/ethical-feedback`,
        {
          ratings,
          openEnded,
          userId: user?.id,
          role: user?.role,
        },
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );

      setSuccess("Thank you for your ethical feedback! Your response has been recorded.");
      setRatings({
        dataCollectionClarity: 3,
        necessaryDataOnly: 3,
        dataStorageTransparency: 3,
        informedConsent: 3,
        fairTreatment: 3,
        noBias: 3,
        easyToUse: 3,
        considerDisabilities: 3,
        dataSecurityConfidence: 3,
        preventMisuse: 3,
        userControl: 3,
        noPressure: 3,
        addressesProblem: 3,
        benefitsOutweighHarms: 3,
      });
      setOpenEnded({
        ethicalConcern: "",
        realWorldTrust: "",
      });
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const RatingSection = ({ title, questions }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.field}>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2">
              {q.label}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 items-center flex-wrap">
              {[1, 2, 3, 4, 5].map((num) => (
                <label key={num} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={q.field}
                    value={num}
                    checked={ratings[q.field] === num}
                    onChange={(e) => handleRatingChange(q.field, e.target.value)}
                    className="w-4 h-4 accent-amber-600"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{num}</span>
                </label>
              ))}
              <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                {ratings[q.field] === 1
                  ? "Strongly Disagree"
                  : ratings[q.field] === 2
                  ? "Disagree"
                  : ratings[q.field] === 3
                  ? "Neutral"
                  : ratings[q.field] === 4
                  ? "Agree"
                  : "Strongly Agree"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Ethical System Assessment</h1>
        <p className="text-amber-100 text-sm sm:text-base">
          Help us understand how well this system upholds ethical principles. Your honest feedback is valuable.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Data Privacy & Necessity */}
        <RatingSection
          title="1. Data Privacy & Necessity"
          questions={[
            {
              field: "dataCollectionClarity",
              label: "I clearly understood what personal data was being collected and why.",
            },
            {
              field: "necessaryDataOnly",
              label: "The system requested only necessary data for its intended purpose.",
            },
          ]}
        />

        {/* Transparency & Consent */}
        <RatingSection
          title="2. Transparency & Consent"
          questions={[
            {
              field: "dataStorageTransparency",
              label: "I was informed how my data would be stored, used, or shared.",
            },
            {
              field: "informedConsent",
              label: "I was able to give informed consent before using the system.",
            },
          ]}
        />

        {/* Fairness & Bias */}
        <RatingSection
          title="3. Fairness & Bias"
          questions={[
            {
              field: "fairTreatment",
              label: "The system treats different users fairly without discrimination.",
            },
            {
              field: "noBias",
              label: "The system does not unfairly advantage or disadvantage any group.",
            },
          ]}
        />

        {/* Accessibility & Inclusion */}
        <RatingSection
          title="4. Accessibility & Inclusion"
          questions={[
            {
              field: "easyToUse",
              label: "The system is easy to use regardless of technical ability.",
            },
            {
              field: "considerDisabilities",
              label: "The system considers users with disabilities or limited resources.",
            },
          ]}
        />

        {/* Security & Trust */}
        <RatingSection
          title="5. Security & Trust"
          questions={[
            {
              field: "dataSecurityConfidence",
              label: "I felt confident that my data was secure while using the system.",
            },
            {
              field: "preventMisuse",
              label: "The system prevents misuse or abuse by unauthorized users.",
            },
          ]}
        />

        {/* User Control & Autonomy */}
        <RatingSection
          title="6. User Control & Autonomy"
          questions={[
            {
              field: "userControl",
              label: "I felt in control of my actions and decisions while using the system.",
            },
            {
              field: "noPressure",
              label: "The system does not pressure users into unwanted actions.",
            },
          ]}
        />

        {/* Social Impact */}
        <RatingSection
          title="7. Social Impact"
          questions={[
            {
              field: "addressesProblem",
              label: "The system clearly addresses a real and meaningful problem.",
            },
            {
              field: "benefitsOutweighHarms",
              label: "The potential benefits of the system outweigh possible harms.",
            },
          ]}
        />

        {/* Open-ended questions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Open-Ended Questions</h3>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
              What ethical concern stood out most while using this system?
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={openEnded.ethicalConcern}
              onChange={(e) => handleOpenEndedChange("ethicalConcern", e.target.value)}
              placeholder="Share your thoughts..."
              rows="4"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 dark:text-slate-300 mb-2 font-medium">
              Would you trust this system in a real-world setting? Why or why not?
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={openEnded.realWorldTrust}
              onChange={(e) => handleOpenEndedChange("realWorldTrust", e.target.value)}
              placeholder="Share your thoughts..."
              rows="4"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EthicalFeedback;
