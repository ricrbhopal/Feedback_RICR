import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../config/api.jsx";
import toast from "react-hot-toast";

const EditForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [loading, setLoading] = useState(true);
  const [allowedBatches, setAllowedBatches] = useState([]);
  const [batchInput, setBatchInput] = useState("");

  useEffect(() => {
    fetchTeachers();
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      const res = await api.get(`/forms/${id}`);
      const form = res.data.data;
      setFormTitle(form.title);
      setFormDescription(form.description || "");
      setQuestions(form.questions.map(q => ({
        ...q,
        id: q._id || Date.now() + Math.random()
      })));
      setSelectedTeacher(form.assignedTo._id || form.assignedTo);
      setAllowedBatches(form.allowedBatches || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching form", error);
      toast.error("Failed to load form");
      navigate("/admin/dashboard");
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get("/auth/teachers");
      setTeachers(res.data.data);
    } catch (error) {
      console.error("Error fetching teachers", error);
      toast.error("Failed to load teachers");
    }
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      questionText: "",
      type: "short",
      options: [""],
      required: false,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleRemoveQuestion = (questionId) => {
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const handleQuestionChange = (questionId, field, value) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== questionId) return q;

        const updated = { ...q, [field]: value };

        if (field === "type") {
          const needsOptions = ["mcq", "checkbox", "dropdown"].includes(value);
          const hadOptions = ["mcq", "checkbox", "dropdown"].includes(q.type);

          if (needsOptions && !hadOptions) {
            updated.options = ["", ""];
          } else if (!needsOptions && hadOptions) {
            updated.options = [];
          }
        }

        return updated;
      })
    );
  };

  const handleAddOption = (questionId) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ""] } : q
      )
    );
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
          : q
      )
    );
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setQuestions(
      questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt, i) =>
                i === optionIndex ? value : opt
              ),
            }
          : q
      )
    );
  };

  const handleAddBatch = () => {
    if (batchInput.trim() && !allowedBatches.includes(batchInput.trim())) {
      setAllowedBatches([...allowedBatches, batchInput.trim()]);
      setBatchInput("");
    }
  };

  const handleRemoveBatch = (batchToRemove) => {
    setAllowedBatches(allowedBatches.filter((batch) => batch !== batchToRemove));
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

    if (!selectedTeacher) {
      setError("Please select a teacher to assign this form");
      return;
    }

    try {
      const formData = {
        title: formTitle,
        description: formDescription,
        questions: questions.map(q => ({
          questionText: q.questionText,
          type: q.type,
          options: q.options,
          required: q.required
        })),
        assignedTo: selectedTeacher,
        allowedBatches,
      };

      await api.put(`/forms/${id}`, formData);
      toast.success("Form updated successfully!");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error(error.response?.data || error.message);
      toast.error("Error updating form");
    }
  };

  const handleCancel = () => {
    navigate("/admin/dashboard");
  };

  const isFormComplete = () => {
    if (!formTitle || !formTitle.trim()) return false;
    if (!selectedTeacher) return false;
    if (questions.length === 0) return false;
    
    for (let question of questions) {
      if (!question.questionText || !question.questionText.trim()) return false;
      
      if (['mcq', 'checkbox', 'dropdown'].includes(question.type)) {
        if (!question.options || question.options.length < 2) return false;
        
        for (let option of question.options) {
          if (!option || !option.trim()) return false;
        }
      }
    }
    
    return true;
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
            onClick={() => navigate("/admin/dashboard")}
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
                <label
                  htmlFor="formTitle"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Form Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="formTitle"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder="Enter form title"
                />
              </div>

              <div>
                <label
                  htmlFor="assignTeacher"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Assign to Teacher <span className="text-red-600">*</span>
                </label>
                <select
                  id="assignTeacher"
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.fullName} ({teacher.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="formDescription"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Form Description
              </label>
              <textarea
                id="formDescription"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent resize-none"
                placeholder="Optional description"
              />
            </div>

            {/* Allowed Batches */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Batches <span className="text-gray-500">(optional)</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add batch codes that students can select when filling the form. Leave empty to allow any batch.
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
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
                <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
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
                    className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Question {qIndex + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(question.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
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
                              e.target.value
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
                              handleQuestionChange(question.id, "type", e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                          >
                            <option value="short">Short Answer</option>
                            <option value="long">Long Answer</option>
                            <option value="mcq">Multiple Choice</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
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
                                  e.target.checked
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
                                      e.target.value
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
                                    className="px-3 py-2 text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Remove
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
              disabled={!isFormComplete()}
              className={`px-6 py-2 font-medium rounded transition-colors ${
                isFormComplete()
                  ? "bg-blue-700 text-white hover:bg-blue-800"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Update Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditForm;
