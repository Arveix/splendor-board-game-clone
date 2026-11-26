import { ALL_TOKENS, GEM_CONFIG } from '../../../constants/gems';
import { GemToken } from '../../Gems';
import type { GameSession, TokenType } from '../../../types';
import { validateAction, type ValidationContext } from '../../../utils/validation';

export interface TokenBankProps {
  game: GameSession | null;
  selectedBankTokens: Partial<Record<TokenType, number>>;
  hasCardSelected?: boolean;
  validationContext?: ValidationContext;
  onBankTokenClick: (tokenKey: TokenType) => void;
  onBankTokenDecrement: (tokenKey: TokenType) => void;
}

export const TokenBank = ({
  game,
  selectedBankTokens,
  hasCardSelected = false,
  validationContext,
  onBankTokenClick,
  onBankTokenDecrement,
}: TokenBankProps) => {
  // Use passed validationContext or construct fallback
  const context: ValidationContext = validationContext ?? {
    selectedCard: hasCardSelected ? 'card-selected' : null,
    selectedBankTokens,
    selectedUserTokens: {},
    currentUserTokens: {},
    bankTokens: game?.tokens,
  };

  return (
    <div className="flex flex-col gap-1.5 border-t border-[#B8923A]/30 pt-2 shrink-0 mt-auto w-full min-w-0 px-0.5 sm:px-1">
      <div className="grid grid-cols-6 gap-1 sm:gap-1.5 w-full min-w-0 justify-items-center items-center">
        {ALL_TOKENS.map((tokenKey) => {
          const config = GEM_CONFIG[tokenKey];
          const count = game?.tokens?.[tokenKey] ?? (tokenKey === 'gold' ? 5 : 7);
          const bankSelectedCount = selectedBankTokens[tokenKey] ?? 0;
          const isBankSelected = bankSelectedCount > 0;

          const validation = validateAction(
            { type: 'SELECT_BANK_TOKEN', tokenKey },
            context
          );
          const canAdd = validation.isValid;
          const isBankDisabled = (!isBankSelected && !canAdd) || count === 0;
          const isVisuallyDimmed = (!isBankSelected && !canAdd) || count === 0;

          return (
            <div
              key={tokenKey}
              onClick={isBankDisabled ? undefined : () => onBankTokenClick(tokenKey)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!isBankDisabled) onBankTokenDecrement(tokenKey);
              }}
              className={`flex items-center justify-center py-1.5 transition-transform min-w-0 ${
                isVisuallyDimmed
                  ? 'opacity-40 cursor-not-allowed hover:scale-100'
                  : 'cursor-pointer hover:scale-110 active:scale-95'
              }`}
              title={
                isBankSelected
                  ? `${bankSelectedCount} selected from bank (click to adjust, right-click to remove)`
                  : !validation.isValid
                  ? validation.reason
                  : `Take ${config.name} token (${count} remaining)`
              }
            >
              <div
                data-bank-token={tokenKey}
                className={`relative inline-flex items-center justify-center rounded-full transition-all ${
                isBankSelected
                  ? 'ring-3 ring-[#F3D679] shadow-[0_0_12px_rgba(243,214,121,0.85)]'
                  : ''
              }`}>
                <GemToken
                  gem={tokenKey}
                  size={64}
                  className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 aspect-square"
                />
                {/* Available badge counter overlapping top-right of token */}
                <span className="absolute -top-1 -right-1 sm:-top-1 sm:-right-1.5 z-10 min-w-[20px] sm:min-w-[22px] h-5 sm:h-5.5 px-1 rounded-full bg-[#120A05] border border-[#B8923A] text-[#F3E9D2] font-garamond font-bold text-xs sm:text-[13px] flex items-center justify-center shadow-md leading-none select-none">
                  {count}
                </span>

                {/* Selected from Bank badge (bottom-left) */}
                {isBankSelected && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onBankTokenDecrement(tokenKey);
                    }}
                    className="absolute -bottom-1 -left-1 z-20 min-w-[20px] h-5 px-1 rounded-full bg-[#B8923A] border border-[#F3D679] text-[#120A05] font-garamond font-bold text-xs sm:text-[13px] flex items-center justify-center shadow-[0_0_8px_rgba(243,214,121,0.6)] leading-none select-none hover:bg-[#D4A83A] cursor-pointer"
                    title="Click to remove 1"
                  >
                    +{bankSelectedCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
