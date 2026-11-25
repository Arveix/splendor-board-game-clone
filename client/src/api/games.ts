import type { GameSettings } from '../types';
import { API_BASE } from './config';

/**
 * List all available games
 * GET /api/games
 */
export async function listGamesApi(sessionId: string): Promise<Response> {
  return fetch(`${API_BASE}/games`, {
    headers: {
      'x-session-id': sessionId,
    },
  });
}

/**
 * Create a new game session
 * POST /api/games
 */
export async function createGameApi(
  sessionId: string,
  params: { name?: string; maxPlayers?: number; winPoints?: number }
): Promise<Response> {
  return fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify(params),
  });
}

/**
 * Get a specific game session
 * GET /api/games/:id
 */
export async function getGameApi(sessionId: string, gameId: string): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}`, {
    headers: {
      'x-session-id': sessionId,
    },
  });
}

/**
 * Join a game session
 * POST /api/games/:id/join
 */
export async function joinGameApi(sessionId: string, gameId: string): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
  });
}

/**
 * Remove a player from game session (host kicking or player leaving)
 * POST /api/games/:id/remove-player
 */
export async function removePlayerApi(
  sessionId: string,
  gameId: string,
  playerId?: string
): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/remove-player`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify(playerId ? { playerId } : {}),
  });
}

/**
 * Start a game session (only host can start)
 * POST /api/games/:id/start
 */
export async function startGameApi(
  sessionId: string,
  gameId: string,
  settings: GameSettings
): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify(settings),
  });
}

/**
 * Reset game session to waiting lobby for a rematch
 * POST /api/games/:id/rematch
 */
export async function rematchGameApi(sessionId: string, gameId: string): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/rematch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
  });
}

/**
 * End current player's turn and switch active player to next player
 * POST /api/games/:id/execute-player-action/end-turn
 */
export async function endTurnApi(sessionId: string, gameId: string): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/execute-player-action/end-turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
  });
}

/**
 * Buy a card
 * POST /api/games/:id/execute-player-action/buy-card
 */
export async function buyCardApi(
  sessionId: string,
  gameId: string,
  cardId: string
): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/execute-player-action/buy-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ cardId }),
  });
}

/**
 * Reserve a card
 * POST /api/games/:id/execute-player-action/reserve-card
 */
export async function reserveCardApi(
  sessionId: string,
  gameId: string,
  cardId: string
): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/execute-player-action/reserve-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ cardId }),
  });
}

/**
 * Update tokens (take from bank and/or return to bank)
 * POST /api/games/:id/execute-player-action/update-tokens
 */
export async function updateTokensApi(
  sessionId: string,
  gameId: string,
  tokensToTake: Partial<Record<string, number>> | null,
  tokensToReturn: Partial<Record<string, number>> | null
): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/execute-player-action/update-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ tokensToTake, tokensToReturn }),
  });
}

/**
 * Invite a noble tile
 * POST /api/games/:id/execute-player-action/invite-noble
 */
export async function inviteNobleApi(
  sessionId: string,
  gameId: string,
  nobleId: string
): Promise<Response> {
  return fetch(`${API_BASE}/games/${encodeURIComponent(gameId)}/execute-player-action/invite-noble`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
    },
    body: JSON.stringify({ nobleId }),
  });
}
