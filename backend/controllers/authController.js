const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

/**
 * User Registration
 * POST /api/auth/register
 * Body: { name, email, password }
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    //Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    //Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    //Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    //Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    //Hash password with bcrypt (salt rounds: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    //Create new user
    const newUser = await User.create(name, email, hashedPassword);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: newUser
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

/**
 * User Login with Role-Based Response
 * POST /api/auth/login
 * Body: { email, password }
 * Response: { success, message, token, user: { id, name, email, role } }
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //Step 1: Validate input exists
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    //Step 2: Validate input types
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Email and password must be strings"
      });
    }

    //Step 3: Find user in database (includes password for validation)
    const user = await User.findByEmail(email);
    if (!user) {
      //Don't reveal if email exists for security
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    //Step 4: Validate password exists in database
    if (!user.password) {
      console.error(`User ${email} has no password hash in database`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    //Step 5: Compare provided password with hashed password
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
      console.error(`bcrypt error for user ${email}:`, bcryptError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    //Step 6: Create JWT token (includes role for frontend)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role || 'user' // Default to 'user' if role is undefined
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    //Step 7: Remove password from response (never expose password)
    const { password: _, ...userWithoutPassword } = user;

    //Step 8: Send response with role for frontend redirection
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
