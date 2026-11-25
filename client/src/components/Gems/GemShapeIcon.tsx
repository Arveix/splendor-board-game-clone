import type { JSX } from 'react';
import type { TokenType } from '../../types';

export const GemShapeIcon = ({
  gem,
  className = 'w-3 h-3 shrink-0',
}: {
  gem: TokenType | string;
  className?: string;
}): JSX.Element | null => {
  switch (gem) {
    case 'emerald':
      return (
        <img
          src="/assets/gems/emerald.png"
          alt="Emerald"
          className={`${className} object-contain shrink-0`}
        />
      );
    case 'sapphire':
      return (
        <img
          src="/assets/gems/sapphire.png"
          alt="Sapphire"
          className={`${className} object-contain shrink-0`}
        />
      );
    case 'ruby':
      return (
        <img
          src="/assets/gems/ruby.png"
          alt="Ruby"
          className={`${className} object-contain shrink-0`}
        />
      );
    case 'diamond':
      return (
        <img
          src="/assets/gems/diamond.png"
          alt="Diamond"
          className={`${className} object-contain shrink-0`}
        />
      );
    case 'onyx':
      return (
        <img
          src="/assets/gems/onyx.png"
          alt="Onyx"
          className={`${className} object-contain shrink-0`}
        />
      );
    case 'gold':
      return (
        <img
          src="/assets/gems/gold.png"
          alt="Gold"
          className={`${className} object-contain shrink-0`}
        />
      );
    default:
      return null;
  }
};
