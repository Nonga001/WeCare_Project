import mongoose from "mongoose";

const ethicalFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["student", "donor", "admin", "superadmin"],
    },
    ratings: {
      dataCollectionClarity: { type: Number, min: 1, max: 5, required: true },
      necessaryDataOnly: { type: Number, min: 1, max: 5, required: true },
      dataStorageTransparency: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      informedConsent: { type: Number, min: 1, max: 5, required: true },
      fairTreatment: { type: Number, min: 1, max: 5, required: true },
      noBias: { type: Number, min: 1, max: 5, required: true },
      easyToUse: { type: Number, min: 1, max: 5, required: true },
      considerDisabilities: { type: Number, min: 1, max: 5, required: true },
      dataSecurityConfidence: { type: Number, min: 1, max: 5, required: true },
      preventMisuse: { type: Number, min: 1, max: 5, required: true },
      userControl: { type: Number, min: 1, max: 5, required: true },
      noPressure: { type: Number, min: 1, max: 5, required: true },
      addressesProblem: { type: Number, min: 1, max: 5, required: true },
      benefitsOutweighHarms: { type: Number, min: 1, max: 5, required: true },
    },
    openEnded: {
      ethicalConcern: { type: String, required: true },
      realWorldTrust: { type: String, required: true },
    },
    averageScore: { type: Number },
  },
  { timestamps: true }
);

// Calculate average score before saving
ethicalFeedbackSchema.pre("save", function (next) {
  const ratings = Object.values(this.ratings);
  this.averageScore = (
    ratings.reduce((a, b) => a + b, 0) / ratings.length
  ).toFixed(2);
  next();
});

export default mongoose.model("EthicalFeedback", ethicalFeedbackSchema);
