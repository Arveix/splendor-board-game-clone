import { getAllCardIdsByTier, getAllNobleIds, shuffleArray } from '../data/cards.js';
export class GameSession {
    id;
    name;
    hostUsername;
    maxPlayers;
    players;
    status;
    createdAt;
    // Game resources and settings
    settings;
    tokens;
    revealedCards;
    availableCards;
    nobleTiles;
    activePlayer = null;
    constructor(name, host, maxPlayers = 4) {
        this.id = GameSession.generateId();
        this.name = name;
        this.hostUsername = host.name;
        this.maxPlayers = maxPlayers;
        this.players = [host];
        this.status = 'waiting';
        this.createdAt = Date.now();
    }
    static generateId() {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    addPlayer(player) {
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
    removePlayer(playerId) {
        this.players = this.players.filter((p) => p.id !== playerId);
        if (this.players.length > 0 && !this.players.some((p) => p.name === this.hostUsername)) {
            this.hostUsername = this.players[0].name;
        }
    }
    setStatus(status) {
        this.status = status;
    }
    // Start game and initialize all resources
    startGame(customSettings) {
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
    // 3. Update tokens (take from bank and/or return to bank).
    // ============================================================
    // Action 1: Buy one face-up card
    buyCard(cardId) {
        // Logic to update game state will be implemented based on the rules later
    }
    // Action 2: Reserve any one face-up card or the card from the top of the face-down deck
    reserveCard(cardId) {
        // Logic to update game state will be implemented based on the rules later
    }
    // Action 3: Update tokens (handles tokens taken from and/or returned to the bank by the active player)
    updateTokens(tokensToTake, tokensToReturn) {
        if (!this.tokens || !this.activePlayer)
            return;
        // Tokens taken from bank by the active player
        if (tokensToTake) {
            for (const [color, amount] of Object.entries(tokensToTake)) {
                const key = color;
                if (typeof amount === 'number' && amount > 0) {
                    this.tokens[key] = (this.tokens[key] || 0) - amount;
                    this.activePlayer.tokens[key] = (this.activePlayer.tokens[key] || 0) + amount;
                }
            }
        }
        // Tokens returned to bank by the active player
        if (tokensToReturn) {
            for (const [color, amount] of Object.entries(tokensToReturn)) {
                const key = color;
                if (typeof amount === 'number' && amount > 0) {
                    this.tokens[key] = (this.tokens[key] || 0) + amount;
                    this.activePlayer.tokens[key] = Math.max(0, (this.activePlayer.tokens[key] || 0) - amount);
                }
            }
        }
    }
    // Track the unique ID of the card at the top of the unrevealed deck for each tier
    getTopDeckCards() {
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
    endTurn() {
        if (this.players.length === 0)
            return;
        const currentIndex = this.players.findIndex((p) => p.id === this.activePlayer?.id);
        const nextIndex = (currentIndex + 1) % this.players.length;
        this.activePlayer = this.players[nextIndex];
    }
    toJSON() {
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
