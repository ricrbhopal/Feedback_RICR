import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from 'react-hot-toast';
import QRCodeModal from "../../components/QRCodeModal.jsx";
import api from "../../config/api.jsx";
import { useAuth } from "../../context/AuthContext";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalResponses: 0,
  });

  const [allForms, setAllForms] = useState([]);
  const [assignedForms, setAssignedForms] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedFormLink, setSelectedFormLink] = useState("");
  const [selectedFormTitle, setSelectedFormTitle] = useState("");

  const fetchForms = async () => {
    try {
      const res = await api.get("/forms");
      setAllForms(res.data.data);
    } catch (error) {
      console.error("Error fetching forms", error);
    }
  };

  const fetchAssignedForms = async () => {
    try {
      const res = await api.get('/forms?assigned=true');
      setAssignedForms(res.data.data || []);
    } catch (error) {
      console.error('Error fetching assigned forms', error);
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

  useEffect(() => {
    fetchForms();
    fetchStats();
    fetchAssignedForms();
  }, []);

  // Separate forms into created by teacher and assigned to teacher
  const createdForms = allForms.filter(form => form.createdBy === user?._id);

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
      fetchAssignedForms();
    } catch (error) {
      console.error("Error toggling form status", error);
      toast.error("Error updating form status");
    }
  };

  const handleDeleteForm = async (formId) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-medium">Are you sure you want to delete this form?</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/forms/${formId}`);
                toast.success('Form deleted successfully');
                            fetchForms();
                            fetchStats();
                            fetchAssignedForms();
              } catch (error) {
                console.error("Error deleting form", error);
                toast.error('Error deleting form');
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
    ), {
      duration: 5000,
    });
  };

  const handleShowQR = (formId, formTitle) => {
    const link = `${import.meta.env.VITE_FRONTEND_URL}/forms/${formId}`;
    setSelectedFormLink(link);
    setSelectedFormTitle(formTitle);
    setQrModalOpen(true);
  };

  const getApprovalStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case "pending":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case "rejected":
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Teacher Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Welcome, {user?.fullName || "Teacher"}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              My Forms
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
              Total Responses
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalResponses}
            </p>
          </div>
        </div>

        {/* Create Form Button */}
        <div className="mb-8">
          <Link
            to="/teacher/create-form"
            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            + Create New Form
          </Link>
        </div>

        {/* Forms Created by Teacher */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Forms I Created
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
                {createdForms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No forms created yet.
                    </td>
                  </tr>
                ) : (
                  createdForms.map((form) => (
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
                        {form.approvalStatus === "rejected" && form.rejectionReason && (
                          <div className="text-xs text-red-600 mt-1">
                            Reason: {form.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2 flex-wrap items-center">
                          {form.approvalStatus === "pending" && (
                            <>
                              <Link
                                to={`/teacher/forms/${form._id}/edit`}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </Link>
                              <button
                                onClick={() => handleDeleteForm(form._id)}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {form.approvalStatus === "approved" && (
                            <>
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
                              <Link
                                to={`/teacher/responses/${form._id}`}
                                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                              >
                                Responses
                              </Link>
                              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
                                <span className="text-xs text-gray-600 font-medium">Status:</span>
                                <button
                                  onClick={() => handleToggleStatus(form._id)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    form.isActive
                                      ? "bg-green-600 focus:ring-green-500"
                                      : "bg-gray-300 focus:ring-gray-400"
                                  }`}
                                  title={form.isActive ? "Active - Click to deactivate" : "Inactive - Click to activate"}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      form.isActive ? "translate-x-6" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assigned forms table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Forms Assigned to Me
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
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignedForms.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No forms assigned to you yet.
                    </td>
                  </tr>
                ) : (
                  assignedForms.map((form) => (
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
                        <div className="flex gap-2 flex-wrap items-center">
                          <Link
                            to={`/teacher/forms/${form._id}`}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          >
                            View
                          </Link>
                          <Link
                            to={`/teacher/responses/${form._id}`}
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
                          
                          {/* Toggle Switch with Label */}
                          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300">
                            <span className="text-xs text-gray-600 font-medium">Status:</span>
                            <button
                              onClick={() => handleToggleStatus(form._id)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                form.isActive
                                  ? "bg-green-600 focus:ring-green-500"
                                  : "bg-gray-300 focus:ring-gray-400"
                              }`}
                              title={form.isActive ? "Active - Click to deactivate" : "Inactive - Click to activate"}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  form.isActive ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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

export default TeacherDashboard;
