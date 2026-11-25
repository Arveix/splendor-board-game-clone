import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, 'splendor_cards.json');
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
export const cardBonusMap = new Map();
export const cardDetailsMap = new Map();
for (const tierStr of ['1', '2', '3']) {
    const tier = Number(tierStr);
    for (const card of rawData.development_cards[tierStr] || []) {
        cardBonusMap.set(card.id, card.bonus);
        cardDetailsMap.set(card.id, { ...card, tier });
    }
}
export const nobleMap = new Map((rawData.noble_tiles || []).map((noble) => [noble.id, noble]));
export const cardIdsByTier = {
    tier1: (rawData.development_cards['1'] || []).map((c) => c.id),
    tier2: (rawData.development_cards['2'] || []).map((c) => c.id),
    tier3: (rawData.development_cards['3'] || []).map((c) => c.id),
};
export const nobleIds = (rawData.noble_tiles || []).map((n) => n.id);
