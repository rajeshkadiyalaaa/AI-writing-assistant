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

// Enhanced API client with wrapper functions
const api = {
  // Axios instance
  axiosInstance,
  
  // Base HTTP methods
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  put: (url, data, config) => axiosInstance.put(url, data, config),
  delete: (url, config) => axiosInstance.delete(url, config),
  
  // App-specific methods
  verifyModel: (data) => axiosInstance.post('/api/verify-model', data),
  settingsApikey: (data) => {
    // GET request if no data is provided
    if (!data) {
      return axiosInstance.get('/api/settings/apikey');
    }
    // POST request with data
    return axiosInstance.post('/api/settings/apikey', data);
  },
  generate: (data) => axiosInstance.post('/api/generate', data),
  suggestions: (data) => axiosInstance.post('/api/suggestions', data),
  improve: (data) => axiosInstance.post('/api/improve', data),
  chat: (data) => axiosInstance.post('/api/chat', data),
  models: () => axiosInstance.get('/api/models'),
};

export default api; 