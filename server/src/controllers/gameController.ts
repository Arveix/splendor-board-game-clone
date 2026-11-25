import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { GameActionRequest } from '../middleware/gameValidation.js';
import { GameSession } from '../models/GameSession.js';
import { Player } from '../models/Player.js';
import { games, userSessions } from '../store.js';
import { broadcastGameUpdate } from '../websocket.js';

function getParamId(req: AuthenticatedRequest): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : String(raw);
}

const turnTimers = new Map<string, NodeJS.Timeout>();

export function resetTurnTimer(game: GameSession): void {
  const existing = turnTimers.get(game.id);
  if (existing) {
    clearTimeout(existing);
    turnTimers.delete(game.id);
  }

  if (game.status !== 'active' || !game.settings?.turnDurationSeconds) {
    return;
  }

  const durationSeconds = game.currentTurnDuration ?? game.settings?.turnDurationSeconds ?? 90;
  const durationMs = durationSeconds * 1000;
  const timer = setTimeout(() => {
    turnTimers.delete(game.id);
    if (game.status === 'active') {
      game.endTurn();
      broadcastGameUpdate(game.id, {
        type: 'GAME_UPDATED',
        game: game.toJSON(),
      });
      resetTurnTimer(game);
    }
  }, durationMs);

  turnTimers.set(game.id, timer);
}

export function clearGameTurnTimer(gameId: string): void {
  const existing = turnTimers.get(gameId);
  if (existing) {
    clearTimeout(existing);
    turnTimers.delete(gameId);
  }
}

function sendGameUpdate(game: GameSession, res: Response): void {
  resetTurnTimer(game);
  const data = game.toJSON();
  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: data,
  });
  res.json({ game: data });
}

// GET /api/games - List all available games
export function listGames(_req: AuthenticatedRequest, res: Response): void {
  const list = Array.from(games.values())
    .filter((g) => g.status !== 'completed')
    .map((g) => g.toJSON());
  res.json(list);
}

// POST /api/games - Create a new game session
export function createGame(req: AuthenticatedRequest, res: Response): void {
  const userSession = req.userSession!;
  const { name, maxPlayers, winPoints } = req.body;

  const gameName = String(name || `${userSession.username}'s Guild`).trim();
  const hostPlayer = new Player(userSession.sessionId, userSession.username);

  const game = new GameSession(
    gameName,
    hostPlayer,
    Number(maxPlayers) || 4,
    typeof winPoints === 'number' ? winPoints : 15
  );
  games.set(game.id, game);

  // Attach current game session ID to the user's active session
  userSession.currentGameSessionId = game.id;

  res.status(201).json(game.toJSON());
}

// GET /api/games/:id - Get a specific game session
export function getGame(req: AuthenticatedRequest, res: Response): void {
  const gameId = getParamId(req);
  const game = games.get(gameId);

  // If the game does not exist anymore, remove the associated game session ID from the user session
  if (!game) {
    if (req.userSession && req.userSession.currentGameSessionId === gameId) {
      req.userSession.currentGameSessionId = null;
    }
    res.status(404).json({ error: 'Game not found or has been discarded' });
    return;
  }

  res.json(game.toJSON());
}

// POST /api/games/:id/join - Join a game session
export function joinGame(req: AuthenticatedRequest, res: Response): void {
  const userSession = req.userSession!;
  const game = games.get(getParamId(req));

  if (!game) {
    res.status(404).json({ error: 'Game not found or has been discarded' });
    return;
  }

  // If already in this game
  const existingPlayer = game.players.find((p) => p.id === userSession.sessionId);
  if (existingPlayer) {
    userSession.currentGameSessionId = game.id;
    res.json({ game: game.toJSON(), userSession });
    return;
  }

  const newPlayer = new Player(userSession.sessionId, userSession.username);
  const result = game.addPlayer(newPlayer);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  // Attach current game session ID to user's active session
  userSession.currentGameSessionId = game.id;

  // Broadcast updated game state to all connected WebSocket clients
  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: game.toJSON(),
  });

  res.json({ game: game.toJSON(), userSession });
}

// POST /api/games/:id/remove-player - Remove a player from game session (host kicking or player leaving)
export function removePlayer(req: AuthenticatedRequest, res: Response): void {
  const requesterSession = req.userSession!;
  const gameId = getParamId(req);
  const game = games.get(gameId);

  if (!game) {
    if (requesterSession.currentGameSessionId === gameId) {
      requesterSession.currentGameSessionId = null;
    }
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  // Target player defaults to requester if not specified in body
  const targetPlayerId = String(req.body?.playerId || requesterSession.sessionId);

  const targetPlayer = game.players.find((p) => p.id === targetPlayerId);
  if (!targetPlayer) {
    res.status(404).json({ error: 'Player not found in game session' });
    return;
  }

  const hostPlayer = game.players.find((p) => p.name === game.hostUsername);
  const isHost = requesterSession.sessionId === hostPlayer?.id;
  const isSelf = requesterSession.sessionId === targetPlayerId;

  // The request is permitted in two cases:
  // 1. User sending request is the host of the lobby
  // 2. User sending request is removing themselves
  if (!isHost && !isSelf) {
    res.status(403).json({ error: 'Only the host or the player themselves can remove a player from the game' });
    return;
  }

  // Host cannot kick themselves unless they are leaving their own game
  if (isHost && !isSelf && targetPlayerId === hostPlayer?.id) {
    res.status(400).json({ error: 'Host cannot kick themselves' });
    return;
  }

  // Remove the player
  game.removePlayer(targetPlayerId);

  // Clear target player's session reference
  const targetSession = userSessions.get(targetPlayerId);
  if (targetSession && targetSession.currentGameSessionId === gameId) {
    targetSession.currentGameSessionId = null;
  }

  // If lobby is now empty, discard game session
  if (game.players.length === 0) {
    games.delete(gameId);
    broadcastGameUpdate(gameId, { type: 'GAME_DISCARDED', gameId });
  } else {
    broadcastGameUpdate(gameId, {
      type: 'GAME_UPDATED',
      game: game.toJSON(),
      removedPlayerId: targetPlayerId,
    });
  }

  res.json({ success: true, userSession: requesterSession });
}

// POST /api/games/:id/start - Start a game session (only host can start)
export function startGame(req: AuthenticatedRequest, res: Response): void {
  const userSession = req.userSession!;
  const game = games.get(getParamId(req));
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  // Only the host of the game should be able to start the game
  if (userSession.username !== game.hostUsername) {
    res.status(403).json({ error: 'Only the host of the game can start the game' });
    return;
  }

  if (game.players.length < 2) {
    res.status(400).json({ error: 'At least 2 players are required to start the game' });
    return;
  }

  const { gemTokenCount, goldTokenCount, faceUpCardsCount, nobleTilesCount, winPoints, turnDurationSeconds } = req.body || {};
  game.startGame({
    gemTokenCount: typeof gemTokenCount === 'number' ? gemTokenCount : undefined,
    goldTokenCount: typeof goldTokenCount === 'number' ? goldTokenCount : undefined,
    faceUpCardsCount: typeof faceUpCardsCount === 'number' ? faceUpCardsCount : undefined,
    nobleTilesCount: typeof nobleTilesCount === 'number' ? nobleTilesCount : undefined,
    winPoints: typeof winPoints === 'number' ? winPoints : undefined,
    turnDurationSeconds: typeof turnDurationSeconds === 'number' ? turnDurationSeconds : undefined,
  });

  resetTurnTimer(game);

  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: game.toJSON(),
  });

  res.json({ game: game.toJSON() });
}

// POST /api/games/:id/rematch - Reset game session to waiting lobby for a rematch
export function rematchGame(req: AuthenticatedRequest, res: Response): void {
  const userSession = req.userSession!;
  const game = games.get(getParamId(req));

  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }

  // Ensure requester is one of the players in this game
  const isPlayer = game.players.some((p) => p.id === userSession.sessionId || p.name === userSession.username);
  if (!isPlayer) {
    res.status(403).json({ error: 'Only players in this game can trigger a rematch' });
    return;
  }

  clearGameTurnTimer(game.id);
  game.resetToWaiting();

  broadcastGameUpdate(game.id, {
    type: 'GAME_UPDATED',
    game: game.toJSON(),
  });

  res.json({ game: game.toJSON() });
}

// POST /api/games/:id/end-turn - End current player's turn and switch active player to next player
export function endTurn(req: GameActionRequest, res: Response): void {
  const game = req.game!;
  game.endTurn();
  sendGameUpdate(game, res);
}

// POST /api/games/:id/buy-card - Buy a card
export function buyCard(req: GameActionRequest, res: Response): void {
  const game = req.game!;
  const { cardId } = req.body;
  if (!cardId) {
    res.status(400).json({ error: 'cardId is required' });
    return;
  }

  const result = game.buyCard(String(cardId));
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  sendGameUpdate(game, res);
}

// POST /api/games/:id/execute-player-action/reserve-card - Reserve a card
export function reserveCard(req: GameActionRequest, res: Response): void {
  const game = req.game!;
  const { cardId } = req.body;
  if (!cardId) {
    res.status(400).json({ error: 'cardId is required' });
    return;
  }

  const result = game.reserveCard(String(cardId));
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  sendGameUpdate(game, res);
}

// POST /api/games/:id/update-tokens - Take and/or return tokens for active player
export function updateTokens(req: GameActionRequest, res: Response): void {
  const game = req.game!;
  const { tokensToTake, tokensToReturn } = req.body || {};

  game.updateTokens(tokensToTake || null, tokensToReturn || null, true);
  sendGameUpdate(game, res);
}

// POST /api/games/:id/execute-player-action/invite-noble - Invite a noble tile
export function inviteNoble(req: GameActionRequest, res: Response): void {
  const game = req.game!;
  const { nobleId } = req.body;
  if (!nobleId) {
    res.status(400).json({ error: 'nobleId is required' });
    return;
  }

  const result = game.inviteNoble(String(nobleId));
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  sendGameUpdate(game, res);
}
