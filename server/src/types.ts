export type GameStatus = 'waiting' | 'active' | 'completed';

export type GemType = 'emerald' | 'sapphire' | 'ruby' | 'diamond' | 'onyx';
export type TokenType = GemType | 'gold';

export type GemCost = Record<GemType, number>;
export type PlayerBonuses = Record<GemType, number>;

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
  winPoints?: number;
  turnDurationSeconds?: number;
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
  cards?: string[];
  reservedCards?: string[];
  nobles?: string[];
  tokens?: TokenBank;
  bonuses?: PlayerBonuses;
  score?: number;
}

export interface GameSessionData {
  id: string;
  name: string;
  hostUsername: string;
  maxPlayers: number;
  playerCount: number;
  players: Player[];
  status: GameStatus;
  winPoints?: number;
  isFinalRound?: boolean;
  round?: number;
  winner?: Player | null;
  settings?: GameSettings;
  tokens?: TokenBank;
  revealedCards?: RevealedCards;
  availableCards?: AvailableCards;
  topDeckCards?: TopDeckCards;
  nobleTiles?: string[];
  createdAt: number;
  activePlayer?: Player | null;
  turnStartTime?: number;
  turnExpiresAt?: number;
  currentTurnDuration?: number;
  hasTakenAction?: boolean;
}
