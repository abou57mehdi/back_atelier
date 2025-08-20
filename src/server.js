require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./models/db");
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Billun Backend API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "1.0.0",
  });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/companies", require("./routes/companies"));
app.use("/api/sites", require("./routes/sites"));
app.use("/api/workshops", require("./routes/workshops"));
app.use("/api/equipment", require("./routes/equipment"));
app.use("/api/anomalies", require("./routes/anomalies"));
app.use("/api/maintenance", require("./routes/maintenance"));
app.use("/api/partnerships", require("./routes/partnerships"));
app.use("/api/photos", require("./routes/photos"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/workshop", require("./routes/workshop"));
app.use("/api/public", require("./routes/public"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible via http://localhost:${PORT}`);
});
