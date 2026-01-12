import mongoose from "mongoose";
import Form from "../models/formModel.js";
import dotenv from "dotenv";

dotenv.config();

const migrateFormApprovalData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const stats = {
      total: 0,
      normalized: 0,
      alreadyNormalized: 0,
      errors: 0
    };

    // Get all forms
    const allForms = await Form.find({});
    stats.total = allForms.length;

    console.log(`\n📋 Processing ${stats.total} forms...\n`);

    for (const form of allForms) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Check if approvalStatus exists and is valid
        if (!form.approvalStatus || !["approved", "pending", "rejected"].includes(form.approvalStatus)) {
          updateData.approvalStatus = "approved";
          needsUpdate = true;
        }

        // Check if createdByRole exists and is valid
        if (!form.createdByRole || !["admin", "teacher"].includes(form.createdByRole)) {
          updateData.createdByRole = "admin";
          needsUpdate = true;
        }

        // Ensure approvedAt is set for approved forms
        if (form.approvalStatus === "approved" || updateData.approvalStatus === "approved") {
          if (!form.approvedAt) {
            updateData.approvedAt = form.createdAt || new Date();
            needsUpdate = true;
          }
        }

        // Ensure rejectionReason is null if not rejected
        if (form.approvalStatus !== "rejected" && updateData.approvalStatus !== "rejected") {
          if (form.rejectionReason) {
            updateData.rejectionReason = null;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await Form.findByIdAndUpdate(form._id, { $set: updateData });
          stats.normalized++;
          console.log(`✓ Normalized: "${form.title}"`);
        } else {
          stats.alreadyNormalized++;
        }
      } catch (error) {
        stats.errors++;
        console.error(`✗ Error processing form "${form.title}":`, error.message);
      }
    }

    // Verify results
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total forms processed:     ${stats.total}`);
    console.log(`Newly normalized:          ${stats.normalized}`);
    console.log(`Already normalized:        ${stats.alreadyNormalized}`);
    console.log(`Errors:                    ${stats.errors}`);
    console.log("=".repeat(60));

    // Show approval status breakdown
    const approvalBreakdown = await Form.aggregate([
      {
        $group: {
          _id: "$approvalStatus",
          count: { $sum: 1 }
        }
      }
    ]);

    console.log("\n📈 APPROVAL STATUS BREAKDOWN:");
    approvalBreakdown.forEach(item => {
      console.log(`   • ${item._id}: ${item.count} forms`);
    });

    // Show role breakdown
    const roleBreakdown = await Form.aggregate([
      {
        $group: {
          _id: "$createdByRole",
          count: { $sum: 1 }
        }
      }
    ]);

    console.log("\n👥 CREATOR ROLE BREAKDOWN:");
    roleBreakdown.forEach(item => {
      console.log(`   • ${item._id}: ${item.count} forms`);
    });

    // Sample of normalized forms
    const sampleForms = await Form.find({})
      .limit(5)
      .select("title approvalStatus createdByRole approvedAt");

    console.log("\n📝 SAMPLE OF NORMALIZED FORMS:");
    sampleForms.forEach(form => {
      console.log(`   • ${form.title}`);
      console.log(`     - Status: ${form.approvalStatus}`);
      console.log(`     - Created By: ${form.createdByRole}`);
      console.log(`     - Approved At: ${form.approvedAt ? new Date(form.approvedAt).toLocaleDateString() : "N/A"}`);
    });

    console.log("\n✅ Migration completed successfully!");

    await mongoose.connection.close();
    console.log("✓ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error during migration:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

migrateFormApprovalData();
