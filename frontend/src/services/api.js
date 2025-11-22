import axios from 'axios';

// Point to your Django Backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// --- AUTHENTICATION ---

/**
 * Register a new user
 * @param {object} userData - { username, email, password }
 */
export const signupUser = async (userData) => {
  try {
    // POST to http://127.0.0.1:8000/api/auth/signup/
    const response = await axios.post(`${API_BASE_URL}/auth/signup/`, userData);
    return response.data;
  } catch (error) {
    // Return the specific error message from Django (like "Username taken")
    throw error.response ? error.response.data : error.message;
  }
};

/**
 * Login a user
 * @param {object} credentials - { username, password }
 */
export const loginUser = async (credentials) => {
  try {
    // POST to http://127.0.0.1:8000/api/auth/login/
    const response = await axios.post(`${API_BASE_URL}/auth/login/`, credentials);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// --- AI FEATURES ---

export const getWelcomeMessage = async (username) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/generate-welcome/`, {
      params: { username }
    });
    return response.data.message;
  } catch (error) {
    console.error("API Error:", error);
    return "Every great journey begins with a single step of curiosity.";
  }
};