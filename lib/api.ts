import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '') + '/api';

// Create Axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      const { getSession } = await import('next-auth/react');
      const session = await getSession() as any; // Temporary any type until we fix the session type
      
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      } else if (session?.user?.token) {
        // Fallback to user.token if available
        config.headers.Authorization = `Bearer ${session.user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { getSession } = await import('next-auth/react');
        const session = await getSession() as any; // Temporary any type until we fix the session type
        
        if (session?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
          return api(originalRequest);
        } else if (session?.user?.token) {
          // Fallback to user.token if available
          originalRequest.headers.Authorization = `Bearer ${session.user.token}`;
          return api(originalRequest);
        }
      } catch (error) {
        console.error('Error refreshing token:', error);
        // Redirect to login or handle error
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/signin';
        }
      }
    }

    // Handle other errors
    if (error.response) {
      // Server responded with a status code outside 2xx
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config.url,
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response from server:', error.request);
    } else {
      // Something else happened while setting up the request
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export { api };
