import { useMemo } from 'react';
import { getCardDetails } from '../utils/cardUtils';
import { canAffordCard, type ValidationContext } from '../utils/validation';

export function useCardAffordability(
  cardId: string | null,
  validationContext?: ValidationContext
) {
  return useMemo(() => {
    const cardDetails = cardId ? getCardDetails(cardId) : null;
    const affordCheck = cardDetails
      ? canAffordCard(
          cardDetails.cost,
          validationContext?.currentUserTokens,
          validationContext?.currentUserBonuses
        )
      : { canAfford: false, shortfall: 0 };

    const isBuyDisabled = !validationContext?.isActivePlayer || !affordCheck.canAfford;

    return {
      cardDetails,
      affordCheck,
      isBuyDisabled,
    };
  }, [cardId, validationContext]);
}
