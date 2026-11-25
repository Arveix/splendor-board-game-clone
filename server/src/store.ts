import type { GameSession } from './models/GameSession.js';
import type { UserSession } from './types.js';

// In-Memory Storage (no database)
export const userSessions = new Map<string, UserSession>();
export const games = new Map<string, GameSession>();

// Cleanup stale sessions older than 24 hours that have no active game
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function cleanupStaleSessions(): void {
  const now = Date.now();
  for (const [id, session] of userSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS && !session.currentGameSessionId) {
      userSessions.delete(id);
    }
  }
}
