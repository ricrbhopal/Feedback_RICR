import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import QRCodeModal from "../../components/QRCodeModal.jsx";
import api from "../../config/api.jsx";
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalResponses: 0,
  });

  const [forms, setForms] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedFormLink, setSelectedFormLink] = useState("");
  const [selectedFormTitle, setSelectedFormTitle] = useState("");
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedFormForApproval, setSelectedFormForApproval] = useState(null);
  const [selectedTeacherForForm, setSelectedTeacherForForm] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [teachers, setTeachers] = useState([]);
  // Local editable copy for inline edit-in-approval
  const [localTitle, setLocalTitle] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [localQuestions, setLocalQuestions] = useState([]);
  const [localAllowedBatches, setLocalAllowedBatches] = useState([]);
  const [localBatchInput, setLocalBatchInput] = useState("");

  const fetchForms = async () => {
    try {
      const res = await api.get("/forms");
      setForms(res.data.data);
    } catch (error) {
      console.error("Error fetching forms", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data.data);
    } catch (error) {
      console.error("Error fetching dashboard stats", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get("/auth/teachers");
      setTeachers(res.data.data);
    } catch (error) {
      console.error("Error fetching teachers", error);
    }
  };

  useEffect(() => {
    fetchForms();
    fetchStats();
    fetchTeachers();
  }, []);

  // Populate local editable copy whenever modal opens for a form
  useEffect(() => {
    if (approvalModalOpen && selectedFormForApproval) {
      setLocalTitle(selectedFormForApproval.title || "");
      setLocalDescription(selectedFormForApproval.description || "");
      setLocalQuestions(
        (selectedFormForApproval.questions || []).map((q) => ({
          ...(q._id ? { _id: q._id } : {}),
          id: q._id || Date.now() + Math.random(),
          questionText: q.questionText || q.question || "",
          type: q.type || "short",
          options: q.options || [],
          maxStars: q.maxStars || 5,
          required: q.required !== undefined ? q.required : true,
        }))
      );
      setLocalAllowedBatches(selectedFormForApproval.allowedBatches || []);
    }
  }, [approvalModalOpen, selectedFormForApproval]);

  // Question handlers for inline edit
  const handleAddQuestion = () => {
    const newQuestion = {
      id: Date.now(),
      questionText: "",
      type: "short",
      options: [""],
      maxStars: 5,
      required: true,
    };
    setLocalQuestions([...localQuestions, newQuestion]);
  };

  const handleRemoveQuestion = (questionId) => {
    setLocalQuestions(localQuestions.filter((q) => q.id !== questionId));
  };

  const handleQuestionChange = (questionId, field, value) => {
    setLocalQuestions(
      localQuestions.map((q) => {
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
            q.type
          );
          if (value === "yes_no") {
            updated.options = ["Yes", "No"];
          } else if (needsOptions && !hadOptions) {
            updated.options = ["", ""];
          } else if (!needsOptions && hadOptions) {
            updated.options = [];
          }
          if (value === "star_rating" && !q.maxStars) updated.maxStars = 5;
        }
        return updated;
      })
    );
  };

  const handleAddOption = (questionId) => {
    setLocalQuestions(
      localQuestions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, ""] } : q
      )
    );
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    setLocalQuestions(
      localQuestions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
          : q
      )
    );
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setLocalQuestions(
      localQuestions.map((q) =>
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
    if (
      localBatchInput.trim() &&
      !localAllowedBatches.includes(localBatchInput.trim())
    ) {
      setLocalAllowedBatches([...localAllowedBatches, localBatchInput.trim()]);
      setLocalBatchInput("");
    }
  };

  const handleRemoveBatch = (batchToRemove) => {
    setLocalAllowedBatches(
      localAllowedBatches.filter((b) => b !== batchToRemove)
    );
  };

  const buildUpdatePayload = () => ({
    title: localTitle,
    description: localDescription,
    questions: localQuestions.map((q) => ({
      questionText: q.questionText,
      type: q.type,
      options: q.options,
      maxStars: q.maxStars,
      required: q.required,
    })),
    allowedBatches: localAllowedBatches,
    assignedTo: selectedTeacherForForm || undefined,
  });

  const handleSaveChanges = async () => {
    try {
      const payload = buildUpdatePayload();
      await api.put(`/forms/${selectedFormForApproval._id}`, payload);
      toast.success("Form updated successfully");
      fetchForms();
    } catch (error) {
      console.error("Error saving changes", error);
      toast.error("Error saving changes");
    }
  };

  const handleApproveForm = async () => {
    try {
      // First, save any inline edits
      const payload = buildUpdatePayload();
      await api.put(`/forms/${selectedFormForApproval._id}`, payload);
      // Then approve
      const approvePayload = {};
      if (selectedTeacherForForm)
        approvePayload.assignedTo = selectedTeacherForForm;

      await api.patch(
        `/forms/${selectedFormForApproval._id}/approve`,
        approvePayload
      );
      toast.success("Form approved successfully!");
      setApprovalModalOpen(false);
      setSelectedFormForApproval(null);
      setSelectedTeacherForForm("");
      fetchForms();
    } catch (error) {
      console.error("Error approving form", error);
      toast.error("Error approving form");
    }
  };

  const handleDeleteForm = async (formId) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <span className="font-medium">
            Are you sure you want to delete this form?
          </span>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await api.delete(`/forms/${formId}`);
                  toast.success("Form deleted successfully");
                  fetchForms();
                  fetchStats();
                } catch (error) {
                  console.error("Error deleting form", error);
                  toast.error("Error deleting form");
                }
              }}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
      }
    );
  };

  const handleCopyLink = (formId) => {
    const link = `${import.meta.env.VITE_FRONTEND_URL}/form/${formId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.success("Form link copied to clipboard!");
      })
      .catch((error) => {
        console.error("Failed to copy link", error);
        toast.error("Failed to copy link");
      });
  };

  const handleToggleStatus = async (formId) => {
    try {
      const res = await api.patch(`/forms/${formId}/toggle-status`);
      toast.success(res.data.message);
      fetchForms();
      fetchStats();
    } catch (error) {
      console.error("Error toggling form status", error);
      toast.error("Error updating form status");
    }
  };

  const handleRejectForm = async () => {
    try {
      await api.patch(`/forms/${selectedFormForApproval._id}/reject`, {
        reason: rejectionReason || "Rejected by admin",
      });
      toast.success("Form rejected successfully!");
      setApprovalModalOpen(false);
      setSelectedFormForApproval(null);
      setRejectionReason("");
      fetchForms();
    } catch (error) {
      console.error("Error rejecting form", error);
      toast.error("Error rejecting form");
    }
  };

  const handleShowQR = (formId, formTitle) => {
    const link = `${import.meta.env.VITE_FRONTEND_URL}/form/${formId}`;
    setSelectedFormLink(link);
    setSelectedFormTitle(formTitle);
    setQrModalOpen(true);
  };

  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending Review
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const pendingForms = forms.filter(
    (form) => form.approvalStatus === "pending"
  );
  const approvedForms = forms.filter(
    (form) => form.approvalStatus === "approved"
  );
  const rejectedForms = forms.filter(
    (form) => form.approvalStatus === "rejected"
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome, {user?.fullName || "Admin"}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total Forms
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalForms}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Active Forms
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats.activeForms}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Pending Approval
            </h3>
            <p className="text-3xl font-bold text-yellow-600">
              {pendingForms.length}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Total Responses
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalResponses}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => navigate("/admin/create-form")}
            className="px-6 py-3 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 text-center"
          >
            Create New Form
          </button>
          <button
            onClick={() => navigate("/admin/manage-teachers")}
            className="px-6 py-3 bg-green-700 text-white font-medium rounded hover:bg-green-800 text-center"
          >
            Manage Teachers
          </button>
        </div>

        {/* Pending Approval Section */}
        {pendingForms.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
              <h2 className="text-xl font-semibold text-gray-900">
                ⏳ Forms Pending Approval ({pendingForms.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Form Title
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Created Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingForms.map((form) => (
                    <tr key={form._id} className="hover:bg-yellow-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {form.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {selectedFormForApproval &&
                        selectedFormForApproval._id === form._id
                          ? form.createdBy?.fullName ||
                            form.createdBy ||
                            "Teacher"
                          : form.createdBy?.fullName ||
                            form.createdBy ||
                            "Teacher"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(form.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              setSelectedFormForApproval(form);
                              setSelectedTeacherForForm(
                                form.assignedTo || form.createdBy || ""
                              );
                              setApprovalModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                          >
                            Review & Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFormForApproval(form);
                              setSelectedTeacherForForm(
                                form.assignedTo || form.createdBy || ""
                              );
                              setApprovalModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Forms table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">All Forms</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Form Title
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Approval
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {forms.map((form) => (
                  <tr key={form._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {form.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(form.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          form.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getApprovalStatusBadge(form.approvalStatus)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2 flex-wrap items-center">
                        <Link
                          to={`/admin/forms/${form._id}`}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/edit-form/${form._id}`}
                          className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-medium rounded hover:bg-yellow-700 transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          to={`/admin/responses/${form._id}`}
                          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                        >
                          Responses
                        </Link>
                        <button
                          onClick={() => handleCopyLink(form._id)}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition-colors"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleShowQR(form._id, form.title)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors"
                        >
                          QR Code
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form._id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>

                        {/* Toggle Switch with Label */}
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
                          <span className="text-xs text-gray-600 font-medium">
                            Status:
                          </span>
                          <button
                            onClick={() => handleToggleStatus(form._id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              form.isActive
                                ? "bg-green-600 focus:ring-green-500"
                                : "bg-gray-300 focus:ring-gray-400"
                            }`}
                            title={
                              form.isActive
                                ? "Active - Click to deactivate"
                                : "Inactive - Click to activate"
                            }
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                form.isActive
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModalOpen && selectedFormForApproval && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-8xl h-[90vh] w-full overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Review Form: {selectedFormForApproval.title}
            </h3>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                What would you like to do with this form?
              </p>
            </div>

            {/* Inline Edit + Approve */}
            <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-white">
              <h4 className="font-semibold text-blue-900 mb-4">
                Edit Form (Inline)
              </h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Batches
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={localBatchInput}
                    onChange={(e) => setLocalBatchInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBatch();
                      }
                    }}
                    placeholder="e.g., 2024-A"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddBatch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {localAllowedBatches.map((b) => (
                    <span
                      key={b}
                      className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      {b}
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(b)}
                        className="text-blue-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Questions
                </label>
                <div className="space-y-4">
                  {localQuestions.length === 0 && (
                    <p className="text-sm text-gray-500">No questions yet.</p>
                  )}
                  {localQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">
                          Question {idx + 1}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={q.questionText}
                        onChange={(e) =>
                          handleQuestionChange(
                            q.id,
                            "questionText",
                            e.target.value
                          )
                        }
                        placeholder="Question text"
                        className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                      />
                      <select
                        value={q.type}
                        onChange={(e) =>
                          handleQuestionChange(q.id, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                      >
                        <option value="short">Short Answer</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="mcq">Multiple Choice (Single)</option>
                        <option value="checkbox">
                          Multiple Choice (Multiple)
                        </option>
                        <option value="dropdown">Dropdown</option>
                        <option value="star_rating">Star Rating</option>
                        <option value="yes_no">Yes/No</option>
                      </select>

                      {["mcq", "checkbox", "dropdown"].includes(q.type) && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">
                            Options
                          </div>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex gap-2">
                              <input
                                value={opt}
                                onChange={(e) =>
                                  handleOptionChange(q.id, oi, e.target.value)
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(q.id, oi)}
                                className="px-2 py-1 bg-red-500 text-white rounded"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="px-3 py-1 bg-gray-500 text-white rounded"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <div>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="px-4 py-2 bg-green-600 text-white rounded"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded"
                >
                  Save Changes
                </button>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Teacher (optional)
                  </label>
                  <select
                    value={selectedTeacherForForm}
                    onChange={(e) => setSelectedTeacherForForm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <button
                  onClick={handleApproveForm}
                  className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded hover:bg-green-700"
                >
                  Approve & Assign
                </button>
              </div>
            </div>

            {/* Reject Tab */}
            <div className="mb-6 p-4 border-2 border-red-200 rounded-lg bg-red-50">
              <h4 className="font-semibold text-red-900 mb-4">Reject Form</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows="3"
                />
              </div>
              <button
                onClick={handleRejectForm}
                className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded hover:bg-red-700"
              >
                Reject Form
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setApprovalModalOpen(false);
                setSelectedFormForApproval(null);
                setSelectedTeacherForForm("");
                setRejectionReason("");
              }}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 font-medium rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        formLink={selectedFormLink}
        formTitle={selectedFormTitle}
      />
    </div>
  );
};

export default Dashboard;
