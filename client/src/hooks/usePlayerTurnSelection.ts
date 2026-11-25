import { useEffect, useMemo, useState } from 'react';
import type { PlayerBonuses, TokenType } from '../types';
import { sumTokens, validateAction, type ValidationContext } from '../utils/validation';

export interface UsePlayerTurnSelectionOptions {
  isCurrentUserActive: boolean;
  currentUserTokens?: Partial<Record<TokenType, number>>;
  bankTokens?: Partial<Record<TokenType, number>>;
  currentUserBonuses?: PlayerBonuses;
}

export function usePlayerTurnSelection({
  isCurrentUserActive,
  currentUserTokens,
  bankTokens,
  currentUserBonuses,
}: UsePlayerTurnSelectionOptions) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedNoble, setSelectedNoble] = useState<string | null>(null);
  const [selectedBankTokens, setSelectedBankTokens] = useState<Partial<Record<TokenType, number>>>({});
  const [selectedUserTokens, setSelectedUserTokens] = useState<Partial<Record<TokenType, number>>>({});

  const totalBankSelected = sumTokens(selectedBankTokens);
  const totalUserSelected = sumTokens(selectedUserTokens);
  const totalSelectedTokens = totalBankSelected + totalUserSelected;
  const hasTokensSelected = totalSelectedTokens > 0;
  const hasCardSelected = selectedCard !== null;
  const hasNobleSelected = selectedNoble !== null;

  const clearSelection = () => {
    setSelectedCard(null);
    setSelectedNoble(null);
    setSelectedBankTokens({});
    setSelectedUserTokens({});
  };

  useEffect(() => {
    if (!isCurrentUserActive) {
      const timer = setTimeout(() => {
        clearSelection();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isCurrentUserActive]);

  // Reactive, live validation context
  const validationContext: ValidationContext = useMemo(
    () => ({
      selectedCard,
      selectedNoble,
      selectedBankTokens,
      selectedUserTokens,
      currentUserTokens,
      bankTokens,
      currentUserBonuses,
      isActivePlayer: isCurrentUserActive,
    }),
    [
      selectedCard,
      selectedNoble,
      selectedBankTokens,
      selectedUserTokens,
      currentUserTokens,
      bankTokens,
      currentUserBonuses,
      isCurrentUserActive,
    ]
  );

  const handleCardClick = (cardId: string) => {
    if (!isCurrentUserActive) return;
    if (selectedCard === cardId) {
      setSelectedCard(null);
      return;
    }
    const result = validateAction({ type: 'SELECT_CARD', cardId }, validationContext);
    if (!result.isValid) return;
    setSelectedCard(cardId);
  };

  const handleNobleClick = (nobleId: string) => {
    if (!isCurrentUserActive) return;
    if (selectedNoble === nobleId) {
      setSelectedNoble(null);
      return;
    }
    const result = validateAction({ type: 'SELECT_NOBLE', nobleId }, validationContext);
    if (!result.isValid) return;
    setSelectedNoble(nobleId);
  };

  const handleBankTokenClick = (tokenKey: TokenType) => {
    if (!isCurrentUserActive) return;
    const result = validateAction({ type: 'SELECT_BANK_TOKEN', tokenKey }, validationContext);

    if (result.isValid) {
      setSelectedBankTokens((prev) => ({
        ...prev,
        [tokenKey]: (prev[tokenKey] ?? 0) + 1,
      }));
    } else {
      const curr = selectedBankTokens[tokenKey] ?? 0;
      if (curr > 0) {
        setSelectedBankTokens((prev) => {
          const next = { ...prev };
          delete next[tokenKey];
          return next;
        });
      }
    }
  };

  const decrementTokenMap = (
    setter: React.Dispatch<React.SetStateAction<Partial<Record<TokenType, number>>>>,
    tokenKey: TokenType
  ) => {
    if (!isCurrentUserActive) return;
    setter((prev) => {
      const curr = prev[tokenKey] ?? 0;
      if (curr <= 1) {
        const next = { ...prev };
        delete next[tokenKey];
        return next;
      }
      return { ...prev, [tokenKey]: curr - 1 };
    });
  };

  const handleBankTokenDecrement = (tokenKey: TokenType) =>
    decrementTokenMap(setSelectedBankTokens, tokenKey);

  const handleUserTokenClick = (tokenKey: TokenType) => {
    if (!isCurrentUserActive) return;
    const result = validateAction({ type: 'SELECT_USER_TOKEN', tokenKey }, validationContext);

    if (result.isValid) {
      setSelectedUserTokens((prev) => ({
        ...prev,
        [tokenKey]: (prev[tokenKey] ?? 0) + 1,
      }));
    } else {
      const curr = selectedUserTokens[tokenKey] ?? 0;
      if (curr > 0) {
        setSelectedUserTokens((prev) => {
          const next = { ...prev };
          delete next[tokenKey];
          return next;
        });
      }
    }
  };

  const handleUserTokenDecrement = (tokenKey: TokenType) =>
    decrementTokenMap(setSelectedUserTokens, tokenKey);

  return {
    selectedCard,
    selectedNoble,
    selectedBankTokens,
    selectedUserTokens,
    totalBankSelected,
    totalUserSelected,
    totalSelectedTokens,
    hasTokensSelected,
    hasCardSelected,
    hasNobleSelected,
    validationContext,
    clearSelection,
    handleCardClick,
    handleNobleClick,
    handleBankTokenClick,
    handleBankTokenDecrement,
    handleUserTokenClick,
    handleUserTokenDecrement,
  };
}
