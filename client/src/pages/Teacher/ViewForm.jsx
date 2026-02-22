import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../config/api';
import { formatDate } from '../../utils/formatDate';

const ViewForm = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const res = await api.get(`/forms/${id}`);
      setForm(res.data.data);
    } catch (error) {
      console.error("Error fetching form", error);
    } finally {
      setLoading(false);
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

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600">Form not found</p>
          <Link
            to="/teacher/dashboard"
            className="mt-4 inline-block text-blue-700 hover:text-blue-900 font-medium"
          >
            ← Back to Dashboard
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
            to="/teacher/dashboard"
            className="text-blue-700 hover:text-blue-900 font-medium"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Form header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
              {form.description && (
                <p className="text-lg text-gray-600 mb-4">{form.description}</p>
              )}
              <div className="flex gap-4 text-sm text-gray-600">
                <span>Status: <span className={`font-medium ${form.status === 'Active' ? 'text-green-600' : 'text-gray-600'}`}>{form.status}</span></span>
                <span>Created: {formatDate(form.createdAt)}</span>
              </div>
            </div>

            {/* Approval badge */}
            <div className="text-right">
              {form.approvalStatus === 'approved' ? (
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">Approved</span>
              ) : form.approvalStatus === 'pending' ? (
                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">Pending Approval</span>
              ) : (
                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">Rejected</span>
              )}
              {form.rejectionReason && (
                <div className="mt-2 text-xs text-red-600">Reason: {form.rejectionReason}</div>
              )}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Questions</h2>
          <div className="space-y-6">
            {form.questions.map((question, index) => (
              <div key={question._id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <p className="text-lg font-medium text-gray-900 mb-3">
                  {index + 1}. {question.questionText}
                  {question.required && <span className="text-red-600 ml-1">*</span>}
                </p>
                
                {/* Question type badge */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {question.type ? question.type.charAt(0).toUpperCase() + question.type.slice(1) : 'N/A'}
                  </span>
                </div>
                
                {/* Display options for multiple choice or checkbox */}
                {(question.type === 'mcq' || question.type === 'checkbox' || question.type === 'yes_no') && question.options && (
                  <div className="mt-3 ml-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {question.options.map((option, idx) => (
                        <li key={idx} className="text-sm text-gray-600">{option}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewForm;
