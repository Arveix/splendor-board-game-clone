import { useEffect, useRef, useState, type JSX } from 'react';
import { getCardDetails, getNobleDetails } from '../../../utils/cardUtils';
import { GEM_IMAGES } from '../../../constants/gems';

export interface CardAnimationPayload {
  id: string;
  type: 'card';
  cardId?: string;
  tier?: 1 | 2 | 3;
  isFaceDown?: boolean;
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number; width: number; height: number };
}

export interface NobleAnimationPayload {
  id: string;
  type: 'noble';
  nobleId: string;
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number; width: number; height: number };
}

export type AnimationPayload = CardAnimationPayload | NobleAnimationPayload;
export type AnimationPayloadInput =
  | Omit<CardAnimationPayload, 'id'>
  | Omit<NobleAnimationPayload, 'id'>;

// Helper to render a gliding card
const AnimatedFlyingCard = ({ item }: { item: CardAnimationPayload }) => {
  const [animating, setAnimating] = useState<boolean>(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimating(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const dx = item.to.x - item.from.x;
  const dy = item.to.y - item.from.y;
  // Uniform scaling to strictly preserve card 180:250 aspect ratio without distortion
  const scale = item.from.width > 0 && item.to.width > 0 ? item.to.width / item.from.width : 1;

  const cardDetails = item.cardId ? getCardDetails(item.cardId) : null;
  const roman = item.tier === 3 ? 'III' : item.tier === 2 ? 'II' : 'I';

  return (
    <div
      style={{
        position: 'fixed',
        left: item.from.x,
        top: item.from.y,
        width: item.from.width,
        height: item.from.height,
        transformOrigin: 'top left',
        transform: animating
          ? `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`
          : 'translate3d(0, 0, 0) scale(1)',
        transition: 'transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 380ms ease-out',
        opacity: animating ? 0.95 : 1,
        zIndex: 9999,
        pointerEvents: 'none',
        clipPath: 'inset(0 round 8px)',
      }}
      className="rounded-lg overflow-hidden border-2 border-[#B8923A] shadow-2xl select-none"
    >
      {item.isFaceDown || !cardDetails ? (
        <div className="w-full h-full bg-[#1B1712] flex flex-col items-center justify-center p-2 text-center text-[#B8923A] rounded-[6px]">
          <span className="font-cinzel font-bold text-xl leading-none">{roman}</span>
        </div>
      ) : (
        <div
          className="relative w-full h-full flex flex-col justify-between rounded-[6px] overflow-hidden"
          style={{ clipPath: 'inset(0 round 6px)' }}
        >
          <img
            src={`/assets/cards/level${cardDetails.tier}/${cardDetails.id}.jpg`}
            alt=""
            className="absolute inset-0 w-full h-full object-cover rounded-[6px] pointer-events-none select-none"
            style={{ borderRadius: '6px', clipPath: 'inset(0 round 6px)' }}
          />
          {/* Header */}
          <div className="relative z-10 px-1 py-0.5 flex items-center justify-between bg-black/60 rounded-t-[6px]">
            <span className="font-garamond font-bold text-sm text-white drop-shadow">
              {cardDetails.points > 0 ? cardDetails.points : ''}
            </span>
            {GEM_IMAGES[cardDetails.bonus] && (
              <img
                src={GEM_IMAGES[cardDetails.bonus]}
                alt=""
                className="w-3.5 h-3.5 object-contain drop-shadow"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to render a gliding noble tile
const AnimatedFlyingNoble = ({ item }: { item: NobleAnimationPayload }) => {
  const [animating, setAnimating] = useState<boolean>(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimating(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const dx = item.to.x - item.from.x;
  const dy = item.to.y - item.from.y;
  // Uniform scaling to strictly preserve noble 140:164 aspect ratio without distortion
  const scale = item.from.width > 0 && item.to.width > 0 ? item.to.width / item.from.width : 1;
  const noble = getNobleDetails(item.nobleId);

  return (
    <div
      style={{
        position: 'fixed',
        left: item.from.x,
        top: item.from.y,
        width: item.from.width,
        height: item.from.height,
        transformOrigin: 'top left',
        transform: animating
          ? `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`
          : 'translate3d(0, 0, 0) scale(1)',
        transition: 'transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 420ms ease-out',
        opacity: animating ? 0.95 : 1,
        zIndex: 9999,
        pointerEvents: 'none',
        clipPath: 'inset(0 round 8px)',
      }}
      className="rounded-lg overflow-hidden border-2 border-[#B8923A] shadow-2xl select-none bg-cover bg-top"
    >
      {noble && (
        <img
          src={`/assets/nobles/${noble.id}.jpg`}
          alt=""
          className="w-full h-full object-cover rounded-[6px]"
          style={{ borderRadius: '6px', clipPath: 'inset(0 round 6px)' }}
        />
      )}
    </div>
  );
};

export const AnimationOverlay = ({
  animations,
  onAnimationEnd,
}: {
  animations: AnimationPayload[];
  onAnimationEnd: (id: string) => void;
}): JSX.Element | null => {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    // Schedule timers for any newly added animations
    animations.forEach((anim) => {
      if (!timersRef.current.has(anim.id)) {
        const duration = anim.type === 'noble' ? 440 : 400;
        const timer = setTimeout(() => {
          timersRef.current.delete(anim.id);
          onAnimationEnd(anim.id);
        }, duration);
        timersRef.current.set(anim.id, timer);
      }
    });

    // Clean up timers for animations that are no longer in the list
    const activeIds = new Set(animations.map((a) => a.id));
    timersRef.current.forEach((timer, id) => {
      if (!activeIds.has(id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });
  }, [animations, onAnimationEnd]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  if (animations.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {animations.map((anim) => {
        if (anim.type === 'card') {
          return <AnimatedFlyingCard key={anim.id} item={anim} />;
        }
        if (anim.type === 'noble') {
          return <AnimatedFlyingNoble key={anim.id} item={anim} />;
        }
        return null;
      })}
    </div>
  );
};
