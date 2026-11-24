import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, 'splendor_cards.json');

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

export function getAllCardIdsByTier(): { tier1: string[]; tier2: string[]; tier3: string[] } {
  return {
    tier1: (rawData.development_cards['1'] || []).map((c: { id: string }) => c.id),
    tier2: (rawData.development_cards['2'] || []).map((c: { id: string }) => c.id),
    tier3: (rawData.development_cards['3'] || []).map((c: { id: string }) => c.id),
  };
}

export function getAllNobleIds(): string[] {
  return (rawData.noble_tiles || []).map((n: { id: string }) => n.id);
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
