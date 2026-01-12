import mongoose from "mongoose";
import Form from "../models/formModel.js";
import dotenv from "dotenv";

dotenv.config();

const normalizeFormData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Find all forms that don't have approvalStatus or createdByRole set
    const formsToUpdate = await Form.find({
      $or: [
        { approvalStatus: { $exists: false } },
        { createdByRole: { $exists: false } }
      ]
    });

    console.log(`\n📋 Found ${formsToUpdate.length} forms to normalize`);

    if (formsToUpdate.length === 0) {
      console.log("✓ All forms are already normalized!");
      await mongoose.connection.close();
      return;
    }

    // Update all existing forms to have proper approval workflow values
    const result = await Form.updateMany(
      {
        $or: [
          { approvalStatus: { $exists: false } },
          { createdByRole: { $exists: false } }
        ]
      },
      {
        $set: {
          // Set existing admin forms as approved
          approvalStatus: "approved",
          // Mark them as created by admin
          createdByRole: "admin",
          // Leave approvedBy and approvedAt as null (set by default)
          approvedAt: null,
          rejectionReason: null
        }
      }
    );

    console.log(`\n✓ Successfully normalized ${result.modifiedCount} forms`);

    // Get updated forms to verify
    const updatedForms = await Form.find({
      approvalStatus: "approved",
      createdByRole: "admin"
    }).select("title approvalStatus createdByRole");

    console.log(`\n📊 Verification - Total approved forms created by admin: ${updatedForms.length}`);
    
    // Show sample of updated forms
    if (updatedForms.length > 0) {
      console.log("\n📝 Sample of updated forms:");
      updatedForms.slice(0, 3).forEach(form => {
        console.log(`   • ${form.title} (${form.approvalStatus}, ${form.createdByRole})`);
      });
    }

    console.log("\n✅ Normalization completed successfully!");

    await mongoose.connection.close();
    console.log("✓ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error normalizing form data:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

normalizeFormData();
