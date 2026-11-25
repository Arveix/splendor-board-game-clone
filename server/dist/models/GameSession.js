import { ALL_GEMS } from '../constants/gems.js';
import { calculateCardPayment, getAllCardIdsByTier, getAllNobleIds, getCardDetails, getNobleDetails, shuffleArray, } from '../utils/cardUtils.js';
import { determineWinner } from '../utils/scoreUtils.js';
export class GameSession {
    id;
    name;
    hostUsername;
    maxPlayers;
    winPoints;
    players;
    status;
    createdAt;
    isFinalRound = false;
    round = 1;
    winner = null;
    // Game resources and settings
    settings;
    tokens;
    revealedCards;
    availableCards;
    nobleTiles;
    activePlayer = null;
    turnStartTime;
    currentTurnDuration;
    constructor(name, host, maxPlayers = 4, winPoints = 15) {
        this.id = GameSession.generateId();
        this.name = name;
        this.hostUsername = host.name;
        this.maxPlayers = maxPlayers;
        this.winPoints = winPoints;
        this.players = [host];
        this.status = 'waiting';
        this.createdAt = Date.now();
        this.isFinalRound = false;
        this.round = 1;
        this.winner = null;
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
    // Reset game session back to 'waiting' state for a rematch with current players
    resetToWaiting() {
        this.status = 'waiting';
        this.isFinalRound = false;
        this.round = 1;
        this.winner = null;
        this.activePlayer = null;
        this.turnStartTime = undefined;
        this.currentTurnDuration = undefined;
        this.settings = undefined;
        this.tokens = undefined;
        this.revealedCards = undefined;
        this.availableCards = undefined;
        this.nobleTiles = undefined;
        // Reset all players' cards, reserved cards, nobles, tokens, and score
        for (const player of this.players) {
            player.cards = [];
            player.reservedCards = [];
            player.nobles = [];
            player.tokens = {
                emerald: 0,
                sapphire: 0,
                ruby: 0,
                diamond: 0,
                onyx: 0,
                gold: 0,
            };
            player.score = 0;
        }
    }
    // Start game and initialize all resources
    startGame(customSettings) {
        const playerCount = this.players.length;
        // Standard defaults based on player count if not customized
        const defaultGemTokens = playerCount === 2 ? 4 : playerCount === 3 ? 5 : 7;
        const defaultGoldTokens = 5;
        const defaultNobleCount = Math.min(10, playerCount + 1);
        const defaultFaceUp = 4;
        const defaultWinPoints = 15;
        const defaultTurnDuration = 90;
        this.settings = {
            gemTokenCount: Math.min(8, Math.max(1, customSettings?.gemTokenCount ?? defaultGemTokens)),
            goldTokenCount: Math.min(5, Math.max(0, customSettings?.goldTokenCount ?? defaultGoldTokens)),
            faceUpCardsCount: customSettings?.faceUpCardsCount === 3 ? 3 : defaultFaceUp,
            nobleTilesCount: Math.min(10, Math.max(1, customSettings?.nobleTilesCount ?? defaultNobleCount)),
            winPoints: Math.max(1, customSettings?.winPoints ?? this.winPoints ?? defaultWinPoints),
            turnDurationSeconds: Math.max(10, customSettings?.turnDurationSeconds ?? defaultTurnDuration),
        };
        this.winPoints = this.settings.winPoints ?? 15;
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
        this.isFinalRound = false;
        this.round = 1;
        this.winner = null;
        this.status = 'active';
        this.turnStartTime = Date.now();
        this.currentTurnDuration = this.settings.turnDurationSeconds;
    }
    // ============================================================
    // Helpers for taking development cards from the board or deck
    // ============================================================
    takeRevealedCard(cardId) {
        if (!this.revealedCards)
            return false;
        for (const tier of ['tier1', 'tier2', 'tier3']) {
            const idx = this.revealedCards[tier].indexOf(cardId);
            if (idx !== -1) {
                const nextCard = this.availableCards?.[tier]?.shift() || null;
                if (nextCard) {
                    this.revealedCards[tier][idx] = nextCard;
                }
                else {
                    this.revealedCards[tier].splice(idx, 1);
                }
                return true;
            }
        }
        return false;
    }
    takeTopDeckCard(cardId) {
        if (!this.availableCards)
            return false;
        for (const tier of ['tier1', 'tier2', 'tier3']) {
            if (this.availableCards[tier].length > 0 && this.availableCards[tier][0] === cardId) {
                this.availableCards[tier].shift();
                return true;
            }
        }
        return false;
    }
    // ============================================================
    // Player Actions
    // On their turn, the active player can perform one of:
    // 1. Buy one face-up card.
    // 2. Reserve any one face-up card or the card from the top of the face-down deck.
    // 3. Update tokens (take from bank and/or return to bank).
    // ============================================================
    // Action 1: Buy one face-up card or a card from player's reserved cards
    buyCard(cardId) {
        if (this.status !== 'active') {
            return { success: false, error: 'Game is not active' };
        }
        const player = this.activePlayer;
        if (!player) {
            return { success: false, error: 'No active player' };
        }
        const card = getCardDetails(cardId);
        if (!card) {
            return { success: false, error: 'Card not found' };
        }
        const isReservedByPlayer = player.reservedCards.includes(cardId);
        const isRevealedOnBoard = Boolean(this.revealedCards &&
            ['tier1', 'tier2', 'tier3'].some((tier) => this.revealedCards[tier]?.includes(cardId)));
        if (!isReservedByPlayer && !isRevealedOnBoard) {
            return { success: false, error: 'Card is not available to buy' };
        }
        const payment = calculateCardPayment(card.cost, player.tokens, player.getBonuses());
        if (!payment.canAfford) {
            return {
                success: false,
                error: `Insufficient tokens and bonuses to buy this card (short by ${payment.shortfall} tokens)`,
            };
        }
        // Return spent tokens from player stack to bank
        this.updateTokens(null, payment.tokensToReturn);
        // Add card to player's purchased cards
        if (!player.cards.includes(cardId)) {
            player.cards.push(cardId);
            player.calculateScore();
        }
        // Remove card from player's reserved cards or replenish from revealed table
        if (isReservedByPlayer) {
            const resIdx = player.reservedCards.indexOf(cardId);
            if (resIdx !== -1) {
                player.reservedCards.splice(resIdx, 1);
            }
        }
        else {
            this.takeRevealedCard(cardId);
        }
        // If active player is able to invite a noble, reset the turn timer to 60 seconds
        const eligibleNobles = this.getEligibleNobles(player);
        if (eligibleNobles.length === 0) {
            this.endTurn();
        }
        else {
            this.turnStartTime = Date.now();
            this.currentTurnDuration = 60;
        }
        return { success: true };
    }
    // Action 2: Reserve any one face-up card or the card from the top of the face-down deck
    reserveCard(cardId) {
        if (this.status !== 'active') {
            return { success: false, error: 'Game is not active' };
        }
        const player = this.activePlayer;
        if (!player) {
            return { success: false, error: 'No active player' };
        }
        // Maximum 3 reserved cards per player
        if (player.reservedCards.length >= 3) {
            return { success: false, error: 'Cannot reserve more than 3 cards' };
        }
        if (player.reservedCards.includes(cardId)) {
            return { success: false, error: 'Card is already reserved' };
        }
        const found = this.takeRevealedCard(cardId) || this.takeTopDeckCard(cardId);
        if (!found) {
            return { success: false, error: 'Card not found on table or top of deck' };
        }
        player.reservedCards.push(cardId);
        // Splendor rule: If available in bank, player takes 1 gold (wild) token when reserving
        if (this.tokens && this.tokens.gold > 0) {
            this.updateTokens({ gold: 1 }, null);
        }
        // If active player is able to invite a noble, reset the turn timer to 60 seconds
        const eligibleNobles = this.getEligibleNobles(player);
        if (eligibleNobles.length === 0) {
            this.endTurn();
        }
        else {
            this.turnStartTime = Date.now();
            this.currentTurnDuration = 60;
        }
        return { success: true };
    }
    // Action 3: Invite an available noble tile to visit the active player
    inviteNoble(nobleId) {
        if (this.status !== 'active') {
            return { success: false, error: 'Game is not active' };
        }
        const player = this.activePlayer;
        if (!player) {
            return { success: false, error: 'No active player' };
        }
        if (!this.nobleTiles || !this.nobleTiles.includes(nobleId)) {
            return { success: false, error: 'Noble tile not available on board' };
        }
        const noble = getNobleDetails(nobleId);
        if (!noble) {
            return { success: false, error: 'Noble definition not found' };
        }
        const bonuses = player.getBonuses();
        for (const gem of ALL_GEMS) {
            const required = noble.cost[gem] || 0;
            if (required > 0 && (bonuses[gem] || 0) < required) {
                return {
                    success: false,
                    error: `Insufficient bonuses to invite ${noble.name} (requires ${required} ${gem}, have ${bonuses[gem] || 0})`,
                };
            }
        }
        // Move noble tile into player's owned nobles
        if (!player.nobles.includes(nobleId)) {
            player.nobles.push(nobleId);
            player.calculateScore();
        }
        // Remove noble tile from board
        this.nobleTiles = this.nobleTiles.filter((id) => id !== nobleId);
        // Finalize turn after noble visit
        this.endTurn();
        return { success: true };
    }
    // Check which noble tiles currently on the board the player has sufficient bonuses to invite
    getEligibleNobles(player) {
        if (!this.nobleTiles || this.nobleTiles.length === 0)
            return [];
        const bonuses = player.getBonuses();
        const eligible = [];
        for (const nobleId of this.nobleTiles) {
            const noble = getNobleDetails(nobleId);
            if (!noble)
                continue;
            let qualifies = true;
            for (const gem of ALL_GEMS) {
                const required = noble.cost[gem] || 0;
                if (required > 0 && (bonuses[gem] || 0) < required) {
                    qualifies = false;
                    break;
                }
            }
            if (qualifies) {
                eligible.push(nobleId);
            }
        }
        return eligible;
    }
    // Action 4: Update tokens (handles tokens taken from and/or returned to the bank by the active player)
    updateTokens(tokensToTake, tokensToReturn, autoEndTurn = false) {
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
        if (autoEndTurn) {
            const eligibleNobles = this.getEligibleNobles(this.activePlayer);
            if (eligibleNobles.length === 0) {
                this.endTurn();
            }
            else {
                this.turnStartTime = Date.now();
                this.currentTurnDuration = 60;
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
        if (this.status !== 'active' || this.players.length === 0 || !this.activePlayer)
            return;
        // Identify the player whose turn just concluded
        const finishingPlayer = this.activePlayer;
        // Calculate player points after player actions have been completed
        // and the state of the game has been updated with the actions taken in that particular turn
        finishingPlayer.calculateScore();
        // Recalculate points for all players to ensure game state is fully synchronized
        for (const p of this.players) {
            p.calculateScore();
        }
        // Whenever any player reaches or crosses the victory point threshold, the final round is established
        if (this.players.some((p) => p.score >= this.winPoints)) {
            this.isFinalRound = true;
        }
        const currentIndex = this.players.findIndex((p) => p.id === finishingPlayer.id);
        const isRoundEnd = currentIndex === this.players.length - 1;
        // Only that final round has to be completed and no more rounds will be played after that.
        // The game will be completely stopped to allow the calculation of the winner.
        if (isRoundEnd && this.isFinalRound) {
            this.winner = determineWinner(this.players);
            this.status = 'completed';
            this.activePlayer = null;
            this.turnStartTime = undefined;
            this.currentTurnDuration = undefined;
            return;
        }
        if (isRoundEnd) {
            this.round += 1;
        }
        const nextIndex = (currentIndex + 1) % this.players.length;
        this.activePlayer = this.players[nextIndex];
        this.turnStartTime = Date.now();
        this.currentTurnDuration = this.settings?.turnDurationSeconds ?? 90;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            hostUsername: this.hostUsername,
            maxPlayers: this.maxPlayers,
            winPoints: this.winPoints,
            isFinalRound: this.isFinalRound,
            round: this.round,
            winner: this.winner?.toJSON() || null,
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
            turnStartTime: this.turnStartTime,
            turnExpiresAt: this.status === 'active' && this.turnStartTime
                ? this.turnStartTime + (this.currentTurnDuration ?? this.settings?.turnDurationSeconds ?? 90) * 1000
                : undefined,
            currentTurnDuration: this.currentTurnDuration ?? this.settings?.turnDurationSeconds ?? 90,
        };
    }
}
