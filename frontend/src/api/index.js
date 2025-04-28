import axios from 'axios';

// Get the API URL from environment variables or use relative path in production
const getApiUrl = () => {
  // In production, use relative API paths (handled by the backend proxy)
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  // In development, use the environment variable or default localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
}); 