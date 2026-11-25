import type { UserSession } from '../types';

export const STORAGE_USERNAME_KEY = 'splendor_username';
export const STORAGE_SESSION_ID_KEY = 'splendor_session_id';
export const STORAGE_CURRENT_GAME_KEY = 'splendor_current_game_id';

/**
 * Retrieve persisted user session from local storage upon app startup
 */
export function getStoredSession(): UserSession | null {
  try {
    const storedName = localStorage.getItem(STORAGE_USERNAME_KEY);
    const storedId = localStorage.getItem(STORAGE_SESSION_ID_KEY);
    const storedGameId = localStorage.getItem(STORAGE_CURRENT_GAME_KEY);

    if (storedName && storedName.trim() && storedId && storedId.trim()) {
      return {
        username: storedName.trim(),
        sessionId: storedId.trim(),
        currentGameSessionId: storedGameId && storedGameId.trim() ? storedGameId.trim() : null,
        createdAt: Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist active session credentials to local storage
 */
export function saveStoredSession(session: UserSession): void {
  try {
    localStorage.setItem(STORAGE_USERNAME_KEY, session.username);
    localStorage.setItem(STORAGE_SESSION_ID_KEY, session.sessionId);
    if (session.currentGameSessionId) {
      localStorage.setItem(STORAGE_CURRENT_GAME_KEY, session.currentGameSessionId);
    } else {
      localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
    }
  } catch {
    // Ignore storage quota / access issues (e.g. private browsing mode)
  }
}

/**
 * Update or clear the current active game session ID in local storage
 */
export function updateStoredGameId(gameId: string | null): void {
  try {
    if (gameId && gameId.trim()) {
      localStorage.setItem(STORAGE_CURRENT_GAME_KEY, gameId.trim());
    } else {
      localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
    }
  } catch {
    // Ignore storage issues
  }
}

/**
 * Clear all persisted session data upon invalidation or logout
 */
export function clearStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_USERNAME_KEY);
    localStorage.removeItem(STORAGE_SESSION_ID_KEY);
    localStorage.removeItem(STORAGE_CURRENT_GAME_KEY);
  } catch {
    // Ignore storage issues
  }
}
