import rawData from './splendor_cards.json';

export interface CardCost {
  black: number;
  white: number;
  red: number;
  blue: number;
  green: number;
  onyx: number;
  diamond: number;
  ruby: number;
  sapphire: number;
  emerald: number;
}

export interface CardDefinition {
  id: string;
  color: string;
  points: number;
  cost: CardCost;
  tier: 1 | 2 | 3;
}

export interface NobleDefinition {
  id: string;
  name: string;
  cost: CardCost;
}

function normalizeCost(rawCost: Record<string, number>): CardCost {
  return {
    black: rawCost.black || 0,
    white: rawCost.white || 0,
    red: rawCost.red || 0,
    blue: rawCost.blue || 0,
    green: rawCost.green || 0,
    onyx: rawCost.black || 0,
    diamond: rawCost.white || 0,
    ruby: rawCost.red || 0,
    sapphire: rawCost.blue || 0,
    emerald: rawCost.green || 0,
  };
}

const cardMap = new Map<string, CardDefinition>();
for (const tierStr of ['1', '2', '3'] as const) {
  const tierNum = Number(tierStr) as 1 | 2 | 3;
  const list = (rawData.development_cards as Record<string, any[]>)[tierStr] || [];
  for (const card of list) {
    cardMap.set(card.id, {
      id: card.id,
      color: card.color,
      points: card.points,
      cost: normalizeCost(card.cost),
      tier: tierNum,
    });
  }
}

const nobleMap = new Map<string, NobleDefinition>();
for (const noble of (rawData.noble_tiles as any[] || [])) {
  nobleMap.set(noble.id, {
    id: noble.id,
    name: noble.name,
    cost: normalizeCost(noble.cost),
  });
}

export function getCardDetails(id: string): CardDefinition | undefined {
  return cardMap.get(id);
}

export function getNobleDetails(id: string): NobleDefinition | undefined {
  return nobleMap.get(id);
}
