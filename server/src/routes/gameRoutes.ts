import { type Response, Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.js';
import { GameSession } from '../models/GameSession.js';
import { Player } from '../models/Player.js';
import { games } from '../store.js';
import { broadcastGameUpdate } from '../websocket.js';

const router = Router();

// Apply authMiddleware to all game routes
router.use(authMiddleware);

function getParamId(req: AuthenticatedRequest): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : String(raw);
}

// GET /api/games - List all available games
router.get('/', (_req: AuthenticatedRequest, res: Response) => {
  const list = Array.from(games.values())
    .filter((g) => g.status !== 'completed')
    .map((g) => g.toJSON());
  res.json(list);
});

// POST /api/games - Create a new game session
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const userSession = req.userSession!;
  const { name, maxPlayers } = req.body;

  const gameName = String(name || `${userSession.username}'s Guild`).trim();
  const hostPlayer = new Player(userSession.sessionId, userSession.username);

  const game = new GameSession(gameName, hostPlayer, Number(maxPlayers) || 4);
  games.set(game.id, game);

  // Attach current game session ID to the user's active session
  userSession.currentGameSessionId = game.id;

  res.status(201).json(game.toJSON());
});

// GET /api/games/:id - Get a specific game session
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const gameId = getParamId(req);
  const game = games.get(gameId);

  // If the game does not exist anymore, remove the associated game session ID from the user session
  if (!game) {
    if (req.userSession && req.userSession.currentGameSessionId === gameId) {
      req.userSession.currentGameSessionId = null;
    }
    return res.status(404).json({ error: 'Game not found or has been discarded' });
  }

  res.json(game.toJSON());
});

// POST /api/games/:id/join - Join a game session
router.post('/:id/join', (req: AuthenticatedRequest, res: Response) => {
  const userSession = req.userSession!;
  const game = games.get(getParamId(req));

  if (!game) {
    return res.status(404).json({ error: 'Game not found or has been discarded' });
  }

  // If already in this game
  const existingPlayer = game.players.find((p) => p.id === userSession.sessionId);
  if (existingPlayer) {
    userSession.currentGameSessionId = game.id;
    return res.json({ game: game.toJSON(), userSession });
  }

  const newPlayer = new Player(userSession.sessionId, userSession.username);
  const result = game.addPlayer(newPlayer);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Attach current game session ID to user's active session
  userSession.currentGameSessionId = game.id;

  // Broadcast updated game state to all connected WebSocket clients
  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: game.toJSON(),
  });

  res.json({ game: game.toJSON(), userSession });
});

// POST /api/games/:id/leave - Leave a game session
router.post('/:id/leave', (req: AuthenticatedRequest, res: Response) => {
  const userSession = req.userSession!;
  const gameId = getParamId(req);
  const game = games.get(gameId);

  if (game) {
    game.removePlayer(userSession.sessionId);
    // If lobby is now empty, discard game session
    if (game.players.length === 0) {
      games.delete(gameId);
      broadcastGameUpdate(gameId, { type: 'GAME_DISCARDED', gameId });
    } else {
      broadcastGameUpdate(gameId, {
        type: 'GAME_UPDATED',
        game: game.toJSON(),
      });
    }
  }

  // Remove current game session ID from user's active session
  userSession.currentGameSessionId = null;

  res.json({ success: true, userSession });
});

// POST /api/games/:id/start - Start a game session (only host can start)
router.post('/:id/start', (req: AuthenticatedRequest, res: Response) => {
  const userSession = req.userSession!;
  const game = games.get(getParamId(req));
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Only the host of the game should be able to start the game
  if (userSession.username !== game.hostUsername) {
    return res.status(403).json({ error: 'Only the host of the game can start the game' });
  }

  if (game.players.length < 2) {
    return res.status(400).json({ error: 'At least 2 players are required to start the game' });
  }

  const { gemTokenCount, goldTokenCount, faceUpCardsCount, nobleTilesCount } = req.body || {};
  game.startGame({
    gemTokenCount: typeof gemTokenCount === 'number' ? gemTokenCount : undefined,
    goldTokenCount: typeof goldTokenCount === 'number' ? goldTokenCount : undefined,
    faceUpCardsCount: typeof faceUpCardsCount === 'number' ? faceUpCardsCount : undefined,
    nobleTilesCount: typeof nobleTilesCount === 'number' ? nobleTilesCount : undefined,
  });

  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: game.toJSON(),
  });

  res.json({ game: game.toJSON() });
});

// POST /api/games/:id/end-turn - End current player's turn and switch active player to next player
router.post('/:id/end-turn', (req: AuthenticatedRequest, res: Response) => {
  const game = games.get(getParamId(req));
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.status !== 'active') {
    return res.status(400).json({ error: 'Game is not active' });
  }

  game.endTurn();

  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: game.toJSON(),
  });

  res.json({ game: game.toJSON() });
});

// DELETE /api/games/:id - Discard game session entirely
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const gameId = getParamId(req);
  const existed = games.delete(gameId);
  if (!existed) {
    return res.status(404).json({ error: 'Game not found' });
  }

  broadcastGameUpdate(gameId, { type: 'GAME_DISCARDED', gameId });

  res.json({ message: 'Game entirely discarded from memory' });
});

export default router;
