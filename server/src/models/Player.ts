import type { PlayerBonuses, TokenBank } from '../types.js';
import { getCardBonus } from '../utils/cardUtils.js';
import { computeScore } from '../utils/scoreUtils.js';

export class Player {
  public id: string;
  public name: string;
  public cards: string[];
  public reservedCards: string[];
  public nobles: string[];
  public tokens: TokenBank;
  public score: number = 0;

  constructor(id: string, name: string) {
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

  public calculateScore(): number {
    this.score = computeScore(this);
    return this.score;
  }

  public getScore(): number {
    return this.calculateScore();
  }

  public getBonuses(): PlayerBonuses {
    const bonuses: PlayerBonuses = {
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

  public toJSON() {
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
