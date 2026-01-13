// API configuration for mobile app
// Uses Railway production backend

export const API_BASE_URL = 'https://housespades-production.up.railway.app';

export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;

// WebSocket URL for real-time gameplay
export const WS_BASE_URL = 'wss://housespades-production.up.railway.app';
