/**
 * Authentication Module
 * Handles user login and role-based redirects
 */

const API_URL = "http://localhost:3000/api/auth";

/**
 * Handles user login with role-based redirect
 * Stores token and user info in localStorage
 * Redirects to ../admin/dashboard.html for admin users
 * Redirects to ../user/dashboard.html for regular users
 * 
 * @param {Event} event - Form submission event
 */
async function login(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log("LOGIN RESPONSE:", data);

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    // Store JWT token
    localStorage.setItem("token", data.token);

    // Store user information (including role)
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    // Redirect based on user role
    let redirectUrl = "../user/dashboard.html"; // Default for regular users

    if (data.user && data.user.role === "admin") {
      redirectUrl = "../admin/dashboard.html"; // Redirect admins to admin dashboard
    }

    console.log("Redirecting to:", redirectUrl);
    window.location.href = redirectUrl;

  } catch (err) {
    console.error("Login Error:", err);
    alert("Connection error. Please try again.");
  }
}

/**
 * Logs out the user by clearing localStorage and redirecting to login
 */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../auth/login.html";
}
