import Form from "../models/formModel.js";
import Response from "../models/responseModel.js";



export const createForm = async (req, res, next) => {
  try {
    const { title, description, questions, assignedTo, allowedBatches } = req.body;

    // Validate input with clearer error responses to help debugging
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }

    if (!questions) {
      return res.status(400).json({ message: 'questions is required' });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: 'questions must be an array' });
    }

    if (questions.length === 0) {
      return res.status(400).json({ message: 'questions array must have at least one question' });
    }

    // Admin form: assign to teachers immediately (approved)
    // Teacher form: no assignedTo, pending approval
    let formData = {
      title,
      description,
      questions,
      createdBy: req.user._id,
      createdByRole: req.user.role,
      allowedBatches: allowedBatches || [],
    };

    if (req.user.role === "admin") {
      // Admin creating form for a teacher
      if (!assignedTo) {
        const error = new Error("assignedTo is required for admin");
        error.statusCode = 400;
        return next(error);
      }
      formData.assignedTo = assignedTo;
      formData.approvalStatus = "approved";
      formData.approvedBy = req.user._id;
      formData.approvedAt = new Date();
      // Admin-created forms should remain inactive until manually activated
      formData.isActive = false;
    } else {
      // Teacher creating form (pending approval)
      formData.approvalStatus = "pending";
      // Do not make teacher-submitted forms active until approved
      formData.isActive = false;
    }

    const form = await Form.create(formData);

    res.status(201).json({
      message: "Form created successfully",
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

export const getFormById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const form = await Form.findById(id);
    if (!form) {
      const error = new Error("Form not found");
      error.statusCode = 404;
      return next(error);
    }

    // Check if user is authenticated and is admin or the creator
    // If not authenticated or not admin, only allow approved and active forms
    if (req.user) {
      // User is authenticated
      if (req.user.role !== "admin" && form.createdBy.toString() !== req.user._id.toString()) {
        // Not admin and not the creator - check approval status
        if (form.approvalStatus !== "approved") {
          const error = new Error("Form not available");
          error.statusCode = 403;
          return next(error);
        }
      }
    } else {
      // User is not authenticated - only allow approved forms
      if (form.approvalStatus !== "approved") {
        const error = new Error("Form not available");
        error.statusCode = 403;
        return next(error);
      }
    }

    // Check if form should be auto-deactivated (15 minutes after activation)
    if (form.isActive && form.activatedAt) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (form.activatedAt < fifteenMinutesAgo) {
        form.isActive = false;
        form.activatedAt = null;
        await form.save();
      }
    }

    res.status(200).json({
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllForms = async (req, res, next) => {
  try {
    // Support query param ?assigned=true to return only forms assigned to the
    // authenticated teacher (approved forms assigned to them). This allows
    // the frontend to fetch assigned forms directly from the backend.
    const onlyAssigned = req.query.assigned === 'true';

    let forms;
    if (onlyAssigned) {
      // Only teachers should call this; admins can still use it but will get all assigned forms
      forms = await Form.find({ assignedTo: req.user._id, approvalStatus: "approved" }).sort({ createdAt: -1 });
    } else if (req.user.role === "admin") {
      // Admin sees all forms (created by admin and pending/approved from teachers)
      forms = await Form.find().sort({ createdAt: -1 });
    } else {
      // Teacher sees:
      // 1. Forms created by them
      // 2. Forms assigned to them by admin that are approved
      forms = await Form.find({
        $or: [
          { createdBy: req.user._id },
          { assignedTo: req.user._id, approvalStatus: "approved" }
        ]
      }).sort({ createdAt: -1 });
    }

    res.json({ data: forms });
  } catch (error) {
    next(error);
  }
};

export const deleteForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (
      req.user.role !== "admin" &&
      form.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Delete all responses associated with this form
    await Response.deleteMany({ form: form._id });

    await form.deleteOne();
    res.json({ message: "Form and associated responses deleted" });
  } catch (error) {
    next(error);
  }
};

export const toggleFormStatus = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Admin can toggle any form, teacher can only toggle forms assigned to them
    if (
      req.user.role !== "admin" &&
      form.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    form.isActive = !form.isActive;
    
    // If activating, set activatedAt timestamp
    if (form.isActive) {
      form.activatedAt = new Date();
    } else {
      // If deactivating manually, clear activatedAt
      form.activatedAt = null;
    }
    
    await form.save();

    res.json({ 
      message: `Form ${form.isActive ? 'activated' : 'deactivated'} successfully`,
      data: form 
    });
  } catch (error) {
    next(error);
  }
};

export const updateForm = async (req, res, next) => {
  try {
    const { title, description, questions, assignedTo, allowedBatches } = req.body;
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Teacher can update their own pending forms
    // Admin can update any form
    if (req.user.role === "teacher") {
      if (form.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not allowed" });
      }
      if (form.approvalStatus !== "pending") {
        return res.status(403).json({ message: "Can only edit pending forms" });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!title || !questions || !Array.isArray(questions)) {
      const error = new Error("Invalid form data");
      error.statusCode = 400;
      return next(error);
    }

    form.title = title;
    form.description = description;
    form.questions = questions;
    form.allowedBatches = allowedBatches || [];

    // Admin can also change assignedTo and approval status
    if (req.user.role === "admin") {
      form.assignedTo = assignedTo || form.assignedTo;
    }

    await form.save();

    res.json({
      message: "Form updated successfully",
      data: form
    });
  } catch (error) {
    next(error);
  }
};

export const approveForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Only admin can approve forms
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (form.approvalStatus !== "pending") {
      return res.status(400).json({ message: "Form is not pending approval" });
    }

    const { assignedTo } = req.body;
    if (!assignedTo) {
      return res.status(400).json({ message: "assignedTo is required" });
    }

    form.approvalStatus = "approved";
    form.approvedBy = req.user._id;
    form.approvedAt = new Date();
    form.assignedTo = assignedTo;

    // Do NOT auto-activate on approval; admin will manually activate when ready
    form.isActive = false;
    form.activatedAt = null;

    await form.save();

    res.json({
      message: "Form approved successfully",
      data: form
    });
  } catch (error) {
    next(error);
  }
};

export const rejectForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Only admin can reject forms
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (form.approvalStatus !== "pending") {
      return res.status(400).json({ message: "Form is not pending approval" });
    }

    const { reason } = req.body;

    form.approvalStatus = "rejected";
    form.rejectionReason = reason || "Rejected by admin";
    // Ensure rejected forms are not active
    form.isActive = false;
    form.activatedAt = null;

    await form.save();

    res.json({
      message: "Form rejected successfully",
      data: form
    });
  } catch (error) {
    next(error);
  }
};







