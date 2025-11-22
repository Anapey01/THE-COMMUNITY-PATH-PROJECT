// frontend/static/js/auth.js

// --- CONFIGURATION ---
const API_BASE_URL = 'http://127.0.0.1:8000/api'; 
const MESSAGE_CONTAINER = document.getElementById('messageContainer');


// --- HELPER FUNCTIONS ---

function displayMessage(message, isError = false) {
    // Ensure the container exists before clearing/adding content
    if (!MESSAGE_CONTAINER) return;

    // Clear previous messages first
    MESSAGE_CONTAINER.innerHTML = ''; 
    
    MESSAGE_CONTAINER.innerHTML = `
        <div class="flash-message ${isError ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'} px-4 py-3 rounded-lg text-center font-medium" role="alert">
            ${message}
        </div>
    `;
}

function saveTokenAndRedirect(token, username) {
    // 1. Save the token and username to Local Storage
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', username);
    
    // 2. Redirect to the dashboard (main.html)
    // FIX: Using './main.html' is the most robust relative path from within the /html/ directory
    window.location.href = './main.html'; 
}

// --- DASHBOARD AND LOGOUT LOGIC ---

function handleLogout() {
    // Clear token and redirect to login
    localStorage.removeItem('authToken');
    localStorage.removeItem('username');
    // FIX: Use simple relative path for login.html
    window.location.href = './login.html';
}

function checkAuthOnDashboard() {
    const token = localStorage.getItem('authToken');
    const username = localStorage.getItem('username');
    const welcomeSpan = document.getElementById('welcome-username');

    if (!token) {
        // If no token, force redirect to login page
        window.location.href = './login.html';
    } else if (welcomeSpan) {
        // If token exists, personalize the welcome message
        welcomeSpan.textContent = username;
    }

    // Attach logout handler
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

// Check if we are on the dashboard page and run the authentication check
if (window.location.pathname.includes('main.html')) {
    checkAuthOnDashboard();
}

// --- LOGIN LOGIC ---

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the default form reload
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Clear previous error messages
        displayMessage('Logging in...');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // SUCCESS: Save token and redirect
                saveTokenAndRedirect(data.token, data.username);
            } else {
                // FAILURE: Display API error message
                const errorMessage = data.error || data.detail || 'Login failed. Invalid response from server.';
                displayMessage(errorMessage, true);
            }
        } catch (error) {
            // This catches actual network errors (CORS, server down, etc.)
            console.error('Login Error:', error);
            displayMessage('A network error occurred. Check your server connection.', true);
        }
    });
}


// --- SIGNUP LOGIC ---

const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        displayMessage('Creating account...');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // SUCCESS: Save token and redirect
                saveTokenAndRedirect(data.token, data.user.username);
            } else {
                // FAILURE: Handle validation errors
                let errorMessage = 'Signup failed.';
                if (data.username) {
                    errorMessage = `Username error: ${data.username[0]}`;
                } else if (data.password) {
                     errorMessage = `Password error: ${data.password[0]}`;
                } else if (data.error) {
                     errorMessage = data.error;
                }
                
                displayMessage(errorMessage, true);
            }
        } catch (error) {
            console.error('Signup Error:', error);
            displayMessage('A network error occurred. Check your server connection.', true);
        }
    });
}