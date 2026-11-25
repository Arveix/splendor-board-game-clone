import { getCardBonus } from '../utils/cardUtils.js';
import { computeScore } from '../utils/scoreUtils.js';
export class Player {
    id;
    name;
    cards;
    reservedCards;
    nobles;
    tokens;
    score = 0;
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.cards = [];
        this.reservedCards = [];
        this.nobles = [];
        this.tokens = {
            emerald: 0,
            sapphire: 0,
            ruby: 0,
            diamond: 0,
            onyx: 0,
            gold: 0,
        };
        this.score = 0;
    }
    calculateScore() {
        this.score = computeScore(this);
        return this.score;
    }
    getScore() {
        return this.calculateScore();
    }
    getBonuses() {
        const bonuses = {
            emerald: 0,
            sapphire: 0,
            ruby: 0,
            diamond: 0,
            onyx: 0,
        };
        for (const cardId of this.cards) {
            const bonus = getCardBonus(cardId);
            if (bonus && bonus in bonuses) {
                bonuses[bonus]++;
            }
        }
        return bonuses;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            cards: this.cards,
            reservedCards: this.reservedCards,
            nobles: this.nobles,
            tokens: this.tokens,
            bonuses: this.getBonuses(),
            score: this.getScore(),
        };
    }
}
