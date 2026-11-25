import { useState } from 'react';
import { ALL_TOKENS, GEM_CONFIG } from '../../../constants/gems';
import { GemToken } from '../../Gems';
import type { Player, TokenType } from '../../../types';
import { CardBonusStacks } from './CardBonusStacks';
import { DevelopmentCard, NobleCard } from '../Cards';
import { validateAction, type ValidationContext } from '../../../utils/validation';

export interface PlayerPanelProps {
  player: Player | null | undefined;
  isCurrentUser: boolean;
  isActive?: boolean;
  score?: number;
  className?: string;

  // Header controls
  onEndTurn?: () => void;
  isEndTurnDisabled?: boolean;

  // Selection states & actions (for current user)
  selectedCard?: string | null;
  selectedUserTokens?: Partial<Record<TokenType, number>>;
  hasCardSelected?: boolean;
  hasTokensSelected?: boolean;
  validationContext?: ValidationContext;
  onCardClick?: (cardId: string) => void;
  onUserTokenClick?: (tokenKey: TokenType) => void;
  onUserTokenDecrement?: (tokenKey: TokenType) => void;
}

export const PlayerPanel = ({
  player,
  isCurrentUser,
  isActive = false,
  score,
  className,
  onEndTurn,
  isEndTurnDisabled = false,
  selectedCard,
  selectedUserTokens = {},
  hasCardSelected = false,
  hasTokensSelected = false,
  validationContext,
  onCardClick,
  onUserTokenClick,
  onUserTokenDecrement,
}: PlayerPanelProps) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const isCollapsed = isCurrentUser ? false : !isExpanded && !isActive;
  const displayScore = score ?? player?.score ?? 0;
  const userTokens = player?.tokens;
  const ownedCards = player?.cards || [];
  const reservedCards = player?.reservedCards || [];

  return (
    <div
      data-player-panel={player?.id || player?.name || 'player'}
      className={`flex flex-col splendor-panel rounded-lg relative transition-all duration-300 ease-in-out ${isActive
        ? 'border-2 border-[#B8923A] shadow-[0_0_14px_rgba(184,146,58,0.35)]'
        : 'border-2 border-transparent'
        } ${isCurrentUser
          ? 'landscape:col-span-3 lg:col-span-3 overflow-y-auto overflow-x-hidden max-h-full custom-scrollbar p-3 sm:p-3.5 gap-2.5'
          : isCollapsed
            ? 'w-full shrink-0 px-2.5 py-2 gap-0'
            : 'w-full shrink-0 p-2 sm:p-2.5 lg:p-3.5 gap-2 sm:gap-2.5'
        } ${className || ''}`}
    >
      {/* Row 1: Header (Player name & score + Menu or Dropdown) */}
      {isCurrentUser ? (
        <div className="flex items-center justify-between border-b border-[#B8923A]/30 pb-2 gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-[18px] font-medium text-[#F3E9D2] font-garamond truncate">
              {player?.name || 'You'}
            </h3>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-[20px] sm:text-[22px] font-bold text-[#F3D679] font-garamond leading-none">
                {displayScore}
              </span>
              <span className="text-xs font-garamond font-semibold text-[#B9AE96] uppercase">
                pts
              </span>
            </div>
          </div>

          {/* End Turn Button for current user */}
          <div className="shrink-0 ml-auto">
            <button
              type="button"
              onClick={onEndTurn}
              disabled={isEndTurnDisabled}
              className="px-3 py-1.5 text-xs font-cinzel font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed bg-[#B8923A] hover:bg-[#D4A83A] text-[#120A05] disabled:bg-[#4A4338] disabled:text-[#8A8272] shadow-sm disabled:shadow-none"
              title={isEndTurnDisabled ? 'Not your turn' : 'End Turn'}
            >
              End Turn
            </button>
          </div>
        </div>
      ) : (
        /* Header for other players: name, score, and collapsible arrowhead button */
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`flex items-center justify-between px-0.5 gap-2 w-full bg-transparent cursor-pointer transition-all duration-300 ${isCollapsed ? 'pb-0 border-b border-transparent' : 'border-b border-[#B8923A]/30 pb-2'
            }`}
          title={isCollapsed ? 'Expand player details' : 'Collapse player details'}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-[18px] font-medium text-[#F3E9D2] font-garamond truncate">
              {player?.name || 'No players'}
            </h3>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-[20px] sm:text-[22px] font-bold text-[#F3D679] font-garamond leading-none">
                {displayScore}
              </span>
              <span className="text-xs font-garamond font-semibold text-[#B9AE96] uppercase">
                pts
              </span>
            </div>
          </div>

          {/* Arrowhead Icon */}
          <div className="shrink-0 ml-auto">
            <svg
              className={`w-4 h-4 text-[#B8923A] transition-transform duration-300 ease-in-out ${isCollapsed ? '-rotate-90' : 'rotate-0'
                }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      )}

      {/* Collapsible content wrapper with smooth grid height and opacity animation */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${isCollapsed && !isCurrentUser
          ? 'grid-rows-[0fr] opacity-0 pointer-events-none'
          : 'grid-rows-[1fr] opacity-100'
          }`}
      >
        <div className={`${isCurrentUser ? 'overflow-visible' : 'overflow-hidden'} flex flex-col gap-2.5 min-h-0 pt-0.5`}>
          {/* Row 2: Tokens held */}
          <div className="flex flex-col gap-1.5">
            <div className={isCurrentUser
              ? "grid grid-cols-3 gap-2 sm:gap-2.5 w-full px-2 sm:px-2.5 py-1 text-center justify-items-center items-center"
              : "flex items-center justify-between w-full py-1 px-1 sm:px-1.5 gap-1 sm:gap-1.5"
            }>
              {ALL_TOKENS.map((tokenKey) => {
                const config = GEM_CONFIG[tokenKey];
                const count = userTokens?.[tokenKey] ?? 0;
                const userSelectedCount = selectedUserTokens[tokenKey] ?? 0;
                const isUserSelected = userSelectedCount > 0;
                const tokenValidation = validationContext
                  ? validateAction({ type: 'SELECT_USER_TOKEN', tokenKey }, validationContext)
                  : { isValid: !hasCardSelected };
                const isUserDisabled = hasCardSelected || count === 0;

                if (isCurrentUser) {
                  return (
                    <div
                      key={tokenKey}
                      onClick={() => onUserTokenClick?.(tokenKey)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onUserTokenDecrement?.(tokenKey);
                      }}
                      className={`relative inline-flex items-center justify-center rounded-full transition-transform ${isUserDisabled
                          ? 'opacity-40 cursor-not-allowed hover:scale-100'
                          : 'cursor-pointer hover:scale-110 active:scale-95'
                        }`}
                      title={
                        hasCardSelected
                          ? 'Cannot select tokens while a card is selected'
                          : isUserSelected
                            ? `${userSelectedCount} selected from your stack (click to adjust, right-click to decrement)`
                            : !tokenValidation.isValid
                              ? tokenValidation.reason
                              : `${count} ${config.name} tokens held (click to select)`
                      }
                    >
                      <div
                        data-user-token={tokenKey}
                        className={`relative inline-flex items-center justify-center rounded-full transition-all ${isUserSelected
                          ? 'ring-3 ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.85)]'
                          : ''
                        }`}>
                        <GemToken
                          gem={tokenKey}
                          size={56}
                          className="w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 aspect-square"
                        />
                        {/* Held tokens counter badge (top-right) */}
                        <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 z-10 min-w-[19px] sm:min-w-[21px] h-4.5 sm:h-5 px-1 rounded-full bg-[#120A05] border border-[#B8923A] text-[#F3E9D2] font-garamond font-bold text-xs sm:text-[13px] flex items-center justify-center shadow-md leading-none select-none">
                          {count}
                        </span>

                        {/* Selected from Hand indicator badge (bottom-left) */}
                        {isUserSelected && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onUserTokenDecrement?.(tokenKey);
                            }}
                            className="absolute -bottom-0.5 -left-0.5 sm:-bottom-1 sm:-left-1 z-20 min-w-[19px] h-4.5 sm:h-5 px-1 rounded-full bg-sky-600 border border-sky-300 text-white font-garamond font-bold text-xs sm:text-[13px] flex items-center justify-center shadow-[0_0_6px_rgba(14,165,233,0.8)] leading-none select-none hover:bg-sky-700 cursor-pointer"
                            title="Click to remove 1"
                          >
                            {userSelectedCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                // Other players' tokens (compact circle display matching development card cost style)
                return (
                  <div
                    key={tokenKey}
                    className="flex-1 min-w-0 max-w-[28px] sm:max-w-[30px] lg:max-w-[32px] aspect-square rounded-full flex items-center justify-center font-garamond font-bold text-xs sm:text-[13px] lg:text-[15px] shadow-sm border border-white/80 select-none leading-none"
                    style={{ backgroundColor: config.mainColor, color: config.textColor }}
                    title={`${count} ${config.name} tokens held`}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 3: Owned Cards stacked by bonus gem type */}
          <CardBonusStacks cardIds={ownedCards} bonuses={player?.bonuses} />

          {/* Row 3B: Nobles invited by player (displayed separately from stacked development cards) */}
          {player?.nobles && player.nobles.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-[#B8923A]/30 pt-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B8923A]">
                  Invited Nobles
                </span>
                <span className="text-xs font-garamond font-semibold text-[#B9AE96]">
                  ({player.nobles.length})
                </span>
              </div>
              <div
                data-nobles-tray={player?.id || 'nobles'}
                className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 w-full"
                style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
              >
                {player.nobles.map((nobleId, idx) => (
                  <div key={nobleId} data-noble-slot={idx} className="w-full col-span-1 min-w-0 flex justify-center">
                    <NobleCard nobleId={nobleId} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Reserved Cards (Modified based on whether it is the current user or other players) */}
          <div className="flex flex-col gap-1.5 shrink-0 border-t border-[#B8923A]/30 pt-2">
            {isCurrentUser ? (
              /* Current user: Face-up actual reserved cards (max 3) */
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B8923A]">
                    Reserved Cards
                  </span>
                  <span className="text-xs font-garamond font-semibold text-[#B9AE96]">
                    ({reservedCards.length}/3)
                  </span>
                </div>
                <div
                  data-reserved-tray={player?.id || 'reserved'}
                  className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 w-full"
                  style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
                >
                  {[0, 1, 2].map((slotIdx) => {
                    const cardId = reservedCards[slotIdx];
                    if (cardId) {
                      const cardValidation = validationContext
                        ? validateAction({ type: 'SELECT_CARD', cardId }, validationContext)
                        : { isValid: !hasTokensSelected };

                      return (
                        <div
                          key={cardId}
                          data-reserved-slot={slotIdx}
                          className="w-full col-span-1 min-w-0 flex justify-center"
                        >
                          <DevelopmentCard
                            cardId={cardId}
                            isSelected={selectedCard === cardId}
                            isDisabled={!cardValidation.isValid && selectedCard !== cardId}
                            onClick={() => onCardClick?.(cardId)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div
                        key={`empty-reserved-${slotIdx}`}
                        data-reserved-slot={slotIdx}
                        className="w-full col-span-1 min-w-0 aspect-[180/250] rounded-lg border-2 border-dashed border-[#B8923A]/25 bg-[#120A05]/40 flex items-center justify-center text-[10px] sm:text-xs text-[#B9AE96]/40 font-cinzel select-none"
                      >
                        Empty
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Other players: Simple text line display without background or border */
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B8923A]">
                  Reserved Cards
                </span>
                <span className="text-xs font-garamond font-semibold text-[#B9AE96]">
                  ({reservedCards.length}/3)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
