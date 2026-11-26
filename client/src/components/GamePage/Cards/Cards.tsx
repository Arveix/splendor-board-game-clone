import { ALL_GEMS, GEM_CONFIG, GEM_IMAGES } from '../../../constants/gems';
import { GemShapeIcon } from '../../Gems';
import { getCardDetails, getNobleDetails } from '../../../utils/cardUtils';

// Development card component per Section 3.2
// Desktop reference size: 180 × 250px; 2px brass border; #E8DCC0 parchment background
export const DevelopmentCard = ({
  cardId,
  isSelected,
  isDisabled,
  onClick,
}: {
  cardId: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}) => {
  const details = getCardDetails(cardId);
  if (!details) {
    return (
      <div className="w-full aspect-[180/250] rounded-lg border-2 border-dashed border-[#B8923A]/30 bg-[#120A05]/40 flex items-center justify-center text-[11px] text-[#B9AE96]/60 font-cinzel">
        {cardId}
      </div>
    );
  }

  const gemConfig = GEM_CONFIG[details.bonus];
  const costEntries = ALL_GEMS
    .map((gem) => ({ gem, count: details.cost[gem] }))
    .filter((c) => c.count > 0);

  // Group costs into rows of 2, stacked upwards from bottom-left
  const costRows: (typeof costEntries)[] = [];
  for (let i = 0; i < costEntries.length; i += 2) {
    costRows.push(costEntries.slice(i, i + 2));
  }

  return (
    <div
      data-card-id={cardId}
      onClick={isDisabled ? undefined : onClick}
      className={`card-face relative w-full aspect-[180/250] rounded-lg overflow-hidden border-2 shadow-md flex flex-col justify-between text-[#2A1F14] select-none transition-all isolate bg-clip-padding ${isSelected
        ? 'border-[#F3D679] ring-4 ring-[#F3D679] scale-[1.03] z-20 cursor-pointer'
        : isDisabled
          ? 'border-[#B8923A]/40 cursor-not-allowed hover:scale-100'
          : 'border-[#B8923A] hover:scale-[1.02] cursor-pointer'
        }`}
      style={{
        clipPath: 'inset(0 round 8px)',
      }}
      title={
        isDisabled
          ? 'Cannot select a card while tokens are selected'
          : isSelected
            ? 'Selected card (click to deselect)'
            : `${details.points > 0 ? `${details.points} pts, ` : ''}${gemConfig.name} bonus`
      }
    >
      {/* Card Artwork Image: explicitly rounded to match inner border curve and clipped */}
      <img
        src={`/assets/cards/level${details.tier}/${details.id}.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-[6px] pointer-events-none select-none"
        style={{
          borderRadius: '6px',
          clipPath: 'inset(0 round 6px)',
        }}
      />

      {/* Top: Points & Bonus gem icon */}
      <div className="relative z-10 px-1 py-0.5 sm:px-1.5 md:px-1.5 lg:px-2 md:py-0.5 lg:py-1 flex items-center justify-between shrink-0 bg-black/60 rounded-t-[6px]">
        <span className="font-garamond font-bold text-xs sm:text-sm md:text-sm lg:text-base leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {details.points > 0 ? details.points : ''}
        </span>
        {GEM_IMAGES[details.bonus] ? (
          <img
            src={GEM_IMAGES[details.bonus]}
            alt={gemConfig.name}
            className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-4.5 lg:h-4.5 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
          />
        ) : (
          <div
            className="flex items-center justify-center p-0.5 md:p-1 rounded-full shadow-md border border-white/20"
            style={{ backgroundColor: gemConfig.mainColor }}
          >
            <GemShapeIcon gem={details.bonus} className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Bottom-left: Cost circles starting at bottom-left and stacking upwards */}
      <div className="relative z-10 mt-auto p-0.5 sm:p-1 md:p-1 lg:p-1.5 shrink-0 rounded-b-[6px]">
        <div className="flex flex-col-reverse gap-1 items-start w-fit">
          {costRows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-1">
              {row.map((c) => {
                const costConfig = GEM_CONFIG[c.gem];
                const gemImg = GEM_IMAGES[c.gem];
                return (
                  <div
                    key={c.gem}
                    className="relative w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full flex items-center justify-center font-garamond font-bold text-xs sm:text-[13px] md:text-sm lg:text-[15px] shadow-sm border border-white/80 select-none leading-none shrink-0"
                    style={{ backgroundColor: costConfig.mainColor, color: costConfig.textColor }}
                    title={`${c.count} ${costConfig.name}`}
                  >
                    {c.count}

                    {/* Superscript gem image anchored directly to the circle */}
                    {gemImg && (
                      <img
                        src={gemImg}
                        alt=""
                        className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 lg:w-3.5 lg:h-3.5 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none select-none z-10"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Face-down deck component per Section 3.2
export const DeckBack = ({
  tier,
  remainingCount,
  topCardId,
  isSelected,
  isDisabled,
  onClick,
}: {
  tier: 1 | 2 | 3;
  remainingCount: number;
  topCardId?: string | null;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}) => {
  const roman = tier === 3 ? 'III' : tier === 2 ? 'II' : 'I';
  const isEmpty = remainingCount <= 0;

  if (isEmpty) {
    return (
      <div className="relative w-full aspect-[180/250] rounded-lg border-2 border-dashed border-[#B8923A]/30 bg-[#120A05]/40 flex flex-col items-center justify-center p-1 text-center select-none">
        <span className="font-cinzel text-xs text-[#B9AE96]/50 uppercase">Empty</span>
        <span className="font-cinzel text-[11px] text-[#B8923A]/40">{roman}</span>
      </div>
    );
  }

  return (
    <div
      data-tier={tier}
      data-top-card-id={topCardId || undefined}
      onClick={isDisabled ? undefined : onClick}
      className={`deck-back relative w-full aspect-[180/250] rounded-lg overflow-hidden border-2 flex flex-col items-center justify-between p-2 text-center select-none transition-all ${isSelected
        ? 'border-[#F3D679] ring-4 ring-[#F3D679] shadow-[0_4px_12px_rgba(0,0,0,0.5)] scale-[1.03] z-20 cursor-pointer'
        : isDisabled
          ? 'border-[#B8923A]/30 opacity-50 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-not-allowed hover:scale-100'
          : 'border-[#B8923A] shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:scale-[1.02] cursor-pointer'
        }`}
      style={{
        clipPath: 'inset(0 round 8px)',
      }}
      title={
        isDisabled
          ? 'Cannot select a card while tokens are selected'
          : isSelected
            ? `Selected Tier ${tier} face-down deck (top card ID: ${topCardId || 'unknown'}). Click to deselect.`
            : `Tier ${tier} Deck (${remainingCount} cards remaining - click to select top card)`
      }
    >
      {/* Top dots indicator */}
      <div className="flex items-center gap-1">
        {Array.from({ length: tier }).map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#B8923A]" />
        ))}
      </div>

      {/* Roman numeral in Cinzel 700 */}
      <span className="font-cinzel font-bold text-2xl sm:text-3xl md:text-4xl text-[#B8923A] leading-none tracking-wider">
        {roman}
      </span>

      {/* Number of cards left underneath (Section 3.2: Garamond bold) */}
      <span className="font-garamond font-bold text-sm sm:text-base text-[#B9AE96] leading-none">
        {remainingCount}
      </span>
    </div>
  );
};

// Noble Tile component per Section 3.3
export const NobleCard = ({
  nobleId,
  isSelected,
  isDisabled,
  onClick,
}: {
  nobleId: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}) => {
  const noble = getNobleDetails(nobleId);
  if (!noble) return null;

  const costEntries = ALL_GEMS
    .map((gem) => ({ gem, count: noble.cost[gem] }))
    .filter((c) => c.count > 0);

  return (
    <div
      data-noble-id={nobleId}
      onClick={isDisabled ? undefined : onClick}
      className={`card-face relative w-full aspect-[140/164] rounded-lg overflow-hidden border-2 shadow-md flex flex-col justify-between text-[#2A1F14] select-none transition-all isolate bg-clip-padding ${isSelected
        ? 'border-[#F3D679] ring-4 ring-[#F3D679] scale-[1.03] z-20 cursor-pointer'
        : isDisabled
          ? 'border-[#B8923A] cursor-not-allowed hover:scale-100'
          : 'border-[#B8923A] hover:scale-[1.03] cursor-pointer'
        }`}
      style={{
        clipPath: 'inset(0 round 8px)',
      }}
      title={
        isDisabled
          ? `Cannot invite ${noble.name}: bonuses do not meet requirements (${costEntries.map((c) => `${c.count} ${GEM_CONFIG[c.gem].name}`).join(', ')})`
          : isSelected
            ? `Selected ${noble.name} (click to deselect)`
            : `${noble.name}: 3 prestige points. Requires ${costEntries.map((c) => `${c.count} ${GEM_CONFIG[c.gem].name}`).join(', ')} (click to invite)`
      }
    >
      {/* Noble Artwork Image: explicitly rounded to match inner border curve and clipped */}
      <img
        src={`/assets/nobles/${noble.id}.jpg`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-[6px] pointer-events-none select-none"
        style={{
          borderRadius: '6px',
          clipPath: 'inset(0 round 6px)',
        }}
      />

      {/* Top-right: Prestige points circular badge with subtle dark background and white border */}
      <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 lg:w-7 lg:h-7 rounded-full bg-black/60 backdrop-blur-xs border border-white/80 flex items-center justify-center shadow-sm select-none z-10 pointer-events-none">
        <span className="font-garamond font-bold text-xs sm:text-[13px] md:text-sm lg:text-[15px] leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          3
        </span>
      </div>

      {/* Left: Cost elements tagged vertically as rectangular blocks matching gem colors */}
      <div className="noble-cost-container relative z-10 h-full flex flex-col justify-center py-0.5 px-0.5 lg:p-1.5 gap-0.5 lg:gap-1.5 items-start w-fit shrink-0">
        {costEntries.map((c) => {
          const costConfig = GEM_CONFIG[c.gem];
          return (
            <div
              key={c.gem}
              className="noble-cost-item w-4 h-4.5 lg:w-5.5 lg:h-6.5 rounded-xs lg:rounded-sm flex items-center justify-center font-garamond font-bold text-xs lg:text-[15px] shadow-sm border border-white/80 select-none leading-none shrink-0"
              style={{ backgroundColor: costConfig.mainColor, color: costConfig.textColor }}
              title={`Requires ${c.count} ${costConfig.name} bonuses`}
            >
              {c.count}
            </div>
          );
        })}
      </div>
    </div>
  );
};
