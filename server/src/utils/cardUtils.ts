import {
  cardBonusMap,
  cardDetailsMap,
  cardIdsByTier,
  nobleIds,
  nobleMap,
  type CardDefinition,
  type NobleDefinition,
} from '../data/cards.js';
import { ALL_GEMS } from '../constants/gems.js';
import type { GemCost, GemType, PlayerBonuses, TokenBank } from '../types.js';

export { type CardDefinition, type NobleDefinition };

export function getNobleDetails(nobleId: string): NobleDefinition | undefined {
  return nobleMap.get(nobleId);
}

export interface CardPaymentResult {
  canAfford: boolean;
  shortfall: number;
  tokensToReturn: Partial<TokenBank>;
}

export function calculateCardPayment(
  cardCost: GemCost,
  playerTokens: TokenBank,
  playerBonuses: PlayerBonuses
): CardPaymentResult {
  const tokensToReturn: Partial<TokenBank> = {};
  let totalShortfall = 0;

  for (const gem of ALL_GEMS) {
    const cost = cardCost[gem] || 0;
    const bonus = playerBonuses[gem] || 0;
    const effectiveCost = Math.max(0, cost - bonus);
    const held = playerTokens[gem] || 0;
    const payGems = Math.min(held, effectiveCost);
    if (payGems > 0) {
      tokensToReturn[gem] = payGems;
    }
    totalShortfall += effectiveCost - payGems;
  }

  const availableGold = playerTokens.gold || 0;
  if (availableGold < totalShortfall) {
    return {
      canAfford: false,
      shortfall: totalShortfall - availableGold,
      tokensToReturn,
    };
  }

  if (totalShortfall > 0) {
    tokensToReturn.gold = totalShortfall;
  }

  return {
    canAfford: true,
    shortfall: 0,
    tokensToReturn,
  };
}

export function getCardBonus(cardId: string): GemType | undefined {
  return cardBonusMap.get(cardId);
}

export function getCardDetails(cardId: string): CardDefinition | undefined {
  return cardDetailsMap.get(cardId);
}

export function getAllCardIdsByTier(): { tier1: string[]; tier2: string[]; tier3: string[] } {
  return {
    tier1: [...cardIdsByTier.tier1],
    tier2: [...cardIdsByTier.tier2],
    tier3: [...cardIdsByTier.tier3],
  };
}

export function getAllNobleIds(): string[] {
  return [...nobleIds];
}

// Fisher-Yates array shuffler
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
