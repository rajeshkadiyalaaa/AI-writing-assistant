import axios from 'axios';

// Get the API URL based on environment
const getApiUrl = () => {
  // In production, use relative API paths (since frontend & backend are served together)
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // In development, use environment variable or default localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

// Create API client with base URL
const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response ? {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    } : error.message);
    return Promise.reject(error);
  }
);

export default apiClient; 