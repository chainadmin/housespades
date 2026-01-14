import * as SecureStore from 'expo-secure-store';
import { apiUrl } from '@/config/api';

const SESSION_COOKIE_KEY = 'session_cookie';
const USER_DATA_KEY = 'user';

// Global auth state manager - allows components to subscribe to auth changes
type AuthStateListener = (isAuthenticated: boolean) => void;
let authStateListeners: AuthStateListener[] = [];

export function subscribeToAuthState(listener: AuthStateListener): () => void {
  authStateListeners.push(listener);
  return () => {
    authStateListeners = authStateListeners.filter(l => l !== listener);
  };
}

function notifyAuthStateChange(isAuthenticated: boolean) {
  authStateListeners.forEach(listener => listener(isAuthenticated));
}

export interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
}

export async function getStoredSessionCookie(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_COOKIE_KEY);
  } catch {
    return null;
  }
}

export async function storeSessionCookie(cookie: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_COOKIE_KEY, cookie);
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const userJson = await SecureStore.getItemAsync(USER_DATA_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

export async function storeUser(user: User): Promise<void> {
  await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
  notifyAuthStateChange(true);
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_COOKIE_KEY);
  await SecureStore.deleteItemAsync(USER_DATA_KEY);
  notifyAuthStateChange(false);
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const sessionCookie = await getStoredSessionCookie();
  
  const headers = new Headers(options.headers);
  if (sessionCookie) {
    headers.set('Cookie', sessionCookie);
  }
  
  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include',
  });
  
  // Handle 401 by clearing auth state and throwing to stop caller execution
  if (response.status === 401) {
    await clearAuth();
    throw new AuthError('Session expired');
  }
  
  return response;
}

// Custom error class for auth failures
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function checkAuthStatus(): Promise<{ isAuthenticated: boolean; user: User | null }> {
  try {
    const sessionCookie = await getStoredSessionCookie();
    const storedUser = await getStoredUser();
    
    // No cookie and no stored user - definitely not authenticated
    if (!sessionCookie && !storedUser) {
      return { isAuthenticated: false, user: null };
    }
    
    // Try to verify with server if we have any auth data
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const headers: HeadersInit = {};
    if (sessionCookie) {
      headers['Cookie'] = sessionCookie;
    }
    
    const response = await fetch(apiUrl('/api/user/profile'), {
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const user = await response.json();
      await storeUser(user);
      return { isAuthenticated: true, user };
    }
    
    // Server rejected - clear all auth data
    await clearAuth();
    return { isAuthenticated: false, user: null };
  } catch (err) {
    // Network error - use cached user if available
    const storedUser = await getStoredUser();
    if (storedUser) {
      notifyAuthStateChange(true);
      return { isAuthenticated: true, user: storedUser };
    }
    notifyAuthStateChange(false);
    return { isAuthenticated: false, user: null };
  }
}

export function extractSessionCookie(response: Response): string | null {
  // Try to get from headers first (works in some environments)
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const match = setCookieHeader.match(/connect\.sid=[^;]+/);
    if (match) {
      return match[0];
    }
  }
  return null;
}

