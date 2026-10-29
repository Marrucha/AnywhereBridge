import React from 'react';
import { Card, Suit } from '../types/bridge';
import { CardFigureArt } from './CardFigureArt';

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  onDisabledClick?: () => void;
  disabled?: boolean;
  isPlayable?: boolean;
  size?: 'sm' | 'dummy' | 'topDummy' | 'md' | 'lg' | 'player';
  isHighlighted?: boolean;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_TEXT_COLORS: Record<Suit, string> = {
  S: 'text-slate-950',
  H: 'text-red-600',
  D: 'text-orange-500',
  C: 'text-green-600',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  onClick,
  onDisabledClick,
  disabled = false,
  isPlayable = true,
  size = 'md',
  isHighlighted = false,
}) => {
  const symbol = SUIT_SYMBOLS[card.suit];
  const textColor = SUIT_TEXT_COLORS[card.suit];
  const rankLabel = card.rank === 'T' ? '10' : card.rank;
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = React.useRef<number>(0);

  const sizeClasses = {
    sm: 'w-7 h-10 desk:w-9 desk:h-13 text-[9px] desk:text-[10px] rounded',
    dummy: 'w-[32px] h-[46px] land:w-[28px] land:h-[40px] desk:w-[42px] desk:h-[62px] text-[10px] desk:text-xs rounded-md',
    topDummy: 'w-[52px] h-[74px] land:w-[48px] land:h-[66px] desk:w-[64px] desk:h-[96px] text-xs desk:text-base rounded-lg shadow',
    md: 'w-[46px] h-[68px] land:w-[40px] land:h-[58px] desk:w-[58px] desk:h-[86px] text-xs desk:text-sm rounded-lg shadow',
    lg: 'w-[54px] h-[80px] land:w-[46px] land:h-[68px] desk:w-[68px] desk:h-[100px] text-sm desk:text-base rounded-xl shadow-lg',
    player: 'w-[60px] h-[86px] land:w-[50px] land:h-[68px] desk:w-[76px] desk:h-[110px] text-[15px] land:text-[13px] desk:text-xl rounded-xl shadow-md',
  }[size];

  const canActivate = !disabled && isPlayable && !!onClick;

  const interactionClasses = canActivate
    ? 'cursor-pointer -translate-y-1 transition-transform duration-75'
    : 'cursor-pointer transition-transform duration-75';

  const borderClass = isHighlighted || canActivate
    ? 'border-2 border-amber-400 ring-1 ring-amber-400/70'
    : 'border-[1.5px] border-slate-500';

  const triggerCardAction = () => {
    if (canActivate && onClick) {
      onClick();
    } else if (onDisabledClick) {
      onDisabledClick();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.hypot(dx, dy) < 28) {
      lastTouchTimeRef.current = Date.now();
      triggerCardAction();
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Date.now() - lastTouchTimeRef.current < 450) return;
    triggerCardAction();
  };

  return (
    <button
      type="button"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleCardClick}
      className={`relative select-none box-border overflow-hidden shrink-0 font-bold ${sizeClasses} ${textColor} ${interactionClasses} ${borderClass}`}
      style={{ touchAction: 'manipulation', backgroundColor: '#ffffff', opacity: 1 }}
    >
      {/* Top Left Rank & Pip - positioned in left 21px strip so overlapped cards never hide it */}
      <div className="absolute top-0.5 left-0.5 w-[21px] sm:w-[24px] flex flex-col items-center leading-none pointer-events-none z-10">
        <span className="font-mono font-black text-[1.1em] tracking-tighter leading-none">{rankLabel}</span>
        <span className="text-[1.15em] leading-none mt-0.5">{symbol}</span>
      </div>

      {/* Center Figure / Pip Art */}
      <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden pointer-events-none">
        <CardFigureArt rank={card.rank} suit={card.suit} />
      </div>

      {/* Bottom Right Inverted Rank & Pip */}
      <div className="absolute bottom-0.5 right-0.5 w-[21px] sm:w-[24px] flex flex-col items-center leading-none rotate-180 pointer-events-none z-10">
        <span className="font-mono font-black text-[1.1em] tracking-tighter leading-none">{rankLabel}</span>
        <span className="text-[1.15em] leading-none mt-0.5">{symbol}</span>
      </div>
    </button>
  );
};
