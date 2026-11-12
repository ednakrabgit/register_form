// Centralized API Configuration for Viriyah Registration System
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';
const isCloudRunFrontend = hostname.endsWith('.run.app');

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  isLocalDev
    ? 'http://localhost:8085/api'
    : (isCloudRunFrontend
        ? 'https://register-backend-779142529105.us-central1.run.app/api'
        : '/api')
);

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? (
  isLocalDev
    ? 'http://localhost:8085'
    : (isCloudRunFrontend
        ? 'https://register-backend-779142529105.us-central1.run.app'
        : '')
);
