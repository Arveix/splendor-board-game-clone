import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { GemCost, GemType } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, 'splendor_cards.json');

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

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

export const cardBonusMap = new Map<string, GemType>();
export const cardDetailsMap = new Map<string, CardDefinition>();

for (const tierStr of ['1', '2', '3'] as const) {
  const tier = Number(tierStr) as 1 | 2 | 3;
  for (const card of (rawData.development_cards as Record<string, any[]>)[tierStr] || []) {
    cardBonusMap.set(card.id, card.bonus);
    cardDetailsMap.set(card.id, { ...card, tier });
  }
}

export const nobleMap = new Map<string, NobleDefinition>(
  ((rawData.noble_tiles as NobleDefinition[]) || []).map((noble) => [noble.id, noble])
);

export const cardIdsByTier: { tier1: string[]; tier2: string[]; tier3: string[] } = {
  tier1: (rawData.development_cards['1'] || []).map((c: { id: string }) => c.id),
  tier2: (rawData.development_cards['2'] || []).map((c: { id: string }) => c.id),
  tier3: (rawData.development_cards['3'] || []).map((c: { id: string }) => c.id),
};

export const nobleIds: string[] = (rawData.noble_tiles || []).map((n: { id: string }) => n.id);
