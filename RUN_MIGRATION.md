# Quick Start - Run Data Normalization

## 🚀 One-Command Execution

### Option 1: Using npm (Recommended - Easiest)
```bash
cd server
npm run migrate:forms
```

### Option 2: Direct Node execution
```bash
cd server
node src/seeders/migrateFormData.js
```

### Option 3: Quick normalization (faster)
```bash
cd server
npm run normalize:forms
```

---

## What This Does

✅ **Adds missing fields** to all existing forms:
- `approvalStatus: "approved"` - Forms created by admin are approved
- `createdByRole: "admin"` - Marks them as admin-created
- `approvedAt: {createdAt}` - Uses creation date as approval date
- `rejectionReason: null` - No rejection for approved forms

✅ **Verifies results** with:
- Statistics on what was normalized
- Breakdown by approval status
- Breakdown by creator role
- Sample of normalized forms

✅ **Ensures consistency** across:
- Admin dashboard forms display
- Teacher dashboard visibility
- Student form access
- New teacher form approvals

---

## Expected Output

When you run the command, you'll see:

```
✓ Connected to MongoDB

📋 Processing 5 forms...

✓ Normalized: "Class Feedback Form"
✓ Normalized: "Student Satisfaction Survey"  
✓ Normalized: "Course Evaluation"
✓ Already normalized: "Budget Review"
✓ Already normalized: "New Form"

============================================================
📊 MIGRATION SUMMARY
============================================================
Total forms processed:     5
Newly normalized:          3
Already normalized:        2
Errors:                    0
============================================================

📈 APPROVAL STATUS BREAKDOWN:
   • approved: 5 forms

👥 CREATOR ROLE BREAKDOWN:
   • admin: 5 forms

📝 SAMPLE OF NORMALIZED FORMS:
   • Class Feedback Form
     - Status: approved
     - Created By: admin
     - Approved At: 1/5/2026

✅ Migration completed successfully!
✓ Database connection closed
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Make sure you're in the `server` directory |
| "MONGODB_URI not defined" | Check `.env` file has `MONGODB_URI` |
| "Connection timeout" | Ensure MongoDB is running |
| "Permission error" | Run with admin privileges or check DB permissions |

---

## Before & After

### Before Migration
```javascript
{
  _id: ObjectId("..."),
  title: "Student Feedback",
  createdBy: ObjectId("..."),
  // Missing: approvalStatus, createdByRole, approvedAt, etc.
}
```

### After Migration
```javascript
{
  _id: ObjectId("..."),
  title: "Student Feedback",
  createdBy: ObjectId("..."),
  approvalStatus: "approved",
  createdByRole: "admin",
  approvedAt: ISODate("2025-12-15T10:30:00.000Z"),
  rejectionReason: null
  // ✅ All fields properly set!
}
```

---

## Verification Steps

After running the migration, verify everything worked:

### 1. Check Admin Dashboard
- Go to `/admin/dashboard`
- All existing forms should show as "Approved" (green badge)
- Should show "0 Pending Approval"

### 2. Check Form Creation
- Teachers can create forms → they appear as "Pending"
- Admin can approve → forms become "Approved"

### 3. Check Student Access
- Students can access and fill all approved forms
- No changes to existing forms

---

## What Happens Next?

After normalization is complete:

**For Old Forms (Admin Created)**
- ✅ Display as "Approved" in admin dashboard
- ✅ Appear as assigned forms in teacher dashboard
- ✅ Accessible to students
- ✅ Can be edited/deleted by admins
- ✅ Can toggle active/inactive

**For New Forms (Teacher Created)**
- ✅ Display as "Pending" until approved
- ✅ Show in "Forms I Created" in teacher dashboard
- ✅ Require admin approval
- ✅ Invisible to students until approved
- ✅ Can be edited by teacher while pending

---

## Need Help?

See **DATA_NORMALIZATION_GUIDE.md** for:
- Detailed explanation
- Troubleshooting guide
- Reverting changes (if needed)
- Manual verification steps
- FAQ

---

**Status**: ✅ Ready to Run
**Time to Execute**: < 1 minute
**Data Affected**: Normalization only (no deletion or modification of existing data)
**Reversible**: Yes (see guide for revert steps)
