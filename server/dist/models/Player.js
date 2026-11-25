export class Player {
    id;
    name;
    cards;
    reservedCards;
    tokens;
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.cards = [];
        this.reservedCards = [];
        this.tokens = {
            emerald: 0,
            sapphire: 0,
            ruby: 0,
            diamond: 0,
            onyx: 0,
            gold: 0,
        };
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            cards: this.cards,
            reservedCards: this.reservedCards,
            tokens: this.tokens,
        };
    }
}
