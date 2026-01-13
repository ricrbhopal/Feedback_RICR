import Response from "../models/responseModel.js";
import Form from "../models/formModel.js";

export const submitResponse = async (req, res) => {
  try {
    //console.log("REQ BODY:", req.body);
    //console.log("FORM ID:", req.params.formId);

    const { formId } = req.params;
    const { studentName, batch, answers } = req.body;

    if (!batch || !batch.trim()) {
      return res.status(400).json({ message: "Batch is required" });
    }

    // Check if form exists and get allowedBatches
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Validate batch against allowedBatches if specified
    if (form.allowedBatches && form.allowedBatches.length > 0) {
      if (!form.allowedBatches.includes(batch.trim())) {
        return res.status(400).json({ 
          message: "Invalid batch. Please select a batch from the allowed list." 
        });
      }
    }

    // Check if student has already submitted the form today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingResponse = await Response.findOne({
      form: formId,
      studentName: studentName.trim(),
      batch: batch.trim(),
      submittedAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingResponse) {
      return res.status(400).json({ 
        message: "You have already submitted this form today. Only one submission per day is allowed." 
      });
    }

    const response = await Response.create({
      form: formId,
      studentName,
      batch,
      answers
    });

    res.status(201).json({
      message: "Response submitted successfully",
      data: response
    });
  } catch (error) {
    console.error("SUBMIT RESPONSE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};


export const getFormResponses = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    if (req.user.role !== "admin") {
      const isAssignedToUser = form.assignedTo && form.assignedTo.toString() === req.user._id.toString();
      const isCreator = form.createdBy && form.createdBy.toString() === req.user._id.toString();
      if (!isAssignedToUser && !isCreator) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    // Build query filter
    const filter = { form: form._id };

    // Add batch filtering if provided
    const { batches } = req.query;
    if (batches) {
      const batchArray = batches.split(',').map(b => b.trim());
      filter.batch = { $in: batchArray };
    }

    const responses = await Response.find(filter)
      .populate('form', 'title questions')
      .sort({ createdAt: -1 });

    // Get unique batches for filter dropdown
    const uniqueBatches = await Response.distinct('batch', { form: form._id });

    res.json({ data: responses, batches: uniqueBatches });
  } catch (error) {
    next(error);
  }
};
