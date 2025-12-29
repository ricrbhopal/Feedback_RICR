import Form from "../models/formModel.js";
import Response from "../models/responseModel.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    let formFilter = {};
    
    // If user is a teacher, only show forms assigned to them
    if (req.user.role === "teacher") {
      formFilter.assignedTo = req.user._id;
    }
    
    const totalForms = await Form.countDocuments(formFilter);

    const activeForms = await Form.countDocuments({
      ...formFilter,
      isActive: true
    });

    // Get form IDs for the teacher to count only their responses
    let responseFilter = {};
    if (req.user.role === "teacher") {
      const teacherForms = await Form.find(formFilter).select('_id');
      const formIds = teacherForms.map(f => f._id);
      responseFilter.form = { $in: formIds };
    }

    const totalResponses = await Response.countDocuments(responseFilter);

    res.status(200).json({
      success: true,
      data: {
        totalForms,
        activeForms,
        totalResponses
      }
    });
  } catch (error) {
    next(error);
  }
};
