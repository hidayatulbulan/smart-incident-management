require("dotenv").config();

const express = require("express");
const cors = require("cors");

require("./config/database");
const { authenticate } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Smart Incident Management API running" });
});

// Auth routes (no authentication required)
app.use("/api/auth", require("./routes/authRoutes"));

// Protected routes (require authentication)
app.use("/api/incidents", authenticate, require("./routes/incidentRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
