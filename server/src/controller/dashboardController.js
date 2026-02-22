import Form from "../models/formModel.js";
import Response from "../models/responseModel.js";

export const getDashboardStats = async (req, res, next) => {
  try {
    let formFilter = {};
    
    // If user is a teacher, only show forms assigned to them
    if (req.user.role === "teacher") {
      formFilter.assignedTo = req.user._id;
    }
    
    // Run all count queries in parallel
    const [totalForms, activeForms, totalResponses] = await Promise.all([
      Form.countDocuments(formFilter),
      Form.countDocuments({ ...formFilter, isActive: true }),
      (async () => {
        if (req.user.role === "teacher") {
          const formIds = await Form.find(formFilter).distinct('_id');
          return Response.countDocuments({ form: { $in: formIds } });
        }
        return Response.countDocuments();
      })()
    ]);

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
