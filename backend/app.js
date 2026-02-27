const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env"), override: true });
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// serve folder uploads (foto bukti insiden)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// api
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/incidents", require("./routes/incidentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/solver", require("./routes/solverRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

// start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});