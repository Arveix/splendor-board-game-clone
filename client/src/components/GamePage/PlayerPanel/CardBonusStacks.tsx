import { ALL_GEMS, GEM_CONFIG, GEM_IMAGES } from '../../../constants/gems';
import { GemShapeIcon } from '../../Gems';
import { getCardDetails } from '../../../utils/cardUtils';
import type { PlayerBonuses } from '../../../types';

// Stacked owned cards grouped by bonus gem type
// Group together all the cards that provide the same bonus and stack them on top of each other.
// Only display the top half of the card, that is, the points and the gem icon.
// The stack of cards will cover the rest of the card.
// Only the topmost card of the stack will be completely visible.
// The latest card added to the stack will be at the top.
export const CardBonusStacks = ({
  cardIds,
  bonuses,
}: {
  cardIds: string[];
  bonuses?: PlayerBonuses;
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs uppercase font-cinzel font-semibold tracking-wider text-[#B8923A]">
          Owned Cards
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 items-start w-full min-w-0 px-0.5 justify-items-center">
        {ALL_GEMS.map((gemKey) => {
          const config = GEM_CONFIG[gemKey];
          const count = bonuses?.[gemKey] ?? 0;
          const cardsForGem = cardIds
            .map((id) => getCardDetails(id))
            .filter((d): d is NonNullable<ReturnType<typeof getCardDetails>> => !!d && d.bonus === gemKey);

          if (count === 0) {
            return (
              <div
                key={gemKey}
                className="w-full aspect-[180/250] rounded-lg border border-dashed border-[#B8923A]/30 bg-[#120A05]/30 flex flex-col items-center justify-center p-1 text-center"
                title={`0 ${config.name} bonus cards`}
              >
                <div className="opacity-40">
                  <GemShapeIcon gem={gemKey} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B8923A]" />
                </div>
              </div>
            );
          }

          // Each card offset in stack: 16px
          const offsetPx = 16;
          return (
            <div
              key={gemKey}
              data-bonus-stack={gemKey}
              className="relative w-full min-w-0 flex flex-col items-center"
              style={{ paddingBottom: `${(count - 1) * offsetPx}px` }}
              title={`${count} ${config.name} bonus cards (+${count} ${config.name} discount)`}
            >
              {/* Floating bonus count badge for this gem */}
              <div
                className="absolute -top-1.5 right-0 z-30 min-w-[16px] h-4 px-0.5 rounded-full border border-white/60 flex items-center justify-center shadow-md select-none font-garamond font-bold text-[10px] leading-none"
                style={{ backgroundColor: config.mainColor, color: config.textColor }}
                title={`+${count} ${config.name} permanent bonus`}
              >
                +{count}
              </div>

              {/* Invisible spacer to maintain proportional aspect ratio in the grid column */}
              <div className="w-full aspect-[180/250] invisible pointer-events-none" />

              {cardsForGem.map((details, idx) => {
                return (
                  <div
                    key={`${details.id}-${idx}`}
                    className="absolute top-0 left-0 w-full aspect-[180/250] rounded-lg overflow-hidden border border-[#B8923A] shadow-md flex flex-col justify-between text-[#2A1F14] select-none isolate bg-clip-padding"
                    style={{
                      top: `${idx * offsetPx}px`,
                      zIndex: idx + 1,
                      clipPath: 'inset(0 round 8px)',
                    }}
                  >
                    {/* Card Artwork Image: explicitly rounded and clipped */}
                    <img
                      src={`/assets/cards/level${details.tier}/${details.id}.jpg`}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover rounded-[7px] pointer-events-none select-none"
                      style={{
                        borderRadius: '7px',
                        clipPath: 'inset(0 round 7px)',
                      }}
                    />

                    {/* Top half: Points & Bonus Gem Icon */}
                    <div className="relative z-10 px-1 py-0.5 flex items-center justify-between shrink-0 bg-black/70 rounded-t-[7px]">
                      <span className="font-garamond font-bold text-xs sm:text-sm leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {details.points > 0 ? details.points : ''}
                      </span>
                      {GEM_IMAGES[details.bonus] ? (
                        <img
                          src={GEM_IMAGES[details.bonus]}
                          alt={config.name}
                          className="w-3 h-3 sm:w-3.5 sm:h-3.5 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                        />
                      ) : (
                        <GemShapeIcon gem={details.bonus} className="w-3 h-3 text-white drop-shadow-xs" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
