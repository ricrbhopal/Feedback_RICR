# Quick Reference - Teacher Form Approval System

## Key Routes

### Frontend Routes
- **Teacher Create Form**: `/teacher/create-form` 
- **Teacher Dashboard**: `/teacher/dashboard`
- **Admin Dashboard**: `/admin/dashboard` (shows pending approvals)

### Backend API Endpoints

#### Form Management
- `POST /forms` - Create form (Protect) - Teachers/Admins
- `GET /forms` - Get all forms for user (Protect) - Teachers/Admins
- `GET /forms/:id` - Get form by ID (Public) - Anyone can view approved forms
- `PUT /forms/:id` - Update form (Protect) - Teachers (pending only) / Admins
- `DELETE /forms/:id` - Delete form (Protect) - Teachers/Admins
- `PATCH /forms/:id/toggle-status` - Activate/Deactivate (Protect)

#### Approval Workflow (New)
- `PATCH /forms/:id/approve` - Approve form (Protect, Admin only)
- `PATCH /forms/:id/reject` - Reject form (Protect, Admin only)

## Database Fields Added to Form Model

```javascript
{
  approvalStatus: String,     // "approved" | "pending" | "rejected"
  createdByRole: String,      // "admin" | "teacher"
  approvedBy: ObjectId,       // Reference to Admin
  approvedAt: Date,           // Timestamp of approval
  rejectionReason: String     // Reason for rejection
}
```

## User Permissions Matrix

### Admin
- ✅ Create forms (immediately approved, must assign to teacher)
- ✅ View all forms
- ✅ Approve pending forms (assign to teacher)
- ✅ Reject pending forms (with optional reason)
- ✅ Edit any form
- ✅ Delete any form
- ✅ View responses
- ✅ Toggle form status (Active/Inactive)

### Teacher
- ✅ Create forms (pending approval status)
- ✅ Edit own pending forms
- ✅ Delete own pending forms
- ✅ View own created forms
- ✅ View assigned forms (after admin approval)
- ✅ View responses from assigned/approved forms
- ✅ Toggle status of assigned/approved forms
- ❌ Cannot approve forms
- ❌ Cannot reject forms
- ❌ Cannot edit approved forms

### Student
- ✅ View and fill approved forms
- ❌ Cannot see pending or rejected forms
- ❌ Cannot see form creation/management features

## Form Status Lifecycle

```
Teacher Creates Form
    ↓
approvalStatus = "pending"
    ↓
Admin Reviews
    ├─→ APPROVED (selected teacher assigned)
    │   └─→ Forms shows in Teacher's "Forms I Created" as Approved
    │   └─→ Forms shows in Assigned Teacher's "Forms Assigned to Me"
    │   └─→ Students can fill the form
    │
    └─→ REJECTED (with optional reason)
        └─→ Forms shows in Teacher's "Forms I Created" as Rejected
        └─→ Teacher sees rejection reason
        └─→ Teacher can edit and resubmit
```

## Frontend State Management

### LocalStorage Keys
- `teacherCreateFormDraft` - Draft forms created by teachers
- `createFormDraft` - Draft forms created by admins (existing)

## Testing Checklist

- [ ] Teacher can create form → appears as Pending
- [ ] Admin sees pending forms in dashboard
- [ ] Admin can approve form → must select teacher
- [ ] Admin can reject form → can add reason
- [ ] Rejected form shows reason to teacher
- [ ] Teacher can edit pending form
- [ ] Teacher can delete pending form
- [ ] Approved form assigned to teacher appears in their assigned forms
- [ ] Teacher cannot edit approved form
- [ ] Student can only access approved forms
- [ ] Student cannot access pending forms
- [ ] Form status toggle works for approved forms
- [ ] Admin can delete forms (any status)
- [ ] Admin can edit forms (any status)

## Important Notes

1. **Default Status**: Forms created by admins are automatically approved with status "approved"
2. **Public Access**: Students access forms via `/form/:formId` (public endpoint) - only approved forms visible
3. **Form Visibility**: 
   - Admins see all forms
   - Teachers see their created forms + assigned approved forms
   - Students see only approved forms they can access
4. **Rejection Flow**: Teacher can edit rejected forms and resubmit for approval
5. **Batch Codes**: Both teachers and admins can set allowed batches for form access
