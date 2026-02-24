const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const db = require("../config/database");
const User = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

/**
 * User Registration
 * POST /api/auth/register
 * Body: { name, email, password }
 * Saves user to database with hashed password
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create user in database
    const newUser = await User.create(name, email, hashedPassword);

    // Return success with user data (without password)
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: "user"
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * User Login
 * POST /api/auth/login
 * Body: { email, password }
 * Checks database and returns JWT token
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input exists
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Validate input types
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Email and password must be strings"
      });
    }

    // Find user by email in database
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Compare passwords
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Create JWT token with user data
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get User Profile
 * GET /api/auth/profile
 * Requires: Bearer token in Authorization header
 * Returns: User profile data
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_photo: user.profile_photo,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update User Profile
 * PUT /api/auth/profile
 * Requires: Bearer token in Authorization header
 * Body: { name }
 * Updates user name in database
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name must be a non-empty string"
      });
    }

    // Update user name in database
    await User.updateName(userId, name.trim());

    // Get updated user data
    const updatedUser = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update User Profile Photo
 * POST /api/auth/profile/photo
 * Requires: Bearer token in Authorization header, file upload (multipart/form-data, key: "photo")
 * Updates user profile photo filename in database
 */
exports.updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const userId = req.user.id;
    const filename = req.file.filename;

    // Update user profile_photo in database
    await db.query("UPDATE users SET profile_photo = ? WHERE id = ?", [filename, userId]);

    // Get updated user data
    const updatedUser = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      data: {
        profile_photo: updatedUser.profile_photo
      }
    });
  } catch (error) {
    console.error("Update profile photo error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
