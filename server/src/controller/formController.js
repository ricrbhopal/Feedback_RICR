import Form from "../models/formModel.js";
import Response from "../models/responseModel.js";



export const createForm = async (req, res, next) => {
  try {
    const { title, description, questions, assignedTo, allowedBatches } = req.body;

    if (!title || !questions || !Array.isArray(questions) || !assignedTo) {
      const error = new Error("Invalid form data");
      error.statusCode = 400;
      return next(error);
    }

    const form = await Form.create({
      title,
      description,
      questions,
      createdBy: req.user._id,
      assignedTo: assignedTo,
      allowedBatches: allowedBatches || [],
    });

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

    res.status(200).json({
      data: form,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllForms = async (req, res, next) => {
  try {
    let forms;

    if (req.user.role === "admin") {
      // Admin sees all forms
      forms = await Form.find().sort({ createdAt: -1 });
    } else {
      // Teacher sees only forms assigned to them
      forms = await Form.find({ assignedTo: req.user._id })
        .sort({ createdAt: -1 });
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

    // Only admin can update forms
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!title || !questions || !Array.isArray(questions) || !assignedTo) {
      const error = new Error("Invalid form data");
      error.statusCode = 400;
      return next(error);
    }

    form.title = title;
    form.description = description;
    form.questions = questions;
    form.assignedTo = assignedTo;
    form.allowedBatches = allowedBatches || [];

    await form.save();

    res.json({
      message: "Form updated successfully",
      data: form
    });
  } catch (error) {
    next(error);
  }
};







