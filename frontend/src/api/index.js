import axios from 'axios';
import { normalizeError, formatApiError as formatError } from '../lib/errors';

/**
 * API base URL:
 * - REACT_APP_API_URL if set (e.g. http://localhost:5001)
 * - dev: empty string → CRA proxy in package.json forwards /api to backend
 * - prod: same origin as the served app
 */
export const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  return window.location.origin;
};

/** @deprecated use formatApiError from lib/errors — re-exported for compatibility */
export const formatApiError = formatError;

const axiosInstance = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const key = localStorage.getItem('openrouter_api_key') || sessionStorage.getItem('openrouter_api_key');
    if (key) {
      config.headers['X-User-API-Key'] = key;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeError(error))
);

const api = {
  axiosInstance,
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, data, config) => axiosInstance.post(url, data, config),
  health: () => axiosInstance.get('/api/health'),
  verifyApiKey: (data) => axiosInstance.post('/api/verify-apikey', data),
  verifyModel: (data) => axiosInstance.post('/api/verify-model', data),
  settingsApikey: (data) => (
    data ? axiosInstance.post('/api/settings/apikey', data) : axiosInstance.get('/api/settings/apikey')
  ),
  generate: (data, config) => axiosInstance.post('/api/generate', data, config),
  suggestions: (data, config) => axiosInstance.post('/api/suggestions', data, config),
  improve: (data, config) => axiosInstance.post('/api/improve', data, config),
  models: (config) => axiosInstance.get('/api/models', config),
  refreshModels: (data, config) => axiosInstance.post('/api/models/refresh', data, config),
  getAuthKeyInfo: (config) => axiosInstance.get('/api/auth/key', config),
};

export default api;
