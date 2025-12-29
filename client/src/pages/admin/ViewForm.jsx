import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../config/api';

const ViewForm = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await api.get(`/forms/${id}`);
        setFormData(res.data.data);
      } catch (error) {
        console.error("Error fetching form", error);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [id]);

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
          <p className="text-base text-gray-600 mb-4">The form you are looking for does not exist.</p>
          <Link to="/admin/dashboard" className="text-blue-700 hover:text-blue-900 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            to="/admin/dashboard"
            className="text-blue-700 hover:text-blue-900 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Form details card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {formData.title}
          </h1>
          {formData.description && (
            <p className="text-base text-gray-600">
              {formData.description}
            </p>
          )}
        </div>

        {/* Questions section */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Questions ({formData.questions.length})
          </h2>

          {formData.questions.length === 0 ? (
            <p className="text-gray-600">No questions in this form.</p>
          ) : (
            <div className="space-y-6">
              {formData.questions.map((question, index) => (
                <div
                  key={question._id}
                  className="border border-gray-200 rounded-lg p-5 bg-gray-50"
                >
                  {/* Question header */}
                  <div className="mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Question {index + 1}
                      {question.required && (
                        <span className="text-red-600 ml-1">*</span>
                      )}
                    </span>
                  </div>

                  {/* Question text */}
                  <p className="text-base font-medium text-gray-900 mb-3">
                    {question.questionText}
                  </p>

                  {/* Question type */}
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      {question.type.charAt(0).toUpperCase() + question.type.slice(1)}
                    </span>
                  </div>

                  {/* Options (if applicable) */}
                  {question.options && question.options.length > 1 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {question.options.map((option, optIndex) => (
                          <li key={optIndex} className="text-sm text-gray-600">
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewForm;
