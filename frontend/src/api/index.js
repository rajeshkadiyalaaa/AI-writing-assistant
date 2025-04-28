import axios from 'axios';

/**
 * Get the API URL based on environment
 * @returns {string} The API URL
 */
const getApiUrl = () => {
  // First check for explicit REACT_APP_API_URL from environment
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // For production, if no explicit URL is provided, try window.location.origin
  if (process.env.NODE_ENV === 'production') {
    // Check if we're running on the same origin as the API
    return window.location.origin;
  }
  
  // Default for development
  return 'http://localhost:5000';
};

// Create an axios instance with default config
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api; 