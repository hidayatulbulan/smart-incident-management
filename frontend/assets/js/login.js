/**
 * Login Handler
 * Handles user authentication with full backend URL
 * Works with Express static serving
 */

// Full backend URL
const LOGIN_URL = 'http://localhost:3000/api/auth/login';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const errorDiv = document.getElementById('error');
  const spinner = document.getElementById('spinner');
  const btnText = document.querySelector('.btn-text');
  const loginBtn = document.getElementById('loginBtn');

  if (!loginForm) {
    console.error('Login form not found');
    return;
  }

  loginForm.addEventListener('submit', handleLogin);

  async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Validate inputs
    if (!email || !password) {
      showError('Email and password are required');
      return;
    }

    // Clear previous errors and show loading state
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    loginBtn.disabled = true;
    spinner.style.display = 'block';
    btnText.style.display = 'none';

    try {
      console.log('Attempting login to:', LOGIN_URL);

      // Fetch from backend
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Response status:', response.status);

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response format from server');
      }

      // Handle non-200 responses
      if (!response.ok) {
        const errorMessage = data.message || data.error || `Login failed (${response.status})`;
        console.error('Login error:', errorMessage);
        throw new Error(errorMessage);
      }

      // Validate response has token
      if (!data.token) {
        throw new Error(data.message || 'No token received from server');
      }

      // Save token to localStorage
      localStorage.setItem('token', data.token);
      console.log('Token saved successfully');

      // Save user info if provided
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('User info saved to localStorage:', {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        });
        console.log('Verification - Reading from localStorage:', JSON.parse(localStorage.getItem('user')));
      }

      // Determine redirect URL based on role
      let redirectUrl = '../user/dashboard.html';
      console.log('=== ROLE-BASED REDIRECT DEBUG ===');
      console.log('data.user object:', data.user);
      console.log('data.user.role:', data.user?.role);
      console.log('Role type:', typeof data.user?.role);
      
      if (data.user && data.user.role?.toLowerCase() === 'admin') {
        redirectUrl = '../admin/dashboard.html';
        console.log('Detected ADMIN role → redirecting to admin dashboard');
      } else if (data.user && data.user.role?.toLowerCase() === 'solver') {
        redirectUrl = '../solver/dashboard.html';
        console.log('Detected SOLVER role → redirecting to solver dashboard');
      } else {
        console.log('Default USER role → redirecting to user dashboard');
      }

      console.log('Final redirect URL:', redirectUrl);
      console.log('=== END DEBUG ===');
      window.location.href = redirectUrl;

    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';

      if (error instanceof TypeError) {
        // Network error - fetch failed to reach server
        errorMessage = 'Failed to connect to server. Ensure http://localhost:3000 is running';
        console.error('Network error:', error.message);
        alert(errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
        console.error('Login error:', errorMessage);
      }

      console.error('Full error details:', error);
      showError(errorMessage);

    } finally {
      // CRITICAL: Always stop loading state
      loginBtn.disabled = false;
      spinner.style.display = 'none';
      btnText.style.display = 'block';
    }
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
});

/**
 * Mock social login message
 */
function showMockMessage(provider) {
  const footer = document.querySelector('.footer-text');
  footer.innerHTML = `<span style="color:#0052D4">${provider} login is visual only.</span>`;
  setTimeout(() => {
    footer.innerHTML = 'Don\'t have an account? <a href="signup.html">Sign up here</a>';
  }, 2000);
}
