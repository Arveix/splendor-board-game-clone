export type GameStatus = 'waiting' | 'active' | 'completed';

export type GemColor = 'emerald' | 'sapphire' | 'ruby' | 'diamond' | 'onyx';
export type TokenColor = GemColor | 'gold';

export interface TokenBank {
  emerald: number;
  sapphire: number;
  ruby: number;
  diamond: number;
  onyx: number;
  gold: number;
}

export interface GameSettings {
  gemTokenCount: number;
  goldTokenCount: number;
  faceUpCardsCount: number;
  nobleTilesCount: number;
}

export interface TierCards {
  tier1: string[];
  tier2: string[];
  tier3: string[];
}

export type AvailableCards = TierCards;
export type RevealedCards = TierCards;

export interface TopDeckCards {
  tier1: string | null;
  tier2: string | null;
  tier3: string | null;
}

export interface UserSession {
  sessionId: string;
  username: string;
  currentGameSessionId: string | null;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
}

export interface GameSessionData {
  id: string;
  name: string;
  hostUsername: string;
  maxPlayers: number;
  playerCount: number;
  players: Player[];
  status: GameStatus;
  settings?: GameSettings;
  tokens?: TokenBank;
  revealedCards?: RevealedCards;
  availableCards?: AvailableCards;
  topDeckCards?: TopDeckCards;
  nobleTiles?: string[];
  createdAt: number;
}
