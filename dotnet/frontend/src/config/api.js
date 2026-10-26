// Centralized API Configuration for Viriyah Registration System
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8085/api'
    : 'https://register-backend-779142529105.us-central1.run.app/api'
);

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8085'
    : 'https://register-backend-779142529105.us-central1.run.app'
);
