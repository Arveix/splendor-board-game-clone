import type { GameSession } from './models/GameSession.js';
import type { UserSession } from './types.js';

// In-Memory Storage (no database)
export const userSessions = new Map<string, UserSession>();
export const games = new Map<string, GameSession>();
