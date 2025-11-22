// frontend/src/services/api.js

// IMPORTANT: The import axios from 'axios' MUST be deleted.

// Use a global variable to reference the CDN-loaded axios instance
const axiosInstance = window.axios; 

// Point to your Django Backend
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// --- AUTHENTICATION ---

export const signupUser = async (userData) => {
  try {
    // Calls axiosInstance, not the local import
    const response = await axiosInstance.post(`${API_BASE_URL}/auth/signup/`, userData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const loginUser = async (credentials) => {
  try {
    // Calls axiosInstance, not the local import
    const response = await axiosInstance.post(`${API_BASE_URL}/auth/login/`, credentials);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// --- AI FEATURES ---

export const getWelcomeMessage = async (username) => {
  try {
    // Calls axiosInstance, not the local import
    const response = await axiosInstance.get(`${API_BASE_URL}/generate-welcome/`, {
      params: { username }
    });
    return response.data.message;
  } catch (error) {
    console.error("API Error:", error);
    return "Every great journey begins with a single step of curiosity.";
  }
};