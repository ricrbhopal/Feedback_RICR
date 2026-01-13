import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api.jsx";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const TeacherCreateForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [allowedBatches, setAllowedBatches] = useState([]);
  const [batchInput, setBatchInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    // Load saved form data from localStorage
    const savedFormData = localStorage.getItem('teacherCreateFormDraft');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormTitle(parsedData.formTitle || '');
        setFormDescription(parsedData.formDescription || '');
        setQuestions(parsedData.questions || []);
        setAllowedBatches(parsedData.allowedBatches || []);
        toast.success('Draft form loaded from previous session');
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, []);

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    if (formTitle || formDescription || questions.length > 0 || allowedBatches.length > 0) {
      const formData = {
        formTitle,
        formDescription,
        questions,
        allowedBatches,
        assignedTo: user?._id || null,
      };
      localStorage.setItem('teacherCreateFormDraft', JSON.stringify(formData));
    }
  }, [formTitle, formDescription, questions, allowedBatches]);

  const handleAddQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      questionText: "",
      type: "short",
      options: [""],
      maxStars: 5,
      required: true,
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleDuplicateQuestion = (questionId) => {
    const questionToDuplicate = questions.find((q) => q.id === questionId);
    if (questionToDuplicate) {
      const duplicatedQuestion = {
        ...questionToDuplicate,
        id: Date.now(),
      };
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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = (e) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
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
          const needsOptions = ["mcq", "checkbox", "dropdown", "yes_no"].includes(value);
          const hadOptions = ["mcq", "checkbox", "dropdown", "yes_no"].includes(q.type);

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
        questions,
        allowedBatches,
        assignedTo: user?._id,
      };

      console.log('Submitting teacher formData', formData);
      await api.post("/forms", formData);

      localStorage.removeItem('teacherCreateFormDraft');

      toast.success("Form submitted for approval!");
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error(error.response?.data || error.message);
      const msg = error?.response?.data?.message || error?.message || 'Error creating form';
      toast.error(msg);
    }
  };

  const handleCancel = () => {
    const savedFormData = localStorage.getItem('teacherCreateFormDraft');
    
    if (savedFormData) {
      setShowCancelModal(true);
    } else {
      navigate("/teacher/dashboard");
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('teacherCreateFormDraft');
    toast.success("Draft discarded");
    setShowCancelModal(false);
    navigate("/teacher/dashboard");
  };

  const handleKeepDraft = () => {
    toast.success("Draft saved for later");
    setShowCancelModal(false);
    navigate("/teacher/dashboard");
  };

  const isFormComplete = () => {
    if (!formTitle || !formTitle.trim()) return false;
    if (questions.length === 0) return false;
    
    for (let question of questions) {
      if (!question.questionText || !question.questionText.trim()) return false;
      
      if (['mcq', 'checkbox', 'dropdown'].includes(question.type)) {
        if (!question.options || question.options.length < 2) return false;
        
        for (let option of question.options) {
          if (!option || !option.trim()) return false;
        }
      }
      
      if (question.type === 'yes_no') {
        if (!question.options || question.options.length !== 2) return false;
      }
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Custom Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Unsaved Progress
            </h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Would you like to save your draft to continue later?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDiscardDraft}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
              >
                No, Don't Save
              </button>
              <button
                onClick={handleKeepDraft}
                className="px-6 py-2 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2 transition-colors"
              >
                Yes, Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <button
            onClick={handleCancel}
            className="text-blue-700 hover:text-blue-900 font-medium mb-4"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Feedback Form</h1>
          <p className="text-gray-600">
            Create a form to collect feedback. It will be submitted for admin approval before becoming public.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Form Title and Description */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Form Details</h2>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Form Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Class Feedback Form"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Add a description (optional)"
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
            </div>

            {/* Assigned To (prefilled with teacher name, not editable) */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Assigned To</label>
              <input
                type="text"
                value={user?.fullName || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
            </div>

            {/* Allowed Batches */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Allowed Batches
              </label>
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
                  placeholder="e.g., 2024-A"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddBatch}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedBatches.map((batch) => (
                  <span
                    key={batch}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    {batch}
                    <button
                      type="button"
                      onClick={() => handleRemoveBatch(batch)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Questions</h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                + Add Question
              </button>
            </div>

            {questions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No questions yet. Add one to get started!</p>
            ) : (
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`p-6 border-2 rounded-lg cursor-move transition ${
                      draggedIndex === index
                        ? "bg-blue-50 border-blue-300 opacity-50"
                        : dragOverIndex === index
                        ? "bg-blue-100 border-blue-400"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Question Number and Controls */}
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-semibold text-gray-700">
                        Question {index + 1}
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(question.id)}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(question.id)}
                          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4">
                      <input
                        type="text"
                        value={question.questionText}
                        onChange={(e) =>
                          handleQuestionChange(question.id, "questionText", e.target.value)
                        }
                        placeholder="Enter question text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Question Type */}
                    <div className="mb-4">
                      <select
                        value={question.type}
                        onChange={(e) =>
                          handleQuestionChange(question.id, "type", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="short">Short Answer</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="mcq">Multiple Choice (Single)</option>
                        <option value="checkbox">Multiple Choice (Multiple)</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="star_rating">Star Rating</option>
                        <option value="yes_no">Yes/No</option>
                      </select>
                    </div>

                    {/* Options for MCQ/Checkbox/Dropdown */}
                    {["mcq", "checkbox", "dropdown"].includes(question.type) && (
                      <div className="mb-4 space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">Options</label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) =>
                                handleOptionChange(question.id, optionIndex, e.target.value)
                              }
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(question.id, optionIndex)}
                              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddOption(question.id)}
                          className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          + Add Option
                        </button>
                      </div>
                    )}

                    {/* Star Rating Config */}
                    {question.type === "star_rating" && (
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Max Stars
                        </label>
                        <select
                          value={question.maxStars || 5}
                          onChange={(e) =>
                            handleQuestionChange(
                              question.id,
                              "maxStars",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="3">3 Stars</option>
                          <option value="4">4 Stars</option>
                          <option value="5">5 Stars</option>
                          <option value="10">10 Stars</option>
                        </select>
                      </div>
                    )}

                    {/* Required Checkbox */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`required-${question.id}`}
                        checked={question.required}
                        onChange={(e) =>
                          handleQuestionChange(question.id, "required", e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor={`required-${question.id}`} className="ml-2 text-gray-700">
                        Make this question required
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={!isFormComplete()}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition ${
                  isFormComplete()
                    ? "bg-green-600 hover:bg-green-700 cursor-pointer"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                Submit for Approval
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherCreateForm;
