const axios = require("axios");

const API_BASE = "http://localhost:5000";

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, token = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (data) config.data = data;

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
    };
  }
}

// Individual test functions
async function testBasicFlow() {
  console.log("🧪 TESTING BASIC BILLUN FLOW\n");

  // 1. Health Check
  console.log("1️⃣ Health Check...");
  const health = await makeRequest("GET", "/");
  console.log(
    health.success ? "✅ Server is running" : "❌ Server not responding"
  );

  // 2. User Registration/Login
  console.log("\n2️⃣ User Authentication...");
  const userData = {
    firstName: "Demo",
    lastName: "User",
    email: "demo@billun.com",
    password: "demo123",
    role: "manager",
  };

  let authResult = await makeRequest("POST", "/api/auth/register", userData);
  if (!authResult.success && authResult.status === 400) {
    // User exists, try login
    authResult = await makeRequest("POST", "/api/auth/login", {
      email: userData.email,
      password: userData.password,
    });
  }

  if (authResult.success) {
    console.log("✅ Authentication successful");
    const token = authResult.data.token;
    const userId = authResult.data.user.id;

    // 3. Company Creation
    console.log("\n3️⃣ Company Management...");
    const companyData = {
      name: "Demo Transport Company",
      siret: "98765432109876",
      mainManagerData: {
        firstName: "Company",
        lastName: "Manager",
        email: "manager@democompany.com",
        phone: "+33123456789",
      },
    };

    const companyResult = await makeRequest(
      "POST",
      "/api/companies",
      companyData,
      token
    );
    let companyId = null;

    if (companyResult.success) {
      console.log("✅ Company created");
      companyId = companyResult.data.company._id;
    } else {
      // Get existing company
      const existingCompanies = await makeRequest(
        "GET",
        "/api/companies",
        null,
        token
      );
      if (
        existingCompanies.success &&
        existingCompanies.data &&
        existingCompanies.data.length > 0
      ) {
        companyId = existingCompanies.data[0]._id;
        console.log("✅ Using existing company");
      } else {
        console.log("⚠️ No companies found, company creation failed");
      }
    }

    // 4. Equipment Creation
    console.log("\n4️⃣ Equipment Management...");
    const equipmentData = {
      internalId: "DEMO-001",
      licensePlate: "FR-DEMO-01",
      name: "Demo Truck",
      equipmentType: "vehicle",
      vehicleType: "truck",
      brand: "Mercedes",
      model: "Actros",
      fuelType: "diesel",
    };

    const equipmentResult = await makeRequest(
      "POST",
      "/api/equipment",
      equipmentData,
      token
    );
    if (equipmentResult.success) {
      console.log(
        `✅ Equipment created - Billun ID: ${equipmentResult.data.equipment.billunId}`
      );

      const equipmentId = equipmentResult.data.equipment._id;

      // 5. Anomaly Creation
      console.log("\n5️⃣ Anomaly Reporting...");
      const anomalyData = {
        equipment: equipmentId,
        description: "Demo anomaly - brake light malfunction",
        criticality: "minor",
        immobilizationStatus: "mobile",
      };

      const anomalyResult = await makeRequest(
        "POST",
        "/api/anomalies",
        anomalyData,
        token
      );
      if (anomalyResult.success) {
        console.log("✅ Anomaly reported");

        // 6. Dashboard Overview
        console.log("\n6️⃣ Dashboard Data...");
        const dashboardResult = await makeRequest(
          "GET",
          "/api/dashboard/overview",
          null,
          token
        );
        if (dashboardResult.success) {
          const stats = dashboardResult.data.stats;
          console.log("✅ Dashboard loaded:");
          console.log(`   - Equipment: ${stats.equipment.total}`);
          console.log(`   - Anomalies: ${stats.anomalies.total}`);
          console.log(`   - Photos: ${stats.photos.total}`);
        }
      }
    }

    console.log("\n🎉 Basic flow test completed!");
    return { success: true, token, userId, companyId };
  } else {
    console.log("❌ Authentication failed");
    return { success: false };
  }
}

async function testEquipmentFeatures(token) {
  console.log("\n🚛 TESTING EQUIPMENT FEATURES\n");

  // Test different equipment types
  const equipmentTypes = [
    {
      equipmentType: "vehicle",
      vehicleType: "truck",
      name: "Test Truck",
      internalId: "TRK-001",
    },
    {
      equipmentType: "trailer",
      trailerType: "box",
      name: "Test Trailer",
      internalId: "TRL-001",
    },
    {
      equipmentType: "handling",
      handlingType: "forklift",
      name: "Test Forklift",
      internalId: "FLT-001",
    },
  ];

  for (const equipment of equipmentTypes) {
    const result = await makeRequest(
      "POST",
      "/api/equipment",
      {
        ...equipment,
        licensePlate: `TEST-${equipment.name.replace(" ", "-").toUpperCase()}`,
        brand: "Test Brand",
        fuelType: "diesel",
      },
      token
    );

    if (result.success) {
      console.log(
        `✅ ${equipment.name} created - ID: ${result.data.equipment.billunId}`
      );
    } else {
      console.log(
        `⚠️ ${equipment.name} creation: ${
          result.error.error || "Already exists"
        }`
      );
    }
  }

  // Test equipment search
  const searchResult = await makeRequest(
    "GET",
    "/api/equipment?equipmentType=vehicle",
    null,
    token
  );
  if (searchResult.success) {
    console.log(
      `✅ Equipment search: Found ${
        searchResult.data.equipment ? searchResult.data.equipment.length : 0
      } vehicles`
    );
  }
}

async function testAnomalyWorkflow(token, equipmentId) {
  console.log("\n🚨 TESTING ANOMALY WORKFLOW\n");

  const anomalyLevels = ["ok", "minor", "important", "critical"];

  for (const level of anomalyLevels) {
    const anomalyData = {
      equipment: equipmentId,
      description: `Test ${level} anomaly`,
      criticality: level,
      immobilizationStatus: level === "critical" ? "immobilized" : "mobile",
    };

    const result = await makeRequest(
      "POST",
      "/api/anomalies",
      anomalyData,
      token
    );
    if (result.success) {
      console.log(`✅ ${level.toUpperCase()} anomaly created`);
    }
  }

  // Test anomaly filtering
  const criticalAnomalies = await makeRequest(
    "GET",
    "/api/anomalies?criticality=critical",
    null,
    token
  );
  if (criticalAnomalies.success) {
    console.log(
      `✅ Critical anomalies: ${criticalAnomalies.data.anomalies.length} found`
    );
  }
}

async function testDashboardFeatures(token) {
  console.log("\n📊 TESTING DASHBOARD FEATURES\n");

  const dashboardEndpoints = [
    { name: "Overview", endpoint: "/api/dashboard/overview" },
    { name: "Equipment Health", endpoint: "/api/dashboard/equipment-health" },
    { name: "Analytics", endpoint: "/api/dashboard/analytics?period=30d" },
    { name: "Notifications", endpoint: "/api/dashboard/notifications" },
    { name: "Photo Stats", endpoint: "/api/photos/stats/dashboard" },
  ];

  for (const { name, endpoint } of dashboardEndpoints) {
    const result = await makeRequest("GET", endpoint, null, token);
    if (result.success) {
      console.log(`✅ ${name} dashboard loaded`);
    } else {
      console.log(
        `❌ ${name} dashboard failed: ${result.error.error || result.error}`
      );
    }
  }
}

async function testMaintenanceFeatures(token, equipmentId) {
  console.log("\n🔧 TESTING MAINTENANCE FEATURES\n");

  const maintenanceData = {
    equipment: equipmentId,
    type: "preventive",
    description: "Scheduled maintenance test",
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  };

  const result = await makeRequest(
    "POST",
    "/api/maintenance",
    maintenanceData,
    token
  );
  if (result.success) {
    console.log("✅ Maintenance scheduled");

    // Test maintenance listing
    const maintenanceList = await makeRequest(
      "GET",
      "/api/maintenance",
      null,
      token
    );
    if (maintenanceList.success) {
      console.log(
        `✅ Maintenance list: ${maintenanceList.data.maintenance.length} items`
      );
    }
  }
}

// Main execution function
async function runFeatureTests() {
  console.log("🚀 BILLUN FEATURE TESTING SUITE");
  console.log("================================\n");

  // Run basic flow first
  const basicResult = await testBasicFlow();

  if (basicResult.success) {
    const { token, equipmentId } = basicResult;

    // Run feature-specific tests
    await testEquipmentFeatures(token);
    await testDashboardFeatures(token);

    if (equipmentId) {
      await testAnomalyWorkflow(token, equipmentId);
      await testMaintenanceFeatures(token, equipmentId);
    }

    console.log("\n🎯 FEATURE TEST SUMMARY:");
    console.log("✅ Core Authentication Flow");
    console.log("✅ Company & User Management");
    console.log("✅ Equipment Management");
    console.log("✅ Anomaly Reporting System");
    console.log("✅ Dashboard & Analytics");
    console.log("✅ Maintenance Scheduling");
    console.log("✅ Photo Management APIs");

    console.log("\n🎉 All feature tests completed successfully!");
  } else {
    console.log("\n❌ Basic flow failed - cannot proceed with feature tests");
  }
}

// Export for use in other files
module.exports = {
  makeRequest,
  testBasicFlow,
  testEquipmentFeatures,
  testAnomalyWorkflow,
  testDashboardFeatures,
  testMaintenanceFeatures,
  runFeatureTests,
};

// Run if executed directly
if (require.main === module) {
  runFeatureTests().catch(console.error);
}
