import { cardMap, nobleMap, type CardDefinition, type NobleDefinition } from '../data/cards';

export { type CardDefinition, type NobleDefinition };

export const getCardDetails = (id: string): CardDefinition | undefined => cardMap.get(id);

export const getNobleDetails = (id: string): NobleDefinition | undefined => nobleMap.get(id);
