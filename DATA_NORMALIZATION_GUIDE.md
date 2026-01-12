# Data Normalization Guide

## Problem
Existing forms in your database were created before the approval workflow feature was added. These forms don't have the new approval-related fields:
- `approvalStatus` 
- `createdByRole`
- `approvedAt`
- `rejectionReason`

This causes inconsistency in the database and may affect the new approval workflow functionality.

## Solution
We've created two migration scripts to normalize your existing data:

### Option 1: Quick Normalization (Recommended)
**File**: `server/src/seeders/normalizeFormData.js`

This script quickly normalizes all forms by:
- Setting `approvalStatus = "approved"` (since admin created them)
- Setting `createdByRole = "admin"`
- Clearing approval-related fields

**Run it with:**
```bash
node server/src/seeders/normalizeFormData.js
```

### Option 2: Detailed Migration with Statistics
**File**: `server/src/seeders/migrateFormData.js`

This is a more comprehensive script that:
- Validates each form individually
- Provides detailed statistics and breakdown
- Shows sample of normalized forms
- Better error handling

**Run it with:**
```bash
node server/src/seeders/migrateFormData.js
```

## What Gets Normalized

### For Each Existing Form:
```javascript
{
  approvalStatus: "approved",      // Admin forms are approved by default
  createdByRole: "admin",          // These were created by admin
  approvedAt: form.createdAt,      // Use creation date as approval date
  rejectionReason: null            // No rejection for approved forms
}
```

## Before Running Migration

1. **Backup your database** (recommended but not required for read-only migration)
   ```bash
   mongodump --uri "your_mongodb_uri" --out ./backup
   ```

2. **Ensure .env file is properly configured** with `MONGODB_URI`

3. **Check Node.js is running**
   ```bash
   node --version
   ```

## Running the Migration

### Step 1: Navigate to project directory
```bash
cd c:\Users\black\VS_Code_Data\Projects\RICR\FeedbackForm
```

### Step 2: Run migration script
```bash
# Using npm (if configured in package.json)
npm run migrate:forms

# OR directly with node
node server/src/seeders/migrateFormData.js
```

### Step 3: Check the output

You should see something like:
```
✓ Connected to MongoDB
📋 Processing 5 forms...

✓ Normalized: "Class Feedback Form"
✓ Normalized: "Student Satisfaction Survey"
✓ Normalized: "Course Evaluation"
✓ Already normalized: "Existing New Form"

============================================================
📊 MIGRATION SUMMARY
============================================================
Total forms processed:     5
Newly normalized:          4
Already normalized:        1
Errors:                    0
============================================================

📈 APPROVAL STATUS BREAKDOWN:
   • approved: 5 forms

👥 CREATOR ROLE BREAKDOWN:
   • admin: 5 forms

✅ Migration completed successfully!
```

## What Happens After Migration

### In Admin Dashboard
- All existing forms will show as **"Approved"** (green badge)
- Forms will show creator role as **"admin"**
- All functionality will work as expected

### In Teacher Dashboard
- Teachers can now create new forms (pending approval)
- Existing admin forms are already approved and usable

### For Students
- Nothing changes - they continue to see and fill the same forms

## Reverting (If Needed)

If you need to undo the migration:
```javascript
// Connect to MongoDB and run:
db.forms.updateMany({}, {
  $unset: {
    approvalStatus: 1,
    createdByRole: 1,
    approvedAt: 1,
    rejectionReason: 1
  }
})
```

## After Migration

### Add npm script to package.json (Optional)
To make it easier to run in the future, add to `server/package.json`:
```json
{
  "scripts": {
    "migrate:forms": "node src/seeders/migrateFormData.js"
  }
}
```

Then run with:
```bash
npm run migrate:forms
```

## Troubleshooting

### "Cannot find module 'dotenv'"
```bash
npm install dotenv --save-dev
```

### "MONGODB_URI not found"
- Check `.env` file exists in server directory
- Verify `MONGODB_URI` is set in `.env`

### "Connection timeout"
- Verify MongoDB is running
- Check MONGODB_URI is correct
- Verify network connectivity

### "Permission denied"
- Run with appropriate Node.js environment
- Ensure MongoDB user has write permissions

## Verification

After running migration, verify in MongoDB:

### Using MongoDB Compass
1. Connect to your database
2. Open the `feedback_db` collection (or your form collection)
3. Check a few documents
4. Verify `approvalStatus`, `createdByRole`, and `approvedAt` fields are present

### Using MongoDB CLI
```bash
# Connect to MongoDB
mongosh

# Switch to your database
use your_database_name

# Check a form
db.forms.findOne({title: "Your Form Title"})

# Should show:
{
  ...,
  approvalStatus: "approved",
  createdByRole: "admin",
  approvedAt: ISODate(...),
  ...
}
```

## FAQ

**Q: Will this affect existing data?**
A: No, it only adds the missing fields with proper defaults. No existing data is deleted or modified.

**Q: Can I run the migration multiple times?**
A: Yes, it's safe to run multiple times. Already-normalized forms will be skipped.

**Q: What about forms created by teachers after the feature?**
A: They will already have the proper fields, so no changes needed.

**Q: Do I need to restart the server?**
A: No, the migration is independent. But restart for a fresh load if desired.

**Q: What if migration fails halfway?**
A: Rerun the script - it will complete the remaining forms. It's idempotent.

## Success Indicators

After successful migration, you should see:
- ✅ All forms have `approvalStatus` field
- ✅ All forms have `createdByRole` field  
- ✅ Admin forms show as "approved"
- ✅ Admin dashboard shows all forms as approved
- ✅ No errors in console
- ✅ Forms remain functional

## Next Steps

After migration:
1. ✅ Teachers can create new forms (pending approval)
2. ✅ Admins can approve/reject new forms
3. ✅ Old admin forms work exactly as before
4. ✅ Students see all (old + new approved) forms

---

**Last Updated**: January 12, 2026
**Status**: Ready for Production
