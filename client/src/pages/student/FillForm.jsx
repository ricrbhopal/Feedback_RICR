import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../config/api';

const FillForm = () => {
  const [answers, setAnswers] = useState({});
  const [studentName, setStudentName] = useState('');
  const [batch, setBatch] = useState('');
  const { formId } = useParams();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await api.get(`/forms/${formId}`);
        setFormData(res.data.data);
      } catch (error) {
        console.error("Error fetching form", error);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  const handleInputChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleCheckboxChange = (questionId, option) => {
    const currentAnswers = answers[questionId] || [];
    const updatedAnswers = currentAnswers.includes(option)
      ? currentAnswers.filter(item => item !== option)
      : [...currentAnswers, option];
    
    setAnswers(prev => ({
      ...prev,
      [questionId]: updatedAnswers
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required questions
    for (const question of formData.questions) {
      if (question.required) {
        const answer = answers[question._id];
        
        // Check if answer is empty
        if (!answer || 
            (Array.isArray(answer) && answer.length === 0) || 
            (typeof answer === 'string' && answer.trim() === '') ||
            answer === 0) {
          toast.error(`Please answer the required question: "${question.questionText}"`);
          return;
        }
      }
    }
    
    // Re-check form status before submission
    try {
      const statusCheck = await api.get(`/forms/${formId}`);
      if (!statusCheck.data.data.isActive) {
        toast.error('This form has been deactivated and is no longer accepting responses.');
        // Reload to show deactivated message
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
    } catch (error) {
      console.error('Error checking form status', error);
      toast.error('Failed to verify form status. Please try again.');
      return;
    }
    
    // Convert answers object to array format
    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer
    }));

    try {
      await api.post(`/responses/${formId}`, {
        studentName,
        batch,
        answers: answersArray
      });
      
      toast.success('Form submitted successfully!');
      
      // Clear form
      setStudentName('');
      setBatch('');
      setAnswers({});
    } catch (error) {
      console.error('Error submitting form', error);
      toast.error('Failed to submit form. Please try again.');
    }
  };

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'short':
        return (
          <input
            type="text"
            value={answers[question._id] || ''}
            onChange={(e) => handleInputChange(question._id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
            placeholder="Your answer"
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={answers[question._id] || ''}
            onChange={(e) => handleInputChange(question._id, e.target.value)}
            rows="4"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent resize-none"
            placeholder="Your answer"
          />
        );

      case 'mcq':
        return (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question._id}`}
                  value={option}
                  checked={answers[question._id] === option}
                  onChange={(e) => handleInputChange(question._id, e.target.value)}
                  className="w-4 h-4 text-blue-700 border-gray-300 focus:ring-blue-700"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  value={option}
                  checked={(answers[question._id] || []).includes(option)}
                  onChange={() => handleCheckboxChange(question._id, option)}
                  className="w-4 h-4 text-blue-700 border-gray-300 rounded focus:ring-blue-700"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={answers[question._id] || ''}
            onChange={(e) => handleInputChange(question._id, e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
          >
            <option value="">Select an option</option>
            {question.options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'star_rating':
        const maxStars = question.maxStars || 5;
        const currentRating = answers[question._id] || 0;
        return (
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
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
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
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h2>
          <p className="text-base text-gray-600">The form you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  // Check if form is inactive
  if (!formData.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Form Deactivated</h2>
          <p className="text-base text-gray-600 mb-2">
            This form is currently not accepting responses.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your teacher or administrator for more information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Form Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Header */}
          <div className="px-6 py-8 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {formData.title}
            </h1>
            {formData.description && (
              <p className="text-base text-gray-600">
                {formData.description}
              </p>
            )}
          </div>

          {/* Questions */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-6 space-y-8">
              {/* Student Name Field */}
              <div className="pb-6 border-b border-gray-200">
                <div className="mb-4">
                  <label className="block text-base font-medium text-gray-900">
                    Student Name
                    <span className="text-red-600 ml-1">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Batch Field */}
              <div className="pb-6 border-b border-gray-200">
                <div className="mb-4">
                  <label className="block text-base font-medium text-gray-900">
                    Batch
                    <span className="text-red-600 ml-1">*</span>
                  </label>
                </div>
                {formData.allowedBatches && formData.allowedBatches.length > 0 ? (
                  <select
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  >
                    <option value="">Select your batch</option>
                    {formData.allowedBatches.map((batchOption, index) => (
                      <option key={index} value={batchOption}>
                        {batchOption}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                    placeholder="e.g., 2024, Batch A, Year 1"
                  />
                )}
              </div>

              {formData.questions.map((question) => (
                <div key={question._id} className="pb-6 border-b border-gray-200 last:border-b-0">
                  {/* Question text */}
                  <div className="mb-4">
                    <label className="block text-base font-medium text-gray-900">
                      {question.questionText}
                      {question.required && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </label>
                  </div>

                  {/* Question input */}
                  {renderQuestion(question)}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-gray-200">
              <button
                type="submit"
                className="px-8 py-3 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FillForm;
