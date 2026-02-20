const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

// POST routes (correct HTTP methods)
router.post("/register", auth.register);
router.post("/login", auth.login);

// GET route for browser testing only (remove in production)
router.get("/login", (req, res) => {
  res.json({
    success: false,
    message: "Use POST method. Example: POST http://localhost:3000/api/auth/login with body {\"email\": \"test@example.com\", \"password\": \"password123\"}",
    info: "For browser testing, use the fetch example in the frontend"
  });
});

module.exports = router;
