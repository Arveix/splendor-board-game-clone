import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { games } from '../store.js';
import type { GameSession } from '../models/GameSession.js';

export interface GameActionRequest extends AuthenticatedRequest {
  game?: GameSession;
}

/**
 * Middleware that validates:
 * 1. The game session exists (404 if not found).
 * 2. The game is in 'active' status (400 if not active).
 * 3. The authenticated user is the currently active player (403 if not active player).
 *
 * Attaches the retrieved `game` instance to `req.game` for downstream handlers.
 */
export function validateActivePlayer(req: GameActionRequest, res: Response, next: NextFunction): void {
  const raw = req.params.id;
  const gameId = Array.isArray(raw) ? raw[0] : String(raw);
  const game = games.get(gameId);

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  if (game.status !== 'active') {
    res.status(400).json({ error: 'Game is not active' });
    return;
  }

  const userSession = req.userSession;
  if (!userSession || game.activePlayer?.id !== userSession.sessionId) {
    res.status(403).json({ error: 'Only the active player can perform this action' });
    return;
  }

  req.game = game;
  next();
}
