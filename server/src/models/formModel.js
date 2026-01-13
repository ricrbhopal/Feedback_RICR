import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "short",
        "paragraph",
        "mcq",
        "checkbox",
        "dropdown",
        "star_rating",
        "yes_no",
      ],
      required: true,
    },

    options: {
      type: [String],
      default: [],
    },

    maxStars: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },

    required: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const formSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },

    questions: {
      type: [questionSchema],
      required: true,
    },

    allowedBatches: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    activatedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    // Approval workflow fields
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },

    createdByRole: {
      type: String,
      enum: ["admin", "teacher"],
      default: "admin",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model("Form", formSchema);

export default Form;
