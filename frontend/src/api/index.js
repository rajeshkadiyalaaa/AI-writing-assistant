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
const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Define API methods that match what's being called in the components
const api = {
  // Core axios methods
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
  
  // Application-specific API methods
  verifyModel: (data) => axiosInstance.post('/api/verify-model', data),
  settingsApikey: (data) => {
    if (data && data.apiKey) {
      return axiosInstance.post('/api/settings/apikey', data);
    } else {
      return axiosInstance.get('/api/settings/apikey');
    }
  },
  generate: (data) => axiosInstance.post('/api/generate', data),
  suggestions: (data) => axiosInstance.post('/api/suggestions', data),
  improve: (data) => axiosInstance.post('/api/improve', data),
  
  // Utility method to get the base URL
  getBaseUrl: () => getApiUrl()
};

export default api; 