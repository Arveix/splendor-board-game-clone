import { getNobleDetails } from './cardUtils';
import { ALL_GEMS } from '../constants/gems';
import type { GemCost, GemType, PlayerBonuses, TokenBank, TokenType } from '../types';

export function canAffordCard(
  cardCost: GemCost,
  playerTokens?: Partial<TokenBank>,
  playerBonuses?: PlayerBonuses
): { canAfford: boolean; shortfall: number } {
  let totalShortfall = 0;

  for (const gem of ALL_GEMS) {
    const cost = cardCost[gem] || 0;
    const bonus = playerBonuses?.[gem] || 0;
    const effectiveCost = Math.max(0, cost - bonus);
    const held = playerTokens?.[gem] || 0;
    if (held < effectiveCost) {
      totalShortfall += effectiveCost - held;
    }
  }

  const gold = playerTokens?.gold || 0;
  return {
    canAfford: gold >= totalShortfall,
    shortfall: Math.max(0, totalShortfall - gold),
  };
}

export type GameAction =
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'SELECT_NOBLE'; nobleId: string }
  | { type: 'SELECT_BANK_TOKEN'; tokenKey: TokenType }
  | { type: 'SELECT_USER_TOKEN'; tokenKey: TokenType };

export interface ValidationContext {
  selectedCard: string | null;
  selectedNoble?: string | null;
  selectedBankTokens: Partial<Record<TokenType, number>>;
  selectedUserTokens: Partial<Record<TokenType, number>>;
  currentUserTokens?: Partial<Record<TokenType, number>>;
  bankTokens?: Partial<Record<TokenType, number>>;
  currentUserBonuses?: PlayerBonuses;
  isActivePlayer?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Centralized validation function for player actions during their active turn.
 * 
 * Rules:
 * 1. Mutual exclusivity between selections:
 *    - Selecting cards, nobles, or tokens is mutually exclusive.
 * 2. Noble selection validation:
 *    - Validates if user's permanent bonuses meet or exceed the required cost of the noble card.
 * 3. Token selection validation:
 *    - Gold tokens cannot be manually selected from bank.
 *    - Hand limit of 10 tokens: (current + taking - returning) cannot exceed 10.
 *    - 2 of same type only if at least 4 available in bank and 0 of other types from bank.
 *    - Up to 3 of different types (at most 1 per type).
 *    - Cannot select more tokens from bank than available.
 *    - Cannot select more tokens from hand than held.
 */
export const sumTokens = (record?: Partial<Record<string, number>>): number =>
  Object.values(record || {}).reduce<number>((sum, n) => sum + (n || 0), 0);

export function validateAction(
  action: GameAction,
  context: ValidationContext
): ValidationResult {
  if (context.isActivePlayer === false) {
    return {
      isValid: false,
      reason: 'It is not your turn',
    };
  }

  const {
    selectedCard,
    selectedNoble,
    selectedBankTokens,
    selectedUserTokens,
    currentUserTokens,
    bankTokens,
    currentUserBonuses,
  } = context;

  const totalBankSelected = sumTokens(selectedBankTokens);
  const totalUserSelected = sumTokens(selectedUserTokens);
  const hasTokensSelected = totalBankSelected + totalUserSelected > 0;
  const hasCardSelected = selectedCard !== null;
  const hasNobleSelected = Boolean(selectedNoble);

  // Case 1: Selecting development cards
  if (action.type === 'SELECT_CARD') {
    // If the user has selected tokens or a noble, disable cards
    if (hasTokensSelected) {
      return {
        isValid: false,
        reason: 'Cannot select cards while tokens are selected',
      };
    }
    if (hasNobleSelected) {
      return {
        isValid: false,
        reason: 'Cannot select cards while a noble is selected',
      };
    }

    return { isValid: true };
  }

  // Case 2: Selecting noble cards
  if (action.type === 'SELECT_NOBLE') {
    // If the user has selected tokens or cards, disable nobles
    if (hasTokensSelected) {
      return {
        isValid: false,
        reason: 'Cannot select nobles while tokens are selected',
      };
    }
    if (hasCardSelected) {
      return {
        isValid: false,
        reason: 'Cannot select nobles while a card is selected',
      };
    }

    const noble = getNobleDetails(action.nobleId);
    if (!noble) {
      return { isValid: false, reason: 'Noble tile not found' };
    }

    // Validate if user's bonuses allow the user to invite the noble card by exceeding/meeting the given cost
    const missingRequirements: string[] = [];
    for (const [gem, requiredCount] of Object.entries(noble.cost)) {
      if (typeof requiredCount === 'number' && requiredCount > 0) {
        const gemKey = gem as GemType;
        const userBonus = currentUserBonuses?.[gemKey] || 0;
        if (userBonus < requiredCount) {
          missingRequirements.push(
            `${requiredCount - userBonus} more ${gemKey} bonus`
          );
        }
      }
    }

    if (missingRequirements.length > 0) {
      return {
        isValid: false,
        reason: `Cannot invite ${noble.name}. Requires: ${missingRequirements.join(', ')}.`,
      };
    }

    return { isValid: true };
  }

  // Case 3: Selecting tokens (bank tokens or hand tokens)
  if (
    action.type === 'SELECT_BANK_TOKEN' ||
    action.type === 'SELECT_USER_TOKEN'
  ) {
    // If the user has selected a card or a noble, disable tokens
    if (hasCardSelected) {
      return {
        isValid: false,
        reason: 'Cannot select tokens while a card is selected',
      };
    }
    if (hasNobleSelected) {
      return {
        isValid: false,
        reason: 'Cannot select tokens while a noble is selected',
      };
    }

    // Sub-case 3A: Selecting a bank token
    if (action.type === 'SELECT_BANK_TOKEN') {
      const { tokenKey } = action;

      // Gold tokens can never be taken manually from the bank
      if (tokenKey === 'gold') {
        return {
          isValid: false,
          reason:
            'Gold tokens cannot be selected from bank; they are acquired by reserving a card',
        };
      }

      const availableInBank = bankTokens?.[tokenKey] ?? 7;
      const currentBankSelected = selectedBankTokens[tokenKey] ?? 0;

      // Cannot take more than available in bank
      if (currentBankSelected >= availableInBank) {
        return {
          isValid: false,
          reason:
            availableInBank === 0
              ? 'No tokens remaining in bank'
              : 'No more tokens of this type available in bank',
        };
      }

      // Hand limit of 10 tokens:
      // (current tokens in hand + tokens taking from bank - tokens returning to bank) cannot exceed 10
      const currentHandTotal = sumTokens(currentUserTokens);
      const projectedTokens = currentHandTotal + totalBankSelected - totalUserSelected;
      if (projectedTokens >= 10) {
        return {
          isValid: false,
          reason:
            'Cannot exceed the 10-token hand limit (return tokens from your hand to take more)',
        };
      }

      // Current distribution of selected bank tokens
      const entries = (
        Object.entries(selectedBankTokens) as [TokenType, number][]
      ).filter(([, count]) => (count || 0) > 0);
      const distinctBankCount = entries.length;
      const maxBankCount = Math.max(0, ...entries.map(([, count]) => count));

      // Selecting first token of this type (count 0 -> 1)
      if (currentBankSelected === 0) {
        if (maxBankCount >= 2) {
          return {
            isValid: false,
            reason:
              'Cannot select other tokens when 2 of the same type are selected',
          };
        }
        if (distinctBankCount >= 3) {
          return {
            isValid: false,
            reason: 'Cannot select more than 3 tokens',
          };
        }
        return { isValid: true };
      }

      // Selecting second token of this type (count 1 -> 2)
      if (currentBankSelected === 1) {
        if (distinctBankCount > 1) {
          return {
            isValid: false,
            reason:
              'Cannot take 2 of the same type if other token types are selected',
          };
        }
        if (availableInBank < 4) {
          return {
            isValid: false,
            reason:
              'Requires at least 4 tokens in bank to take 2 of the same type',
          };
        }
        return { isValid: true };
      }

      // Cannot select more than 2 of any type
      return {
        isValid: false,
        reason: 'Cannot select more than 2 tokens of the same type',
      };
    }

    // Sub-case 3B: Selecting a user token from hand (to return / exchange)
    if (action.type === 'SELECT_USER_TOKEN') {
      const { tokenKey } = action;
      const heldInHand = currentUserTokens?.[tokenKey] ?? 0;
      const currentSelectedFromHand = selectedUserTokens[tokenKey] ?? 0;

      if (currentSelectedFromHand >= heldInHand) {
        return {
          isValid: false,
          reason: 'Cannot select more tokens than you currently hold in hand',
        };
      }

      return { isValid: true };
    }
  }

  return { isValid: false, reason: 'Unknown action type' };
}
