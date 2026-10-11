import React from 'react';
import { Card, Suit } from '../types/bridge';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isHighlighted?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
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
  const colorClass = SUIT_COLORS[card.suit];

  const sizeClasses = {
    sm: 'w-8 h-12 text-xs rounded-sm',
    md: 'w-11 h-16 sm:w-14 sm:h-20 text-sm sm:text-base rounded-md',
    lg: 'w-14 h-20 sm:w-16 sm:h-24 text-base sm:text-lg rounded-lg',
  }[size];

  const clickableClasses = !disabled && isPlayable && onClick
    ? 'cursor-pointer active:scale-95 hover:-translate-y-2 transition-all shadow-md hover:shadow-xl'
    : 'cursor-default opacity-90';

  const disabledClasses = disabled || !isPlayable
    ? 'opacity-40 filter grayscale-[40%]'
    : '';

  const highlightClass = isHighlighted ? 'ring-2 ring-yellow-400 -translate-y-2' : '';

  return (
    <button
      type="button"
      onClick={!disabled && isPlayable ? onClick : undefined}
      disabled={disabled || !isPlayable}
      className={`relative bg-white select-none border border-slate-300 flex flex-col justify-between p-1 sm:p-1.5 shadow-sm font-bold ${sizeClasses} ${colorClass} ${clickableClasses} ${disabledClasses} ${highlightClass}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Top Left */}
      <div className="flex flex-col items-center leading-none text-left self-start">
        <span className="font-mono tracking-tighter">{card.rank === 'T' ? '10' : card.rank}</span>
        <span className="text-[1.1em]">{symbol}</span>
      </div>

      {/* Center symbol */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-2xl sm:text-3xl">
        {symbol}
      </div>

      {/* Bottom Right inverted */}
      <div className="flex flex-col items-center leading-none text-right self-end rotate-180">
        <span className="font-mono tracking-tighter">{card.rank === 'T' ? '10' : card.rank}</span>
        <span className="text-[1.1em]">{symbol}</span>
      </div>
    </button>
  );
};
