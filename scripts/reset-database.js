const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const User = require("../src/models/User");
const Equipment = require("../src/models/Equipment");
const Anomaly = require("../src/models/Anomaly");
const Company = require("../src/models/Company");
const Site = require("../src/models/Site");

async function resetDatabase() {
  try {
    console.log("🗄️ Connecting to database...");
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to database");

    // Ask for confirmation
    console.log("⚠️  WARNING: This will delete ALL data in the database!");
    console.log("Are you sure you want to continue? (y/N)");

    // In a real scenario, you'd use readline for user input
    // For now, we'll just proceed with a safety check
    const shouldReset = process.argv.includes("--confirm");
    
    if (!shouldReset) {
      console.log("❌ Database reset cancelled. Use --confirm flag to proceed.");
      console.log("Example: node scripts/reset-database.js --confirm");
      process.exit(0);
    }

    console.log("🧹 Clearing all collections...");

    // Clear all collections
    await User.deleteMany({});
    console.log("✅ Users cleared");

    await Equipment.deleteMany({});
    console.log("✅ Equipment cleared");

    await Anomaly.deleteMany({});
    console.log("✅ Anomalies cleared");

    await Company.deleteMany({});
    console.log("✅ Companies cleared");

    await Site.deleteMany({});
    console.log("✅ Sites cleared");

    console.log("🎉 Database reset completed successfully!");
    console.log("💡 You may want to run seed scripts to populate with test data:");
    console.log("   npm run create:admin");
    console.log("   npm run seed:users");
    console.log("   npm run seed");

  } catch (error) {
    console.error("❌ Error resetting database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the reset
resetDatabase();
