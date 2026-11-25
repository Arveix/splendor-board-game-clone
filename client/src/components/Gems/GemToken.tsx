import type { JSX } from 'react';
import type { TokenType } from '../../types';
import { GEM_CONFIG } from '../../constants/gems';

export const GemToken = ({
  gem,
  size = 48,
  className = '',
}: {
  gem: TokenType;
  size?: number;
  className?: string;
}): JSX.Element => {
  const config = GEM_CONFIG[gem];
  const clipId = `token-parchment-clip-${gem}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`shrink-0 select-none rounded-full ${className}`}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="29" />
        </clipPath>
      </defs>

      {/* Parchment background base and texture */}
      <circle cx="32" cy="32" r="29" fill="#E8DCC0" />
      <image
        href="/assets/parchment.jpg"
        xlinkHref="/assets/parchment.jpg"
        x="0"
        y="0"
        width="64"
        height="64"
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Gem-colored border around the token */}
      <circle
        cx="32"
        cy="32"
        r="28.5"
        fill="none"
        stroke={config.mainColor}
        strokeWidth="3.5"
      />

      {/* Outer hairline trim for depth */}
      <circle
        cx="32"
        cy="32"
        r="30.5"
        fill="none"
        stroke={config.shadowColor}
        strokeWidth="1"
        opacity="0.45"
      />

      {/* Center faceted gem image or gold star badge */}
      <g transform="translate(32, 32)">
        {gem === 'emerald' && (
          <image
            href="/assets/gems/emerald.png"
            xlinkHref="/assets/gems/emerald.png"
            x="-22"
            y="-15.5"
            width="44"
            height="31"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {gem === 'sapphire' && (
          <image
            href="/assets/gems/sapphire.png"
            xlinkHref="/assets/gems/sapphire.png"
            x="-22"
            y="-18"
            width="44"
            height="36"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {gem === 'ruby' && (
          <image
            href="/assets/gems/ruby.png"
            xlinkHref="/assets/gems/ruby.png"
            x="-21"
            y="-21"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {gem === 'diamond' && (
          <image
            href="/assets/gems/diamond.png"
            xlinkHref="/assets/gems/diamond.png"
            x="-22"
            y="-15.5"
            width="44"
            height="31"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {gem === 'onyx' && (
          <image
            href="/assets/gems/onyx.png"
            xlinkHref="/assets/gems/onyx.png"
            x="-21"
            y="-21"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {gem === 'gold' && (
          <image
            href="/assets/gems/gold.png"
            xlinkHref="/assets/gems/gold.png"
            x="-20"
            y="-22"
            width="40"
            height="44"
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </g>
    </svg>
  );
};
