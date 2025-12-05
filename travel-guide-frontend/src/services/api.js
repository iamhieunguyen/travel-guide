import axios from 'axios';

// Multi-stack API URLs
const API_URLS = {
  article: (process.env.REACT_APP_ARTICLE_API_URL || process.env.REACT_APP_API_BASE || '').replace(/\/+$/, ''),
  auth: (process.env.REACT_APP_AUTH_API_URL || process.env.REACT_APP_API_BASE || '').replace(/\/+$/, ''),
  gallery: (process.env.REACT_APP_GALLERY_API_URL || process.env.REACT_APP_API_BASE || '').replace(/\/+$/, ''),
};

// Default API instance (for backward compatibility - points to Auth API)
const api = axios.create({
  baseURL: API_URLS.auth,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('idToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log('🔐 401 Unauthorized - Session expired');
      // Dispatch custom event for session expiry
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    return Promise.reject(error);
  }
);

// Export API URLs for other services
export { API_URLS };
export default api;
