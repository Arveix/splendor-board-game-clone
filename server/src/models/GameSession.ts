import { getAllCardIdsByTier, getAllNobleIds, shuffleArray } from '../data/cards.js';
import type {
  AvailableCards,
  GameSessionData,
  GameSettings,
  GameStatus,
  RevealedCards,
  TokenBank,
  TopDeckCards,
} from '../types.js';
import { Player } from './Player.js';

export class GameSession {
  public readonly id: string;
  public name: string;
  public hostUsername: string;
  public maxPlayers: number;
  public players: Player[];
  public status: GameStatus;
  public createdAt: number;

  // Game resources and settings
  public settings?: GameSettings;
  public tokens?: TokenBank;
  public revealedCards?: RevealedCards;
  public availableCards?: AvailableCards;
  public nobleTiles?: string[];
  public activePlayer: Player | null = null;

  constructor(name: string, host: Player, maxPlayers: number = 4) {
    this.id = GameSession.generateId();
    this.name = name;
    this.hostUsername = host.name;
    this.maxPlayers = maxPlayers;
    this.players = [host];
    this.status = 'waiting';
    this.createdAt = Date.now();
  }

  private static generateId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public addPlayer(player: Player): { success: boolean; error?: string } {
    if (this.status !== 'waiting') {
      return { success: false, error: 'Game is not in waiting state' };
    }
    if (this.players.length >= this.maxPlayers) {
      return { success: false, error: 'Game session is full' };
    }
    if (!this.players.some((p) => p.id === player.id)) {
      this.players.push(player);
    }
    return { success: true };
  }

  public removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
    if (this.players.length > 0 && !this.players.some((p) => p.name === this.hostUsername)) {
      this.hostUsername = this.players[0].name;
    }
  }

  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  // Start game and initialize all resources
  public startGame(customSettings?: Partial<GameSettings>): void {
    const playerCount = this.players.length;

    // Standard defaults based on player count if not customized
    const defaultGemTokens = playerCount === 2 ? 4 : playerCount === 3 ? 5 : 7;
    const defaultGoldTokens = 5;
    const defaultNobleCount = Math.min(10, playerCount + 1);
    const defaultFaceUp = 4;

    this.settings = {
      gemTokenCount: Math.min(8, Math.max(1, customSettings?.gemTokenCount ?? defaultGemTokens)),
      goldTokenCount: Math.min(5, Math.max(0, customSettings?.goldTokenCount ?? defaultGoldTokens)),
      faceUpCardsCount: customSettings?.faceUpCardsCount === 3 ? 3 : defaultFaceUp,
      nobleTilesCount: Math.min(10, Math.max(1, customSettings?.nobleTilesCount ?? defaultNobleCount)),
    };

    // Initialize tokens (can be taken and returned)
    this.tokens = {
      emerald: this.settings.gemTokenCount,
      sapphire: this.settings.gemTokenCount,
      ruby: this.settings.gemTokenCount,
      diamond: this.settings.gemTokenCount,
      onyx: this.settings.gemTokenCount,
      gold: this.settings.goldTokenCount,
    };

    // Initialize development cards:
    // Revealed cards contain the face-up cards (size = faceUpCardsCount).
    // Available cards contain the remaining unrevealed deck.
    // No card is duplicated between revealedCards and availableCards.
    const cardIds = getAllCardIdsByTier();
    const shuffled1 = shuffleArray(cardIds.tier1);
    const shuffled2 = shuffleArray(cardIds.tier2);
    const shuffled3 = shuffleArray(cardIds.tier3);

    const faceUp = this.settings.faceUpCardsCount;

    this.revealedCards = {
      tier1: shuffled1.slice(0, faceUp),
      tier2: shuffled2.slice(0, faceUp),
      tier3: shuffled3.slice(0, faceUp),
    };

    this.availableCards = {
      tier1: shuffled1.slice(faceUp),
      tier2: shuffled2.slice(faceUp),
      tier3: shuffled3.slice(faceUp),
    };

    // Initialize noble tiles (only storing unique IDs)
    const allNobles = shuffleArray(getAllNobleIds());
    this.nobleTiles = allNobles.slice(0, this.settings.nobleTilesCount);

    // Randomize player array. Player at index 0 starts by default.
    this.players = shuffleArray(this.players);
    this.activePlayer = this.players[0] || null;

    this.status = 'active';
  }

  // ============================================================
  // Player Actions
  // On their turn, the active player can perform one of:
  // 1. Buy one face-up card.
  // 2. Reserve any one face-up card or the card from the top of the face-down deck.
  // 3. Take tokens from the bank.
  // ============================================================

  // Action 1: Buy one face-up card
  public buyCard(cardId: string): void {
    // Logic to update game state will be implemented based on the rules later
  }

  // Action 2: Reserve any one face-up card or the card from the top of the face-down deck
  public reserveCard(cardId: string): void {
    // Logic to update game state will be implemented based on the rules later
  }

  // Action 3: Take tokens from the bank
  public takeTokens(tokensToTake: Partial<TokenBank>): void {
    // Logic to update game state will be implemented based on the rules later
  }

  // Track the unique ID of the card at the top of the unrevealed deck for each tier
  public getTopDeckCards(): TopDeckCards {
    if (!this.availableCards) {
      return { tier1: null, tier2: null, tier3: null };
    }
    return {
      tier1: this.availableCards.tier1.length > 0 ? this.availableCards.tier1[0] : null,
      tier2: this.availableCards.tier2.length > 0 ? this.availableCards.tier2[0] : null,
      tier3: this.availableCards.tier3.length > 0 ? this.availableCards.tier3[0] : null,
    };
  }

  // Switch activePlayer to next player in the array (player ends turn, next player's turn starts)
  public endTurn(): void {
    if (this.players.length === 0) return;
    const currentIndex = this.players.findIndex((p) => p.id === this.activePlayer?.id);
    const nextIndex = (currentIndex + 1) % this.players.length;
    this.activePlayer = this.players[nextIndex];
  }

  public toJSON(): GameSessionData {
    return {
      id: this.id,
      name: this.name,
      hostUsername: this.hostUsername,
      maxPlayers: this.maxPlayers,
      playerCount: this.players.length,
      players: this.players.map((p) => p.toJSON()),
      status: this.status,
      settings: this.settings,
      tokens: this.tokens,
      revealedCards: this.revealedCards,
      availableCards: this.availableCards,
      topDeckCards: this.getTopDeckCards(),
      nobleTiles: this.nobleTiles,
      createdAt: this.createdAt,
      activePlayer: this.activePlayer?.toJSON() || null,
    };
  }
}
