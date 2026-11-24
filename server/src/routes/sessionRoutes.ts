import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js';
import { games, userSessions } from '../store.js';
import type { UserSession } from '../types.js';

const router = Router();

// POST /api/session - Initialize a new User Session with username
router.post('/', (req, res) => {
  const { username } = req.body;
  const cleanUsername = String(username || '').trim();

  if (!cleanUsername) {
    return res.status(400).json({ error: 'Username is required' });
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
});

// GET /api/session/me - Verify and retrieve the active user session using session ID token
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  const userSession = req.userSession!;

  // If session is associated with a game, check if that game exists.
  // If the game does not exist anymore, remove the game session ID from the user session.
  if (userSession.currentGameSessionId && !games.has(userSession.currentGameSessionId)) {
    userSession.currentGameSessionId = null;
  }

  res.json(userSession);
});

// GET /api/session/:id - Get session by ID (admin/debug)
router.get('/:id', authMiddleware, (req, res) => {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : String(rawId);
  const session = userSessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

export default router;
