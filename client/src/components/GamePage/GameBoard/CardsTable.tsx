import type { GameSession } from '../../../types';
import { DeckBack, DevelopmentCard, NobleCard } from '../Cards';
import { validateAction, type ValidationContext } from '../../../utils/validation';

export interface CardsTableProps {
  game: GameSession | null;
  selectedCard: string | null;
  selectedNoble?: string | null;
  validationContext?: ValidationContext;
  hiddenCardIds?: Set<string>;
  hiddenNobleIds?: Set<string>;
  onCardClick: (cardId: string) => void;
  onNobleClick?: (nobleId: string) => void;
}

export const CardsTable = ({
  game,
  selectedCard,
  selectedNoble,
  validationContext,
  hiddenCardIds,
  hiddenNobleIds,
  onCardClick,
  onNobleClick,
}: CardsTableProps) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1 sm:gap-1.5 lg:gap-2 overflow-y-auto overflow-x-hidden px-1 sm:px-2 py-0.5 custom-scrollbar">
      {/* Noble Tiles */}
      {game?.nobleTiles && game.nobleTiles.length > 0 && (
        <>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 lg:gap-2.5 w-full shrink-0">
            {game.nobleTiles.map((nobleId) => {
              const nobleValidation = validationContext
                ? validateAction({ type: 'SELECT_NOBLE', nobleId }, validationContext)
                : { isValid: false };
              const isNobleSelected = selectedNoble === nobleId;
              const isNobleDisabled = !nobleValidation.isValid && !isNobleSelected;

              return (
                <div
                  key={nobleId}
                  className="flex-1 max-w-[calc((100%-4*0.25rem)/5)] sm:max-w-[calc((100%-4*0.5rem)/5)] flex justify-center"
                >
                  <NobleCard
                    nobleId={nobleId}
                    isSelected={isNobleSelected}
                    isDisabled={isNobleDisabled}
                    isHidden={hiddenNobleIds?.has(nobleId)}
                    onClick={() => onNobleClick?.(nobleId)}
                  />
                </div>
              );
            })}
          </div>

          {/* Horizontal divider separating noble cards from development cards */}
          <div className="w-full border-t border-[#B8923A]/30 shrink-0 my-0.5" />
        </>
      )}

      {/* 3 Development Card Tiers */}
      {([3, 2, 1] as const).map((tierNum) => {
        const tierKey = `tier${tierNum}` as const;
        const revealed = game?.revealedCards?.[tierKey] || [];
        const remainingDeckCount = game?.availableCards?.[tierKey]?.length ?? 0;
        const slots = Array.from({ length: 4 });

        // Retrieve unique ID of the card at the top of the unrevealed deck for this tier
        const topDeckCards = game?.topDeckCards;
        const topDeckCardId = topDeckCards?.[tierKey] ?? game?.availableCards?.[tierKey]?.[0] ?? null;

        const isDeckSelected = Boolean(topDeckCardId && selectedCard === topDeckCardId);
        const deckValidation = validationContext && topDeckCardId
          ? validateAction({ type: 'SELECT_CARD', cardId: topDeckCardId }, validationContext)
          : { isValid: true };
        const isDeckDisabled = !deckValidation.isValid && !isDeckSelected;

        return (
          <div key={tierNum} className="grid grid-cols-5 gap-1 sm:gap-1.5 lg:gap-2.5 items-center justify-items-center w-full">
            {/* Face-down Deck (Selectable when cards remain in deck) */}
            <DeckBack
              tier={tierNum}
              remainingCount={remainingDeckCount}
              topCardId={topDeckCardId}
              isSelected={isDeckSelected}
              isDisabled={isDeckDisabled}
              onClick={topDeckCardId ? () => onCardClick(topDeckCardId) : undefined}
            />

            {/* 4 Face-up Development Cards */}
            {slots.map((_, idx) => {
              const cardId = revealed[idx];
              if (cardId) {
                const cardValidation = validationContext
                  ? validateAction({ type: 'SELECT_CARD', cardId }, validationContext)
                  : { isValid: true };
                const isCardDisabled = !cardValidation.isValid && selectedCard !== cardId;

                return (
                  <div
                    key={cardId}
                    data-card-slot={`tier${tierNum}-${idx}`}
                    className="w-full flex justify-center items-center"
                  >
                    <DevelopmentCard
                      cardId={cardId}
                      isSelected={selectedCard === cardId}
                      isDisabled={isCardDisabled}
                      isHidden={hiddenCardIds?.has(cardId)}
                      onClick={() => onCardClick(cardId)}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={`empty-t${tierNum}-${idx}`}
                  data-card-slot={`tier${tierNum}-${idx}`}
                  className="card-slot-empty w-full flex justify-center items-center"
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
