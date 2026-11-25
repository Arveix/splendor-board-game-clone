// Backend server URL
export const BACKEND_URL =
  ((import.meta.env.BACKEND_URL || import.meta.env.VITE_BACKEND_URL) as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:3000';

export const API_BASE = `${BACKEND_URL}/api`;
