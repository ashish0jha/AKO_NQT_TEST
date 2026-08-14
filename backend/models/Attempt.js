import mongoose from "mongoose";

const questionResultSchema = new mongoose.Schema(
  {
    prompt: String,
    options: [String],
    correctAnswer: String,
    userAnswer: String,
    isCorrect: Boolean,
    // for non-MCQ (sentence completion, passage recall, email, coding)
    rawResponseText: String,
    aiScore: Number, // 0-100, filled by Groq for subjective answers
    aiFeedback: String,
    timeTakenSec: Number,
  },
  { _id: false }
);

const sectionResultSchema = new mongoose.Schema(
  {
    key: String,
    label: String,
    type: String,
    startedAt: Date,
    completedAt: Date,
    questions: [questionResultSchema],
    sectionScore: Number, // 0-100
  },
  { _id: false }
);

const reportedIssueSchema = new mongoose.Schema(
  {
    sectionKey: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["in_progress", "completed", "abandoned"], default: "in_progress" },
    sections: [sectionResultSchema],
    overallScore: Number, // 0-100, computed on completion
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    lastStepIndex: { type: Number, default: 0 }, // lets a refreshed/quit test resume where it left off
    reportedIssues: [reportedIssueSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Attempt", attemptSchema);
