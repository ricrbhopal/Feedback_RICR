import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
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

  useEffect(() => {
    fetchForms();
    fetchStats();
  }, []);

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

  const handleCopyLink = (formId) => {
    const link = `http://localhost:5173/form/${formId}`;
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

  const handleShowQR = (formId, formTitle) => {
    const link = `http://localhost:5173/form/${formId}`;
    setSelectedFormLink(link);
    setSelectedFormTitle(formTitle);
    setQrModalOpen(true);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            onClick={() => navigate('/admin/create-form')}
            className="px-6 py-3 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 text-center"
          >
            Create New Form
          </button>
          <button
            onClick={() => navigate('/admin/manage-teachers')}
            className="px-6 py-3 bg-green-700 text-white font-medium rounded hover:bg-green-800 text-center"
          >
            Manage Teachers
          </button>
        </div>

        {/* Recent forms table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Forms
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
                ))}
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

export default Dashboard;
