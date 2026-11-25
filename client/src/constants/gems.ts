import type { GemType, TokenType } from '../types';

export interface GemConfig {
  name: string;
  colorName: string;
  mainColor: string;
  highlightColor: string;
  shadowColor: string;
  textColor: string;
  bgClass: string;
  textClass: string;
}

export const ALL_GEMS: GemType[] = ['emerald', 'sapphire', 'ruby', 'diamond', 'onyx'];
export const ALL_TOKENS: TokenType[] = ['emerald', 'sapphire', 'ruby', 'diamond', 'onyx', 'gold'];

// Single centralized source of truth mapping gem names to UI colors and metadata
export const GEM_CONFIG: Record<TokenType, GemConfig> = {
  emerald: {
    name: 'Emerald',
    colorName: 'Green',
    mainColor: '#2E9E5B',
    highlightColor: '#6FD79A',
    shadowColor: '#17613A',
    textColor: '#FFFFFF',
    bgClass: 'bg-[#2E9E5B]',
    textClass: 'text-[#FFFFFF]',
  },
  sapphire: {
    name: 'Sapphire',
    colorName: 'Blue',
    mainColor: '#2F6FD6',
    highlightColor: '#7FAAF0',
    shadowColor: '#1B4391',
    textColor: '#FFFFFF',
    bgClass: 'bg-[#2F6FD6]',
    textClass: 'text-[#FFFFFF]',
  },
  ruby: {
    name: 'Ruby',
    colorName: 'Red',
    mainColor: '#C8283B',
    highlightColor: '#F0707F',
    shadowColor: '#7E1523',
    textColor: '#FFFFFF',
    bgClass: 'bg-[#C8283B]',
    textClass: 'text-[#FFFFFF]',
  },
  diamond: {
    name: 'Diamond',
    colorName: 'White',
    mainColor: '#F2EEE4',
    highlightColor: '#FFFFFF',
    shadowColor: '#B9B2A0',
    textColor: '#2A1F14',
    bgClass: 'bg-[#F2EEE4]',
    textClass: 'text-[#2A1F14]',
  },
  onyx: {
    name: 'Onyx',
    colorName: 'Black',
    mainColor: '#2B2B33',
    highlightColor: '#6B6B78',
    shadowColor: '#111116',
    textColor: '#FFFFFF',
    bgClass: 'bg-[#2B2B33]',
    textClass: 'text-[#FFFFFF]',
  },
  gold: {
    name: 'Gold',
    colorName: 'Gold',
    mainColor: '#D4A83A',
    highlightColor: '#F3D679',
    shadowColor: '#8C6A17',
    textColor: '#2A1F14',
    bgClass: 'bg-[#D4A83A]',
    textClass: 'text-[#2A1F14]',
  },
};

export const GEM_IMAGES: Partial<Record<TokenType, string>> = {
  emerald: '/assets/gems/emerald.png',
  sapphire: '/assets/gems/sapphire.png',
  ruby: '/assets/gems/ruby.png',
  diamond: '/assets/gems/diamond.png',
  onyx: '/assets/gems/onyx.png',
  gold: '/assets/gems/gold.png',
};
