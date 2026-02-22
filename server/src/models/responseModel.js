import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true
    },

    studentName: {
      type: String,
      required: true,
      trim: true
    },

    batch: {
      type: String,
      required: true,
      trim: true
    },

    studentEmail: {
      type: String,
      trim: true
    },

    answers: {
      type: [answerSchema],
      required: true
    },

    // Re-Feedback fields
    isReFeedback: {
      type: Boolean,
      default: false
    },

    originalResponseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Response",
      default: null
    },

    previousAnswers: {
      type: [answerSchema],
      default: []
    },

    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookups
responseSchema.index({ form: 1, submittedAt: -1 });
responseSchema.index({ form: 1, studentName: 1, batch: 1, submittedAt: 1 });
responseSchema.index({ form: 1, batch: 1 });

const Response = mongoose.model("Response", responseSchema);

export default Response;
