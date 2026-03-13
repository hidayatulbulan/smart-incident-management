const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

// Multer configuration for profile photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, "profile-" + req.user?.id + "-" + Date.now() + path.extname(file.originalname))
});
const uploadPhoto = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// POST routes (correct HTTP methods)
router.post("/register", auth.register);
router.post("/login", auth.login);

// Profile routes
router.get("/profile", authenticate, auth.getProfile);
router.put("/profile", authenticate, auth.updateProfile);
router.post("/profile/photo", authenticate, uploadPhoto.single("photo"), auth.updateProfilePhoto);
router.put("/change-password", authenticate, auth.changePassword);

// GET route for browser testing only (remove in production)
router.get("/login", (req, res) => {
  res.json({
    success: false,
    message: "Use POST method. Example: POST http://localhost:3000/api/auth/login with body {\"email\": \"test@example.com\", \"password\": \"password123\"}",
    info: "For browser testing, use the fetch example in the frontend"
  });
});

module.exports = router;
