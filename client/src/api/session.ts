import type { UserSession } from '../types';
import { API_BASE } from './config';

/**
 * Initialize a new User Session with username
 * POST /api/session
 */
export async function createSessionApi(username: string): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = Object.assign(new Error(errorData.error || 'Server session initialization failed'), {
      status: res.status,
    });
    throw err;
  }

  return res.json();
}

/**
 * Verify and retrieve the active user session using session ID token
 * GET /api/session/me
 */
export async function getCurrentSessionApi(sessionId: string): Promise<Response> {
  return fetch(`${API_BASE}/session/me`, {
    headers: {
      'x-session-id': sessionId,
    },
  });
}
