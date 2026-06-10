import axios from 'axios';

const api = axios.create({
  withCredentials: true,
});

// Extract CSRF token from cookie and add to request headers
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Request interceptor: Add X-CSRF-Token header for mutations
api.interceptors.request.use((config) => {
  // Only add CSRF token for mutation requests (not GET, HEAD)
  if (!['GET', 'HEAD'].includes(config.method?.toUpperCase())) {
    const csrfToken = getCookie('sims_csrf');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// Response interceptor: Handle 401 by redirecting to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
