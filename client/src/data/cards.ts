import rawData from './splendor_cards.json';
import type { GemType, GemCost } from '../types';

export interface CardDefinition {
  id: string;
  bonus: GemType;
  points: number;
  cost: GemCost;
  tier: 1 | 2 | 3;
}

export interface NobleDefinition {
  id: string;
  name: string;
  cost: GemCost;
}

export const cardMap = new Map<string, CardDefinition>();
for (const tierStr of ['1', '2', '3'] as const) {
  const tier = Number(tierStr) as 1 | 2 | 3;
  for (const card of (rawData.development_cards as Record<string, Omit<CardDefinition, 'tier'>[]>)[tierStr] || []) {
    cardMap.set(card.id, { ...card, tier });
  }
}

export const nobleMap = new Map<string, NobleDefinition>(
  ((rawData.noble_tiles as NobleDefinition[]) || []).map((noble) => [noble.id, noble])
);
