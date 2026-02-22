import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../config/api.jsx";
import toast from "react-hot-toast";

const TeacherEditForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [allowedBatches, setAllowedBatches] = useState([]);
  const [batchInput, setBatchInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const res = await api.get(`/forms/${id}`);
      const form = res.data.data;
      setFormTitle(form.title || "");
      setFormDescription(form.description || "");
      setQuestions(
        form.questions.map((q) => ({
          ...q,
          id: q._id || Date.now() + Math.random(),
        })),
      );
      setAllowedBatches(form.allowedBatches || []);
    } catch (error) {
      console.error("Error fetching form", error);
      toast.error("Failed to load form");
      navigate("/teacher/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      questionText: "",
      type: "yes_no",
      options: ["Yes", "No"],
      maxStars: 10,
      required: true,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleDuplicateQuestion = (questionId) => {
    const questionToDuplicate = questions.find((q) => q.id === questionId);
    if (questionToDuplicate) {
      const duplicatedQuestion = { ...questionToDuplicate, id: Date.now() };
      const questionIndex = questions.findIndex((q) => q.id === questionId);
      const newQuestions = [...questions];
      newQuestions.splice(questionIndex + 1, 0, duplicatedQuestion);
      setQuestions(newQuestions);
    }
  };

  const handleRemoveQuestion = (questionId) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));
    if (dragIndex === dropIndex || isNaN(dragIndex)) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[dragIndex];
    newQuestions.splice(dragIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);
    setQuestions(newQuestions);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleQuestionChange = (questionId, field, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;

        const updated = { ...q, [field]: value };

        if (field === "type") {
          const needsOptions = [
            "mcq",
            "checkbox",
            "dropdown",
            "yes_no",
          ].includes(value);
          const hadOptions = ["mcq", "checkbox", "dropdown", "yes_no"].includes(
            q.type,
          );

          if (value === "yes_no") {
            updated.options = ["Yes", "No"];
          } else if (needsOptions && !hadOptions) {
            updated.options = ["", ""];
          } else if (!needsOptions && hadOptions) {
            updated.options = [];
          }

          if (value === "star_rating" && !q.maxStars) {
            updated.maxStars = 5;
          }
        }

        return updated;
      }),
    );
  };

  const handleAddOption = (questionId) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ""] } : q,
      ),
    );
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
          : q,
      ),
    );
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, i) =>
                i === optionIndex ? value : opt,
              ),
            }
          : q,
      ),
    );
  };

  const handleAddBatch = () => {
    if (batchInput.trim() && !allowedBatches.includes(batchInput.trim())) {
      setAllowedBatches([...allowedBatches, batchInput.trim()]);
      setBatchInput("");
    }
  };

  const handleRemoveBatch = (batchToRemove) => {
    setAllowedBatches(
      allowedBatches.filter((batch) => batch !== batchToRemove),
    );
  };

  const validateForm = (title, questions) => {
    if (!title || !title.trim()) {
      return "Form title is required";
    }

    if (!questions || questions.length === 0) {
      return "At least one question is required";
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      if (!question.questionText || !question.questionText.trim()) {
        return `Question ${i + 1} must have text`;
      }

      if (
        question.type === "mcq" ||
        question.type === "checkbox" ||
        question.type === "dropdown"
      ) {
        if (!question.options || question.options.length < 2) {
          return `Question ${i + 1} must have at least 2 options`;
        }

        for (let j = 0; j < question.options.length; j++) {
          if (!question.options[j] || !question.options[j].trim()) {
            return `Question ${i + 1} has an empty option`;
          }
        }
      }

      if (question.type === "yes_no") {
        if (!question.options || question.options.length !== 2) {
          return `Question ${i + 1} must have exactly 2 options (Yes/No)`;
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm(formTitle, questions);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const formData = {
        title: formTitle,
        description: formDescription,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          options: q.options,
          required: q.required,
        })),
        allowedBatches,
      };

      await api.put(`/forms/${id}`, formData);
      toast.success("Form updated successfully!");
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error(error.response?.data || error.message);
      toast.error("Error updating form");
    }
  };

  const handleCancel = () => {
    navigate("/teacher/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading form...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div>
          <button
            onClick={handleCancel}
            className="text-blue-700 hover:text-blue-900 font-medium mb-4"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Form</h1>
          <p className="text-gray-600 mt-2">
            Update your feedback form questions and settings
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="px-6 py-6 space-y-6">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder="Enter form title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Allowed Batches */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Batches{" "}
                <span className="text-gray-500">(optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add batch codes that students can select when filling the form.
                Leave empty to allow any batch.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBatch();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder="e.g., 2024, Batch A, Year 1"
                />
                <button
                  type="button"
                  onClick={handleAddBatch}
                  className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors font-medium"
                >
                  Add
                </button>
              </div>
              {allowedBatches.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allowedBatches.map((batch, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full"
                    >
                      <span className="text-sm font-medium">{batch}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(batch)}
                        className="text-blue-600 hover:text-blue-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Questions
                </h2>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 transition-colors"
                >
                  + Add Question
                </button>
              </div>

              {questions.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No questions yet. Click "Add Question" to get started.
                </p>
              )}

              <div className="space-y-6">
                {questions.map((question, qIndex) => (
                  <div
                    key={question.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, qIndex)}
                    onDragOver={(e) => handleDragOver(e, qIndex)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, qIndex)}
                    className={`border rounded-lg p-6 transition-all duration-200 ${
                      draggedIndex === qIndex
                        ? "opacity-40 scale-95 border-blue-400 bg-blue-50"
                        : dragOverIndex === qIndex && draggedIndex !== null
                          ? "border-blue-500 border-2 bg-blue-50 shadow-lg scale-105"
                          : "border-gray-200 bg-gray-50 hover:border-blue-300"
                    } cursor-move`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg text-gray-400 hover:text-gray-600 transition-colors">
                          ⋮⋮
                        </span>
                        <h3 className="text-lg font-medium text-gray-900">
                          Question {qIndex + 1}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(question.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          title="Duplicate question"
                        >
                          📋 Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(question.id)}
                          className="text-red-600 hover:text-red-800 text-xl font-bold leading-none"
                          title="Remove question"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={question.questionText}
                          onChange={(e) =>
                            handleQuestionChange(
                              question.id,
                              "questionText",
                              e.target.value,
                            )
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                          placeholder="Enter your question"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Type
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) =>
                              handleQuestionChange(
                                question.id,
                                "type",
                                e.target.value,
                              )
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                          >
                            <option value="short">Short Answer</option>
                            <option value="long">Long Answer</option>
                            <option value="mcq">Multiple Choice</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="yes_no">Yes/No</option>
                            <option value="star_rating">Star Rating</option>
                          </select>
                        </div>

                        <div className="flex items-center pt-6">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.required}
                              onChange={(e) =>
                                handleQuestionChange(
                                  question.id,
                                  "required",
                                  e.target.checked,
                                )
                              }
                              className="w-4 h-4 text-blue-700 border-gray-300 rounded focus:ring-2 focus:ring-blue-700"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Required question
                            </span>
                          </label>
                        </div>
                      </div>

                      {(question.type === "mcq" ||
                        question.type === "checkbox" ||
                        question.type === "dropdown") && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options <span className="text-red-600">*</span>
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) =>
                                    handleOptionChange(
                                      question.id,
                                      oIndex,
                                      e.target.value,
                                    )
                                  }
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                                  placeholder={`Option ${oIndex + 1}`}
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveOption(question.id, oIndex)
                                    }
                                    className="px-3 py-2 text-xl text-red-600 hover:text-red-800 font-bold leading-none"
                                    title="Remove option"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddOption(question.id)}
                              className="text-blue-700 hover:text-blue-900 font-medium text-sm"
                            >
                              + Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Yes/No type display (read-only) */}
                      {question.type === "yes_no" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options (Predefined)
                          </label>
                          <div className="bg-gray-100 p-3 rounded border border-gray-200">
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-blue-600"></span>
                                <span className="text-sm text-gray-700">
                                  Yes
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-blue-600"></span>
                                <span className="text-sm text-gray-700">
                                  No
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Max Stars for Star Rating */}
                      {question.type === "star_rating" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Stars
                          </label>
                          <select
                            value={question.maxStars || 10}
                            onChange={(e) =>
                              handleQuestionChange(
                                question.id,
                                "maxStars",
                                parseInt(e.target.value),
                              )
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                          >
                            {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <option key={num} value={num}>
                                {num} Stars
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 font-medium rounded hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 font-medium rounded transition-colors bg-blue-700 text-white hover:bg-blue-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );t
};

export default TeacherEditForm;
