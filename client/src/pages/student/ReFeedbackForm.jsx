import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../config/api";

const ReFeedbackForm = () => {
  const { formId, responseId } = useParams();
  const [formData, setFormData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [starReasons, setStarReasons] = useState({});
  const [originalAnswers, setOriginalAnswers] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [batch, setBatch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchReFeedbackData = async () => {
      try {
        const res = await api.get(`/responses/re-feedback/${responseId}`);
        const data = res.data.data;
        setFormData(data.form);
        setStudentName(data.studentName);
        setBatch(data.batch);
        setOriginalAnswers(data.answers);

        // Pre-fill answers from original response
        const prefilled = {};
        data.answers.forEach((ans) => {
          const question = data.form.questions.find(
            (q) => q._id === ans.questionId
          );
          if (question?.type === "star_rating") {
            // Extract numeric rating from object or number
            const rating =
              typeof ans.answer === "object" && ans.answer !== null
                ? ans.answer.rating
                : ans.answer;
            prefilled[ans.questionId] = rating;
            // Pre-fill reason if exists
            if (
              typeof ans.answer === "object" &&
              ans.answer !== null &&
              ans.answer.reason
            ) {
              setStarReasons((prev) => ({
                ...prev,
                [ans.questionId]: ans.answer.reason,
              }));
            }
          } else {
            prefilled[ans.questionId] = ans.answer;
          }
        });
        setAnswers(prefilled);
      } catch (error) {
        console.error("Error fetching re-feedback data", error);
        toast.error(
          error.response?.data?.message ||
            "Failed to load re-feedback form. The link may be invalid."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReFeedbackData();
  }, [responseId]);

  const handleInputChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleCheckboxChange = (questionId, option) => {
    const currentAnswers = answers[questionId] || [];
    const updatedAnswers = currentAnswers.includes(option)
      ? currentAnswers.filter((item) => item !== option)
      : [...currentAnswers, option];

    setAnswers((prev) => ({
      ...prev,
      [questionId]: updatedAnswers,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    // Validate required questions
    for (const question of formData.questions) {
      if (question.required) {
        const answer = answers[question._id];
        if (
          !answer ||
          (Array.isArray(answer) && answer.length === 0) ||
          (typeof answer === "string" && answer.trim() === "") ||
          answer === 0
        ) {
          toast.error(
            `Please answer the required question: "${question.questionText}"`
          );
          setSubmitting(false);
          return;
        }
      }

      // Validate reason for star ratings < 8
      if (question.type === "star_rating") {
        const rating = answers[question._id];
        if (rating && rating > 0 && rating < 8) {
          const reason = starReasons[question._id];
          if (!reason || reason.trim() === "") {
            toast.error(
              `Please provide a reason for giving less than 8 stars on: "${question.questionText}"`
            );
            setSubmitting(false);
            return;
          }
        }
      }
    }

    // Convert answers, include star reasons
    const answersArray = Object.entries(answers).map(
      ([questionId, answer]) => {
        const question = formData.questions.find((q) => q._id === questionId);
        if (
          question?.type === "star_rating" &&
          answer > 0 &&
          answer < 8 &&
          starReasons[questionId]
        ) {
          return {
            questionId,
            answer: { rating: answer, reason: starReasons[questionId] },
          };
        }
        return { questionId, answer };
      }
    );

    try {
      await api.post(`/responses/${formId}/re-feedback/${responseId}`, {
        studentName,
        batch,
        answers: answersArray,
      });

      toast.success("Re-feedback submitted successfully!");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting re-feedback", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to submit re-feedback. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Get the original answer for a question to show comparison
  const getOriginalAnswer = (questionId) => {
    const ans = originalAnswers.find((a) => a.questionId === questionId);
    if (!ans) return null;
    return ans.answer;
  };

  const renderQuestion = (question) => {
    const origAnswer = getOriginalAnswer(question._id);

    const renderOriginalBadge = () => {
      if (origAnswer === null || origAnswer === undefined) return null;

      let displayText;
      if (question.type === "star_rating") {
        const rating =
          typeof origAnswer === "object" && origAnswer !== null
            ? origAnswer.rating
            : origAnswer;
        displayText = `${rating} / ${question.maxStars || 10}`;
      } else if (Array.isArray(origAnswer)) {
        displayText = origAnswer.join(", ");
      } else if (typeof origAnswer === "object" && origAnswer !== null) {
        displayText = JSON.stringify(origAnswer);
      } else {
        displayText = String(origAnswer);
      }

      return (
        <div className="mb-3 p-2 bg-gray-100 border border-gray-200 rounded text-sm">
          <span className="font-medium text-gray-600">Previous answer: </span>
          <span className="text-gray-800">{displayText}</span>
        </div>
      );
    };

    switch (question.type) {
      case "short":
        return (
          <div>
            {renderOriginalBadge()}
            <input
              type="text"
              value={answers[question._id] || ""}
              onChange={(e) => handleInputChange(question._id, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Your answer"
            />
          </div>
        );

      case "paragraph":
        return (
          <div>
            {renderOriginalBadge()}
            <textarea
              value={answers[question._id] || ""}
              onChange={(e) => handleInputChange(question._id, e.target.value)}
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Your answer"
            />
          </div>
        );

      case "mcq":
        return (
          <div>
            {renderOriginalBadge()}
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <label
                  key={`${question._id}-opt-${index}`}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name={`question-${question._id}`}
                    value={option}
                    checked={answers[question._id] === option}
                    onChange={() => handleInputChange(question._id, option)}
                    className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-600"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case "yes_no": {
        const origYesNo = getOriginalAnswer(question._id);
        const isLockedYes = origYesNo === "Yes";
        return (
          <div>
            {renderOriginalBadge()}
            {isLockedYes && (
              <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✅ You already answered "Yes" — this cannot be changed.
              </div>
            )}
            <div className="space-y-2">
              {question.options.map((option, index) => {
                const isDisabled = isLockedYes;
                return (
                  <label
                    key={`${question._id}-opt-${index}`}
                    className={`flex items-center gap-3 ${
                      isDisabled
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${question._id}`}
                      value={option}
                      checked={answers[question._id] === option}
                      onChange={() => {
                        if (!isDisabled) handleInputChange(question._id, option);
                      }}
                      disabled={isDisabled}
                      className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-600"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      }

      case "checkbox":
        return (
          <div>
            {renderOriginalBadge()}
            <div className="space-y-2">
              {question.options.map((option, index) => (
                <label
                  key={`${question._id}-chk-${index}`}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={(answers[question._id] || []).includes(option)}
                    onChange={() => handleCheckboxChange(question._id, option)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-600"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case "dropdown":
        return (
          <div>
            {renderOriginalBadge()}
            <select
              value={answers[question._id] || ""}
              onChange={(e) => handleInputChange(question._id, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Select an option</option>
              {question.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case "star_rating":
        const maxStars = question.maxStars || 10;
        const currentRating = answers[question._id] || 0;
        return (
          <div>
            {renderOriginalBadge()}
            <div className="flex items-center gap-2">
              {[...Array(maxStars)].map((_, index) => {
                const starValue = index + 1;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleInputChange(question._id, starValue)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <svg
                      className={`h-5 w-5 md:w-8 md:h-8 ${
                        starValue <= currentRating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                );
              })}
              {currentRating > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  {currentRating} / {maxStars}
                </span>
              )}
            </div>
            {currentRating > 0 && currentRating < 8 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <label className="block text-sm font-medium text-yellow-800 mb-2">
                  ⚠️ Please provide a reason for giving less than 8 stars{" "}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={starReasons[question._id] || ""}
                  onChange={(e) =>
                    setStarReasons((prev) => ({
                      ...prev,
                      [question._id]: e.target.value,
                    }))
                  }
                  rows="3"
                  className="w-full px-4 py-2 border border-yellow-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none"
                  placeholder="Please explain why you gave this rating..."
                  required
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent mb-4"></div>
          <p className="text-lg text-gray-600">Loading re-feedback form...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Form Not Found
          </h2>
          <p className="text-base text-gray-600">
            The re-feedback link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Re-Feedback Submitted!
          </h2>
          <p className="text-base text-gray-600">
            Thank you, {studentName}. Your updated feedback has been recorded
            successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Re-Feedback Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-orange-900 font-semibold">
                Re-Feedback Form
              </p>
              <p className="text-orange-800 text-sm">
                You are updating your previous feedback. Your previous answers
                are shown for reference. Please review and update as needed.
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Header */}
          <div className="px-6 py-8 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {formData.title}
            </h1>
            {formData.description && (
              <p className="text-base text-gray-600">{formData.description}</p>
            )}
            <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Student:</strong> {studentName} &nbsp;|&nbsp;{" "}
                <strong>Batch:</strong> {batch}
              </p>
            </div>
          </div>

          {/* Questions */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-8">
              {formData.questions.map((question) => (
                <div
                  key={question._id}
                  className="pb-6 border-b border-gray-200 last:border-b-0"
                >
                  <div className="mb-4">
                    <label className="block text-base font-medium text-gray-900">
                      {question.questionText}
                      {question.required && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </label>
                  </div>
                  {renderQuestion(question)}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className={`px-8 py-3 font-medium rounded focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 ${
                  !submitting
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "Submitting..." : "Submit Re-Feedback"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReFeedbackForm;
