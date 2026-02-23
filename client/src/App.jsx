import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/admin/Login.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const CreateForm = lazy(() => import('./pages/admin/CreateForms.jsx'));
const EditForm = lazy(() => import('./pages/admin/EditForm.jsx'));
const ManageTeachers = lazy(() => import('./pages/admin/ManageTeachers.jsx'));
const FillForm = lazy(() => import('./pages/student/FillForm.jsx'));
const ReFeedbackForm = lazy(() => import('./pages/student/ReFeedbackForm.jsx'));
const ViewForm = lazy(() => import('./pages/admin/ViewForm.jsx'));
const ViewResponses = lazy(() => import('./pages/admin/ViewResponses.jsx'));
const TeacherDashboard = lazy(() => import('./pages/Teacher/Dashboard.jsx'));
const TeacherViewForm = lazy(() => import('./pages/Teacher/ViewForm.jsx'));
const TeacherViewResponses = lazy(() => import('./pages/Teacher/ViewResponses.jsx'));
const TeacherCreateForm = lazy(() => import('./pages/Teacher/CreateForm.jsx'));
const TeacherEditForm = lazy(() => import('./pages/Teacher/EditForm.jsx'));

const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
      <p className="text-lg text-gray-600">Loading...</p>
    </div>
  </div>
);


const App = () => {
  // Control max screen width here
  const MAX_WIDTH = "max-w-7xl"; // Change to max-w-6xl, max-w-screen-xl, etc.
  const [appVersion, setAppVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Check for app updates every 60 seconds
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const response = await fetch('/index.html', { cache: 'no-store' });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const versionMeta = doc.querySelector('meta[name="app-version"]');
        const newVersion = versionMeta?.getAttribute('content');

        // First load - set current version
        if (!appVersion) {
          setAppVersion(newVersion);
        }
        // New version detected
        else if (newVersion && newVersion !== appVersion) {
          setUpdateAvailable(true);
          toast.custom((t) => (
            <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-md">
              <p className="font-semibold mb-2">🔄 New Version Available</p>
              <p className="text-sm mb-3">A new version has been deployed. Please refresh to get the latest updates.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-white text-blue-600 font-semibold rounded hover:bg-gray-100 transition-colors"
                >
                  Refresh Now
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-800 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          ), { duration: Infinity });
        }
      } catch (error) {
        console.warn('Failed to check for updates:', error);
      }
    };

    // Check immediately on mount
    checkForUpdates();

    // Then check every 60 seconds
    const interval = setInterval(checkForUpdates, 60000);

    return () => clearInterval(interval);
  }, [appVersion]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            success: { duration: 3000 },
            error: { duration: 4000 },
          }}
        />
        <Navbar />    
        <div className={`${MAX_WIDTH} mx-auto w-full`}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      
      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/create-form" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <CreateForm />
        </ProtectedRoute>
      } />
      <Route path="/admin/edit-form/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <EditForm />
        </ProtectedRoute>
      } />
      <Route path="/admin/manage-teachers" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ManageTeachers />
        </ProtectedRoute>
      } />
      <Route path="/admin/forms/:id" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ViewForm />
        </ProtectedRoute>
      } />
      <Route path="/admin/responses/:formId" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <ViewResponses />
        </ProtectedRoute>
      } />
      
      {/* Teacher Routes */}
      <Route path="/teacher/dashboard" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      <Route path="/teacher/create-form" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherCreateForm />
        </ProtectedRoute>
      } />
      <Route path="/teacher/forms/:id/edit" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherEditForm />
        </ProtectedRoute>
      } />
      <Route path="/teacher/forms/:id" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherViewForm />
        </ProtectedRoute>
      } />
      <Route path="/teacher/responses/:formId" element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherViewResponses />
        </ProtectedRoute>
      } />
      
      {/* Public Routes */}
      <Route path="/form/:formId" element={<FillForm />} />
      <Route path="/form/:formId/re-feedback/:responseId" element={<ReFeedbackForm />} />
    </Routes>
            </Suspense>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App