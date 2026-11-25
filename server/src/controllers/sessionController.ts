import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { games, userSessions } from '../store.js';
import type { UserSession } from '../types.js';

// POST /api/session - Initialize a new User Session with username
export function createSession(req: Request, res: Response): void {
  const { username } = req.body;
  const cleanUsername = String(username || '').trim();

  if (!cleanUsername) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  // Check for duplicate username (case-insensitive)
  const isDuplicate = Array.from(userSessions.values()).some(
    (s) => s.username.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (isDuplicate) {
    res.status(409).json({ error: 'Username is already taken' });
    return;
  }

  // Create new active session on the server
  const newSessionId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newSession: UserSession = {
    sessionId: newSessionId,
    username: cleanUsername,
    currentGameSessionId: null,
    createdAt: Date.now(),
  };

  userSessions.set(newSessionId, newSession);
  res.status(201).json(newSession);
}

// GET /api/session/me - Verify and retrieve the active user session using session ID token
export function getCurrentSession(req: AuthenticatedRequest, res: Response): void {
  const userSession = req.userSession!;

  // If session is associated with a game, check if that game exists.
  // If the game does not exist anymore, remove the game session ID from the user session.
  if (userSession.currentGameSessionId && !games.has(userSession.currentGameSessionId)) {
    userSession.currentGameSessionId = null;
  }

  res.json(userSession);
}
