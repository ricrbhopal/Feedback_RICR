import Response from "../models/responseModel.js";
import Form from "../models/formModel.js";

// Helper: extract numeric rating from answer (handles both number and {rating, reason} object)
const extractRating = (answer) => {
  if (typeof answer === 'object' && answer !== null && answer.rating !== undefined) {
    return parseInt(answer.rating);
  }
  return parseInt(answer);
};

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

    // Check if student has already submitted the form today (IST)
    // IST = UTC+5:30, so IST midnight = previous day 18:30 UTC
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const startOfDayIST = new Date(nowIST);
    startOfDayIST.setHours(0, 0, 0, 0);
    // Convert IST start-of-day back to UTC for DB query
    const startUTC = new Date(startOfDayIST.getTime() - (5 * 60 + 30) * 60 * 1000);
    
    const endOfDayIST = new Date(nowIST);
    endOfDayIST.setHours(23, 59, 59, 999);
    const endUTC = new Date(endOfDayIST.getTime() - (5 * 60 + 30) * 60 * 1000);

    const existingResponse = await Response.findOne({
      form: formId,
      studentName: studentName.trim(),
      batch: batch.trim(),
      submittedAt: {
        $gte: startUTC,
        $lte: endUTC
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
    const { batches, page, limit: queryLimit } = req.query;
    if (batches) {
      const batchArray = batches.split(',').map(b => b.trim());
      filter.batch = { $in: batchArray };
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(queryLimit) || 100;
    const skip = (pageNum - 1) * limitNum;

    const [responses, totalCount, uniqueBatches] = await Promise.all([
      Response.find(filter)
        .populate('form', 'title questions')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Response.countDocuments(filter),
      Response.distinct('batch', { form: form._id })
    ]);

    res.json({
      data: responses,
      batches: uniqueBatches,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get original response data for re-feedback form pre-filling
export const getReFeedbackData = async (req, res) => {
  try {
    const { responseId } = req.params;

    const originalResponse = await Response.findById(responseId)
      .populate('form', 'title description questions allowedBatches isActive')
      .lean();

    if (!originalResponse) {
      return res.status(404).json({ message: "Original response not found" });
    }

    if (!originalResponse.form.isActive) {
      return res.status(400).json({ message: "This form is no longer active" });
    }

    res.json({
      data: {
        form: originalResponse.form,
        studentName: originalResponse.studentName,
        batch: originalResponse.batch,
        answers: originalResponse.answers,
        originalResponseId: originalResponse._id
      }
    });
  } catch (error) {
    console.error("GET RE-FEEDBACK DATA ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Submit re-feedback response
export const submitReFeedback = async (req, res) => {
  try {
    const { formId, responseId } = req.params;
    const { studentName, batch, answers } = req.body;

    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Get original response
    const originalResponse = await Response.findById(responseId);
    if (!originalResponse) {
      return res.status(404).json({ message: "Original response not found" });
    }

    // Enforce yes_no constraint: cannot change Yes to No
    const originalAnswerMap = {};
    originalResponse.answers.forEach((a) => {
      originalAnswerMap[a.questionId.toString()] = a.answer;
    });

    for (const ans of answers) {
      const question = form.questions.find(
        (q) => q._id.toString() === ans.questionId
      );
      if (question && question.type === "yes_no") {
        const origAns = originalAnswerMap[ans.questionId];
        if (origAns === "Yes" && ans.answer !== "Yes") {
          return res.status(400).json({
            message: `Cannot change "Yes" answer back to "No" for: "${question.questionText}"`
          });
        }
      }
    }

    // Store previous answers for history, then UPDATE the original response
    originalResponse.previousAnswers = originalResponse.answers;
    originalResponse.answers = answers;
    originalResponse.isReFeedback = true;
    originalResponse.submittedAt = new Date();

    await originalResponse.save();

    res.status(200).json({
      message: "Re-feedback submitted successfully",
      data: originalResponse
    });
  } catch (error) {
    console.error("SUBMIT RE-FEEDBACK ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
