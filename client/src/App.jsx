import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home.jsx'
import Login from './pages/admin/Login.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import CreateForm from './pages/admin/CreateForms.jsx'
import EditForm from './pages/admin/EditForm.jsx'
import ManageTeachers from './pages/admin/ManageTeachers.jsx'
import FillForm from "./pages/student/FillForm.jsx";
import ViewForm from './pages/admin/ViewForm.jsx'
import ViewResponses from './pages/admin/ViewResponses.jsx'
import TeacherDashboard from './pages/Teacher/Dashboard.jsx'
import TeacherViewForm from './pages/Teacher/ViewForm.jsx'
import TeacherViewResponses from './pages/Teacher/ViewResponses.jsx'



const App = () => {
  return (
    <AuthProvider>
    <BrowserRouter>
    <Toaster position="top-center" />
    <Navbar />    
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
      
      {/* Public Route */}
      <Route path="/form/:formId" element={<FillForm />} />
    </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}

export default App