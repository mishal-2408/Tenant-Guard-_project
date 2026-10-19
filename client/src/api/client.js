import axios from 'axios';

/**
 * Helper to safely extract a non-httpOnly cookie (such as XSRF-TOKEN) in the browser
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// Base URL defaults to '/api' (proxied via Vite in dev) or VITE_API_BASE_URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Pre-configured Axios instance
 * Configured with withCredentials: true to automatically transmit httpOnly session cookies
 */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request Interceptor: Attach Double-Submit Anti-CSRF Token for state-changing operations
apiClient.interceptors.request.use(
  (config) => {
    const method = (config.method || 'get').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie('XSRF-TOKEN');
      if (csrfToken) {
        config.headers['x-xsrf-token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format uniform error envelopes
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const responseData = error.response?.data;
    const errorEnvelope = {
      status: error.response?.status || 500,
      code: responseData?.error?.code || 'API_REQUEST_ERROR',
      message: responseData?.error?.message || 'Unable to communicate with the server.',
      details: responseData?.error?.details || []
    };
    return Promise.reject(errorEnvelope);
  }
);

export default apiClient;
