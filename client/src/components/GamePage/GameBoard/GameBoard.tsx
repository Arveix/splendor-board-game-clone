import type { GameSession, TokenType } from '../../../types';
import { CardsTable } from './CardsTable';
import { TokenBank } from './TokenBank';
import type { ValidationContext } from '../../../utils/validation';
import { useCardAffordability } from '../../../hooks';

export interface GameBoardProps {
  game: GameSession | null;

  // Selection states
  selectedCard: string | null;
  selectedNoble?: string | null;
  selectedBankTokens: Partial<Record<TokenType, number>>;
  selectedUserTokens: Partial<Record<TokenType, number>>;
  totalBankSelected: number;
  totalUserSelected: number;
  hasCardSelected: boolean;
  hasTokensSelected: boolean;
  hasNobleSelected?: boolean;
  validationContext?: ValidationContext;
  hiddenCardIds?: Set<string>;
  hiddenNobleIds?: Set<string>;

  // Selection handlers
  onCardClick: (cardId: string) => void;
  onNobleClick?: (nobleId: string) => void;
  onBuyCard?: (cardId: string) => void;
  onReserveCard?: (cardId: string) => void;
  onInviteNoble?: (nobleId: string) => void;
  isReserveDisabled?: boolean;
  onTakeTokens?: () => void;
  onBankTokenClick: (tokenKey: TokenType) => void;
  onBankTokenDecrement: (tokenKey: TokenType) => void;
  onClearSelection: () => void;
}

export const GameBoard = ({
  game,
  selectedCard,
  selectedNoble,
  selectedBankTokens,
  totalBankSelected,
  totalUserSelected,
  hasCardSelected,
  hasTokensSelected,
  hasNobleSelected = Boolean(selectedNoble),
  validationContext,
  hiddenCardIds,
  hiddenNobleIds,
  onCardClick,
  onNobleClick,
  onBuyCard,
  onReserveCard,
  onInviteNoble,
  isReserveDisabled = false,
  onTakeTokens,
  onBankTokenClick,
  onBankTokenDecrement,
  onClearSelection,
}: GameBoardProps) => {
  const { isBuyDisabled, affordCheck } = useCardAffordability(selectedCard, validationContext);

  return (
    <div className="landscape:col-span-6 lg:col-span-6 flex flex-col justify-between gap-1 sm:gap-2 lg:gap-2.5 splendor-panel rounded-lg p-1.5 sm:p-2.5 lg:p-3.5 overflow-hidden h-full max-h-full">
      {/* Cards Area: Nobles (top) + 3 Development Card Tiers (Scrollable internally) */}
      <CardsTable
        game={game}
        selectedCard={selectedCard}
        selectedNoble={selectedNoble}
        validationContext={validationContext}
        hiddenCardIds={hiddenCardIds}
        hiddenNobleIds={hiddenNobleIds}
        onCardClick={onCardClick}
        onNobleClick={onNobleClick}
      />

      {/* Action Bar based on Selection */}
      {(hasCardSelected || hasTokensSelected || hasNobleSelected) && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#120A05]/95 border border-[#B8923A]/60 shadow-lg text-xs font-garamond text-[#F3E9D2] shrink-0 my-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* When a card is selected: "Reserve Card" and "Buy Card" */}
            {hasCardSelected && (
              <>
                <button
                  type="button"
                  disabled={isReserveDisabled}
                  onClick={() => selectedCard && onReserveCard?.(selectedCard)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2A1F14] hover:bg-[#3D2D1E] disabled:opacity-40 disabled:cursor-not-allowed border border-[#B8923A]/70 text-[#F3E9D2] font-cinzel font-semibold uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer hover:border-[#D4A83A]"
                  title={isReserveDisabled ? 'Cannot reserve more than 3 cards' : 'Reserve Card'}
                >
                  Reserve Card
                </button>
                <button
                  type="button"
                  disabled={isBuyDisabled}
                  onClick={() => selectedCard && onBuyCard?.(selectedCard)}
                  className="px-4 py-1.5 rounded-lg bg-[#B8923A] hover:bg-[#D4A83A] disabled:opacity-40 disabled:cursor-not-allowed text-[#120A05] font-cinzel font-bold uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer"
                  title={
                    !validationContext?.isActivePlayer
                      ? 'It is not your turn'
                      : !affordCheck.canAfford
                      ? `Cannot afford card (short by ${affordCheck.shortfall} token${affordCheck.shortfall === 1 ? '' : 's'})`
                      : 'Buy Card'
                  }
                >
                  Buy Card
                </button>
              </>
            )}

            {/* When a noble is selected: "Invite Noble" */}
            {hasNobleSelected && (
              <button
                type="button"
                onClick={() => selectedNoble && onInviteNoble?.(selectedNoble)}
                className="px-4 py-1.5 rounded-lg bg-[#B8923A] hover:bg-[#D4A83A] text-[#120A05] font-cinzel font-bold uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer"
              >
                Invite Noble
              </button>
            )}

            {/* When tokens from bank only are selected: "Take Tokens" */}
            {totalBankSelected > 0 && totalUserSelected === 0 && (
              <button
                type="button"
                onClick={onTakeTokens}
                className="px-4 py-1.5 rounded-lg bg-[#B8923A] hover:bg-[#D4A83A] text-[#120A05] font-cinzel font-bold uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer"
              >
                Take Tokens
              </button>
            )}

            {/* When tokens from bank AND user's stack are selected: "Exchange Tokens" */}
            {totalBankSelected > 0 && totalUserSelected > 0 && (
              <button
                type="button"
                onClick={onTakeTokens}
                className="px-4 py-1.5 rounded-lg bg-[#B8923A] hover:bg-[#D4A83A] text-[#120A05] font-cinzel font-bold uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer"
              >
                Exchange Tokens
              </button>
            )}
          </div>

          {/* Clear / Cancel Button */}
          <button
            type="button"
            onClick={onClearSelection}
            className="px-2.5 py-1.5 text-xs uppercase font-cinzel font-semibold tracking-wider text-[#F3A0A4] hover:text-white bg-[#3A1416]/80 hover:bg-[#5A1C20] border border-[#9B3038]/60 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Bottom: Bank Tokens */}
      <TokenBank
        game={game}
        selectedBankTokens={selectedBankTokens}
        hasCardSelected={hasCardSelected}
        validationContext={validationContext}
        onBankTokenClick={onBankTokenClick}
        onBankTokenDecrement={onBankTokenDecrement}
      />
    </div>
  );
};
