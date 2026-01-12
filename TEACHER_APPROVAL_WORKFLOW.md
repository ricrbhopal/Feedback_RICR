# Teacher Form Creation & Approval Workflow - Implementation Summary

## Overview
Successfully implemented a form approval workflow that allows teachers to create forms, which must be approved by admins before becoming public. Admins have full control to approve, reject, edit, delete, or stop forms.

## Changes Made

### 1. **Database Model Updates** 
**File**: `server/src/models/formModel.js`

Added approval workflow fields to the Form schema:
- `approvalStatus` - Enum: "approved", "pending", "rejected" (default: "approved")
- `createdByRole` - Enum: "admin", "teacher" (tracks who created the form)
- `approvedBy` - Reference to admin who approved the form
- `approvedAt` - Timestamp of approval
- `rejectionReason` - Reason for rejection if rejected

### 2. **Backend API Updates**

#### Form Controller (`server/src/controller/formController.js`)

**Updated `createForm` endpoint:**
- Teachers creating forms: Sets `approvalStatus = "pending"` (requires approval)
- Admins creating forms: Sets `approvalStatus = "approved"` immediately
- Admin forms require `assignedTo` field; teacher forms don't

**Updated `getAllForms` endpoint:**
- Admins see all forms (created by admin and pending from teachers)
- Teachers see:
  - Forms they created
  - Forms assigned to them by admin (approved only)

**Updated `updateForm` endpoint:**
- Teachers can only edit their own pending forms
- Admins can edit any form and change `assignedTo`

**New `approveForm` endpoint:**
- Only admins can approve pending forms
- Requires assigning the form to a teacher via `assignedTo` field
- Sets `approvalStatus = "approved"`, `approvedBy`, `approvedAt`

**New `rejectForm` endpoint:**
- Only admins can reject pending forms
- Sets `approvalStatus = "rejected"`
- Stores optional rejection reason

**Updated `getFormById` endpoint:**
- Public access (students filling forms) - only approved forms visible
- Authenticated users: Can see their own pending forms; otherwise only approved
- Admins: Can see all forms
- Enforces approval status check for public form access

#### Form Router (`server/src/routes/formRouter.js`)
Added two new protected routes:
- `PATCH /forms/:id/approve` - Approve pending forms
- `PATCH /forms/:id/reject` - Reject pending forms

### 3. **Frontend - Teacher Components**

#### New: Teacher Create Form Page (`client/src/pages/Teacher/CreateForm.jsx`)
- Similar to admin form creation but without teacher assignment
- Auto-saves drafts to localStorage (key: `teacherCreateFormDraft`)
- Form submission message: "Form submitted for approval"
- Redirects to teacher dashboard after submission
- Features:
  - Add/edit/delete questions
  - Drag-and-drop question reordering
  - Support for all question types (short, paragraph, MCQ, checkbox, dropdown, star rating, yes/no)
  - Add allowed batches
  - Form validation
  - Unsaved changes confirmation

### 4. **Frontend - Teacher Dashboard Updates**
**File**: `client/src/pages/Teacher/Dashboard.jsx`

New features:
- **Two form tables:**
  1. "Forms I Created" - Shows forms created by teacher with approval status
  2. "Forms Assigned to Me" - Shows forms assigned by admin

- **For pending forms:**
  - Edit button (can only edit while pending)
  - Delete button
  - Shows rejection reason if rejected

- **For approved forms:**
  - Copy Link button
  - QR Code button
  - View Responses button
  - Active/Inactive status toggle

- **Create Form button** - Links to `/teacher/create-form`

- **Approval status badges:**
  - Green "Approved"
  - Yellow "Pending"
  - Red "Rejected" (with rejection reason)

### 5. **Frontend - Admin Dashboard Updates**
**File**: `client/src/pages/admin/Dashboard.jsx`

New features:
- **Stats cards** - Added "Pending Approval" count (yellow badge)
- **Pending Approval section** - Highlighted in yellow
  - Displays forms pending admin review
  - Shows: Form Title, Created By, Created Date
  - "Review & Approve" and "Reject" buttons

- **Approval Modal** - When admin clicks approve/reject:
  - **Approve tab:**
    - Dropdown to select which teacher to assign the form to
    - "Approve & Assign" button
  - **Reject tab:**
    - Text area for optional rejection reason
    - "Reject Form" button
  - Close button

- **All Forms table** now shows:
  - Approval status badge (Approved/Pending/Rejected)
  - All existing actions (View, Edit, Responses, etc.)
  - Form status toggle (Active/Inactive)

### 6. **Access Control**

| User Type | Can Create | Can Edit | Can Approve | Can Reject | Can See Pending | Can See Own Pending |
|-----------|-----------|----------|-------------|------------|-----------------|-------------------|
| Admin | ✓ (Auto Approved) | ✓ All | ✓ | ✓ | ✓ All | N/A |
| Teacher | ✓ (Pending) | ✓ Own Pending | ✗ | ✗ | ✓ Own | ✓ |
| Student | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ (Can only see approved) |

## Workflow Summary

### Teacher Form Creation Flow:
1. Teacher navigates to "Create Form" button on dashboard
2. Teacher fills form with questions, title, description, allowed batches
3. Teacher clicks "Submit for Approval"
4. Form status: **Pending**
5. Teacher can see pending form in "Forms I Created" section
6. Teacher can Edit or Delete while pending
7. Admin reviews and approves/rejects
8. If approved: Form becomes active and teacher can share it
9. If rejected: Shows rejection reason; teacher can edit and resubmit

### Admin Form Management Flow:
1. Admin sees all pending forms in highlighted section
2. Admin clicks "Review & Approve" on pending form
3. Admin modal opens with two tabs:
   - **Approve**: Select teacher to assign + approve button
   - **Reject**: Enter reason + reject button
4. Form moves to approved/rejected status
5. Approved forms can be toggled active/inactive
6. Admin can delete any form at any time
7. Admin can edit approved forms

## Notes

- Default form status is "approved" for backwards compatibility with admin-created forms
- Public form access (via `/form/:formId` for students) is restricted to approved forms only
- Teachers cannot edit approved forms (only admins can)
- Rejection reason is optional and shown to teacher
- Form status toggle (Active/Inactive) works for both approved forms and assigned forms
- Batch codes can be set by both teachers and admins for form access control
