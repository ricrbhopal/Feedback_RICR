# UI/UX Changes - Teacher Form Approval System

## New Pages

### 1. Teacher Create Form Page (`/teacher/create-form`)
**Path**: `client/src/pages/Teacher/CreateForm.jsx`

**Features**:
- Form title input (required)
- Form description (optional)
- Add questions with drag-and-drop reordering
- Question types: Short Answer, Paragraph, MCQ (single), MCQ (multiple), Dropdown, Star Rating, Yes/No
- Add allowed batches for student access
- Draft auto-save with reminder toast
- Unsaved changes confirmation modal
- Submit button → "Submit for Approval" (not just "Create")
- Navigation: Back button returns to Teacher Dashboard

**Key Differences from Admin**:
- No teacher selection dropdown (not needed)
- Success message: "Form submitted for approval!" instead of "Form created successfully!"
- Draft key: `teacherCreateFormDraft`

## Updated Pages

### 2. Teacher Dashboard (`/teacher/dashboard`)
**Path**: `client/src/pages/Teacher/Dashboard.jsx`

**New Sections**:

#### A. Create New Form Button
- Green button at top
- Links to `/teacher/create-form`

#### B. "Forms I Created" Table (NEW)
- Shows forms created by the teacher
- Columns:
  - Form Title
  - Created Date
  - Status (Active/Inactive badge)
  - Approval Status (NEW)
  - Actions
  
- **Approval Status Badges**:
  - 🟢 Green "Approved"
  - 🟡 Yellow "Pending"
  - 🔴 Red "Rejected"

- **Actions by Status**:
  - **Pending**: Edit, Delete buttons
  - **Approved**: Copy Link, QR Code, View Responses, Status Toggle
  - **Rejected**: Shows rejection reason (clickable or visible)

#### C. "Forms Assigned to Me" Table (EXISTING - UNCHANGED)
- Shows forms assigned by admin
- Same layout as before
- Actions: View, Responses, Copy Link, QR Code, Status Toggle

### 3. Admin Dashboard (`/admin/dashboard`)
**Path**: `client/src/pages/admin/Dashboard.jsx`

**New Features**:

#### A. Updated Stats Cards
- Changed from 3 cards to 4 cards:
  - Total Forms
  - Active Forms
  - **Pending Approval** (NEW - yellow highlight)
  - Total Responses

#### B. Pending Approval Section (NEW)
- **Only shown if pending forms exist**
- Yellow background box
- Table with:
  - Form Title
  - Created By (shows "Teacher")
  - Created Date
  - Actions: "Review & Approve" and "Reject" buttons

#### C. All Forms Table (UPDATED)
- Added new column: "Approval Status"
- Status badges:
  - 🟢 Green "Approved"
  - 🟡 Yellow "Pending Review"
  - 🔴 Red "Rejected"
- All existing actions still available
- Actions on rejected forms show status

### 4. Approval Modal (NEW)
**Triggered by**: "Review & Approve" or "Reject" buttons

**Two-Tab Design**:

#### Tab 1: Approve Form
- **Heading**: "Approve Form"
- **Background**: Green (green-50)
- **Field**: Teacher dropdown
  - Label: "Assign to Teacher *"
  - Options: List of teachers from database
  - Required field
- **Button**: Green "Approve & Assign" button
  - Only enabled if teacher is selected

#### Tab 2: Reject Form
- **Heading**: "Reject Form"
- **Background**: Red (red-50)
- **Field**: Rejection Reason textarea
  - Placeholder: "Enter reason for rejection..."
  - Optional field
  - Rows: 3
- **Button**: Red "Reject Form" button

#### Tab 3: Close Button
- Gray "Close" button at bottom (spans full width)
- Clears form and closes modal

## Status Badges Styling

```
Approved:   bg-green-100   text-green-800   🟢
Pending:    bg-yellow-100  text-yellow-800  🟡
Rejected:   bg-red-100     text-red-800     🔴
```

## Buttons & Colors

### New Buttons
- **Review & Approve**: Green button (green-600 hover green-700)
- **Reject**: Red button (red-600 hover red-700)
- **Create New Form**: Green button (green-600 hover green-700)
- **Approve & Assign**: Green button (green-600 hover green-700)

### Updated Buttons
- **Edit**: Only appears for pending forms (teacher) / all forms (admin)
- **Delete**: Available for pending forms (teacher) / all forms (admin)

## Toast Messages

### Success Messages
- "Form submitted for approval!" (teacher creates form)
- "Form approved successfully!" (admin approves)
- "Form rejected successfully!" (admin rejects)
- "Draft form loaded from previous session" (draft recovery)

### Error Messages
- "Please select a teacher to assign this form" (approval without selection)
- "Error creating form" (generic creation error)

## Modal Confirmations

### Delete Form (Existing - Unchanged)
- "Are you sure you want to delete this form?"
- Yes/No buttons

### Cancel Form Creation (Existing - Enhanced)
- "Unsaved Progress"
- "You have unsaved changes..."
- "No, Don't Save" / "Yes, Save Draft" buttons

## Responsive Design

All pages are mobile-responsive:
- Tables stack on mobile
- Buttons wrap/stack
- Grid layouts adjust from 1 column (mobile) to 3-4 columns (desktop)
- Modal properly centered and responsive

## Navigation Changes

### New Routes
- Teacher: Can access `/teacher/create-form`
- Admin: Can see "Review & Approve" and "Reject" options in dashboard

### Breadcrumbs/Back Buttons
- Teacher Create Form page has "← Back to Dashboard" button
- Links back to `/teacher/dashboard`

## Validation

### Form Validation (Teacher Create Form)
- Form title: Required
- At least one question: Required
- Question text: Required
- MCQ/Checkbox/Dropdown: Minimum 2 options, no empty options
- Yes/No: Exactly 2 options

### Approval Modal Validation
- Teacher selection: Required for approval
- Rejection reason: Optional

## States & Interactions

### Pending Form State (Teacher)
- User can see Edit button
- User can delete the form
- Form shows "Pending" approval badge
- Can view form preview

### Approved Form State (Teacher)
- Edit button hidden
- Delete button hidden
- Can toggle active/inactive
- Can share with students (Copy Link, QR Code)
- Can view responses

### Rejected Form State (Teacher)
- Shows rejection reason
- Can edit and resubmit
- Can delete
- Cannot activate (not yet approved)

### Pending Form State (Admin)
- Shows in special "Pending Approval" section
- Can view, approve, or reject
- Can preview/edit the form
- Can delete without approval

## Loading States

- Draft loading: Toast shows "Draft form loaded from previous session"
- Form fetching: Standard loading state (existing)
- Submission: Button disabled with spinner (existing)

## Error Handling

- Form not found: 404 error (existing)
- Approval without teacher: Toast error
- Rejection: Success toast on completion
- Approval: Success toast on completion

## Accessibility Features

- Form labels properly associated
- Buttons have clear purpose labels
- Toasts announce changes to user
- Modal has close button and keyboard support
- Color-coded badges supplement text indicators
- Hover states on interactive elements
