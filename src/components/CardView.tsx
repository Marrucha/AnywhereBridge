import React from 'react';
import { Card, Suit } from '../types/bridge';
import { CardFigureArt } from './CardFigureArt';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: 'sm' | 'dummy' | 'md' | 'lg';
  isHighlighted?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_TEXT_COLORS: Record<Suit, string> = {
  S: 'text-slate-900',
  H: 'text-rose-600',
  D: 'text-amber-600',
  C: 'text-emerald-800',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  onClick,
  disabled = false,
  isPlayable = true,
  size = 'md',
  isHighlighted = false,
}) => {
  const symbol = SUIT_SYMBOLS[card.suit];
  const textColor = SUIT_TEXT_COLORS[card.suit];
  const rankLabel = card.rank === 'T' ? '10' : card.rank;

  // Calibrated responsive sizes: 'dummy' is exactly ~10% smaller than 'md' (hand)
  const sizeClasses = {
    sm: 'w-7 h-10 sm:w-9 sm:h-13 text-[9px] sm:text-[10px] rounded',
    dummy: 'w-[39px] h-[58px] sm:w-[48px] sm:h-[72px] text-[10px] sm:text-xs rounded-md',
    md: 'w-11 h-16 sm:w-14 sm:h-20 text-xs sm:text-sm rounded-lg',
    lg: 'w-13 h-19 sm:w-16 sm:h-24 text-sm sm:text-base rounded-xl',
  }[size];

  // Distinct interactive states without blurry shadows
  const interactionClasses = !disabled && isPlayable && onClick
    ? 'cursor-pointer hover:-translate-y-1 active:translate-y-0.5 transition-transform'
    : 'cursor-default';

  const borderClass = isHighlighted || (!disabled && isPlayable && onClick)
    ? 'border-2 border-amber-400 ring-2 ring-amber-400/60'
    : 'border-2 border-slate-700/80';

  const opacityClass = disabled || !isPlayable ? 'opacity-85' : 'opacity-100';

  return (
    <button
      type="button"
      onClick={!disabled && isPlayable ? onClick : undefined}
      disabled={disabled || !isPlayable}
      className={`relative bg-white select-none box-border overflow-hidden shrink-0 font-bold ${sizeClasses} ${textColor} ${interactionClasses} ${borderClass} ${opacityClass}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Top Left Rank & Pip */}
      <div className="absolute top-0.5 left-1 flex flex-col items-center leading-none pointer-events-none z-10">
        <span className="font-mono font-black text-[1.05em] tracking-tighter">{rankLabel}</span>
        <span className="text-[1.15em] leading-none">{symbol}</span>
      </div>

      {/* Center Figure / Pip Art (Clean vector illustration, NO blurry watermark shadows) */}
      <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden pointer-events-none">
        <CardFigureArt rank={card.rank} suit={card.suit} />
      </div>

      {/* Bottom Right Inverted Rank & Pip (strictly kept inside card via absolute positioning & overflow-hidden) */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-none rotate-180 pointer-events-none z-10">
        <span className="font-mono font-black text-[1.05em] tracking-tighter">{rankLabel}</span>
        <span className="text-[1.15em] leading-none">{symbol}</span>
      </div>
    </button>
  );
};
