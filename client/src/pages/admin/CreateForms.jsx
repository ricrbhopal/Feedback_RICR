import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/api.jsx";
import toast from "react-hot-toast";

const CreateForm = () => {
  const navigate = useNavigate();
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [allowedBatches, setAllowedBatches] = useState([]);
  const [batchInput, setBatchInput] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    fetchTeachers();
    
    // Load saved form data from localStorage
    const savedFormData = localStorage.getItem('createFormDraft');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormTitle(parsedData.formTitle || '');
        setFormDescription(parsedData.formDescription || '');
        setQuestions(parsedData.questions || []);
        setSelectedTeacher(parsedData.selectedTeacher || '');
        setAllowedBatches(parsedData.allowedBatches || []);
        toast.success('Draft form loaded from previous session');
      } catch (error) {
        console.error('Error loading saved form data:', error);
      }
    }
  }, []);

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    if (formTitle || formDescription || questions.length > 0 || selectedTeacher || allowedBatches.length > 0) {
      const formData = {
        formTitle,
        formDescription,
        questions,
        selectedTeacher,
        allowedBatches
      };
      localStorage.setItem('createFormDraft', JSON.stringify(formData));
    }
  }, [formTitle, formDescription, questions, selectedTeacher, allowedBatches]);

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
        id: Date.now(), // Generate new unique ID
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
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
    // Prevent default link behavior
    e.dataTransfer.setData('text/plain', '');
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex === dropIndex || isNaN(dragIndex)) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    
    const newQuestions = [...questions];
    const draggedQuestion = newQuestions[dragIndex];
    
    // Remove from old position
    newQuestions.splice(dragIndex, 1);
    // Insert at new position
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

        // Handle type change: initialize or clear options
        if (field === "type") {
          const needsOptions = ["mcq", "checkbox", "dropdown", "yes_no"].includes(value);
          const hadOptions = ["mcq", "checkbox", "dropdown", "yes_no"].includes(q.type);

          if (value === "yes_no") {
            // Yes/No type has predefined options
            updated.options = ["Yes", "No"];
          } else if (needsOptions && !hadOptions) {
            // Switching to a type that needs options
            updated.options = ["", ""];
          } else if (!needsOptions && hadOptions) {
            // Switching to a type that doesn't need options
            updated.options = [];
          }

          // Initialize maxStars for star rating type
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
    // 1️⃣ Form title validation
    if (!title || !title.trim()) {
      return "Form title is required";
    }

    // 2️⃣ At least one question
    if (!questions || questions.length === 0) {
      return "At least one question is required";
    }

    // 3️⃣ Validate each question
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Question text validation
      if (!question.questionText || !question.questionText.trim()) {
        return `Question ${i + 1} must have text`;
      }

      // Option-based question validation
      if (
        question.type === "mcq" ||
        question.type === "checkbox" ||
        question.type === "dropdown"
      ) {
        // Minimum 2 options
        if (!question.options || question.options.length < 2) {
          return `Question ${i + 1} must have at least 2 options`;
        }

        // No empty options
        for (let j = 0; j < question.options.length; j++) {
          if (!question.options[j] || !question.options[j].trim()) {
            return `Question ${i + 1} has an empty option`;
          }
        }
      }

      // Yes/No question validation (should have exactly 2 options: Yes and No)
      if (question.type === "yes_no") {
        if (!question.options || question.options.length !== 2) {
          return `Question ${i + 1} must have exactly 2 options (Yes/No)`;
        }
      }
    }

    // ✅ All validations passed
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
        questions,
        assignedTo: selectedTeacher,
        allowedBatches,
      };

      await api.post("/forms", formData);
      
      // Clear localStorage after successful submission
      localStorage.removeItem('createFormDraft');
      
      toast.success("Form created successfully!");
      navigate("/admin/dashboard");
    } catch (error) {
      console.error(error.response?.data || error.message);
      toast.error("Error creating form");
    }
  };

  const handleCancel = () => {
    navigate("/admin/dashboard");
  };

  // Check if form is complete and valid
  const isFormComplete = () => {
    // Check if title is present
    if (!formTitle || !formTitle.trim()) return false;
    
    // Check if teacher is selected
    if (!selectedTeacher) return false;
    
    // Check if at least one question exists
    if (questions.length === 0) return false;
    
    // Validate all questions
    for (let question of questions) {
      // Check if question text exists
      if (!question.questionText || !question.questionText.trim()) return false;
      
      // Check options for MCQ/Checkbox/Dropdown
      if (['mcq', 'checkbox', 'dropdown'].includes(question.type)) {
        if (!question.options || question.options.length < 2) return false;
        
        // Check for empty options
        for (let option of question.options) {
          if (!option || !option.trim()) return false;
        }
      }
      
      // Check Yes/No type
      if (question.type === 'yes_no') {
        if (!question.options || question.options.length !== 2) return false;
      }
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="text-blue-700 hover:text-blue-900 font-medium mb-4"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create New Form</h1>
          <p className="text-gray-600 mt-2">
            Design your feedback form by adding questions
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="px-6 py-6 space-y-6">
            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Title */}
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

            {/* Assign to Teacher */}
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
            
            {/* Form Description */}
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
                placeholder="Enter form description (optional)"
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

            

            {/* Questions Section */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Questions
              </h3>

              {questions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-600">
                    No questions added yet
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div
                      key={question.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={`border rounded p-4 transition-all duration-200 ${
                        draggedIndex === index
                          ? 'opacity-40 scale-95 border-blue-400 bg-blue-50'
                          : dragOverIndex === index && draggedIndex !== null
                          ? 'border-blue-500 border-2 bg-blue-50 shadow-lg scale-105'
                          : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                      } cursor-move select-none`}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      {/* Question header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg text-gray-400 hover:text-gray-600 transition-colors">⋮⋮</span>
                          <span className="text-sm font-medium text-gray-700">
                            Question {index + 1}
                          </span>
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

                      {/* Question text */}
                      <div className="mb-3">
                        <input
                          type="text"
                          value={question.questionText || ""}
                          onChange={(e) =>
                            handleQuestionChange(
                              question.id,
                              "questionText",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                          placeholder="Enter question text"
                          draggable={false}
                        />
                      </div>

                      {/* Question type and required */}
                      <div className="flex gap-4 mb-3">
                        <div className="flex-1">
                          <select
                            value={question.type}
                            onChange={(e) =>
                              handleQuestionChange(
                                question.id,
                                "type",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                          >
                            <option value="short">Short Answer</option>
                            <option value="paragraph">Paragraph</option>
                            <option value="mcq">MCQ</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
                            <option value="yes_no">Yes/No</option>
                            <option value="star_rating">Star Rating</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2">
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
                            className="w-4 h-4 text-blue-700 border-gray-300 rounded focus:ring-blue-700"
                          />
                          <span className="text-sm text-gray-700">
                            Required
                          </span>
                        </label>
                      </div>

                      {/* Options for MCQ/Checkbox/Dropdown */}
                      {(question.type === "mcq" ||
                        question.type === "checkbox" ||
                        question.type === "dropdown") && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options
                          </label>
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  handleOptionChange(
                                    question.id,
                                    optIndex,
                                    e.target.value
                                  )
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              {question.options.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveOption(question.id, optIndex)
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
                            className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}

                      {/* Yes/No type display (read-only) */}
                      {question.type === "yes_no" && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options (Predefined)
                          </label>
                          <div className="bg-gray-100 p-3 rounded border border-gray-200">
                            <div className="flex gap-4">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-blue-600"></span>
                                <span className="text-sm text-gray-700">Yes</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-blue-600"></span>
                                <span className="text-sm text-gray-700">No</span>
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
                            value={question.maxStars || 5}
                            onChange={(e) =>
                              handleQuestionChange(
                                question.id,
                                "maxStars",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
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
                  ))}
                </div>
              )}

              {/* Add Question button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-700 rounded hover:bg-blue-50"
              >
                + Add Question
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormComplete()}
              className={`px-6 py-2 text-sm font-medium text-white rounded ${
                isFormComplete()
                  ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Create Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateForm;
