import React from 'react';
import { Card, Seat, Suit } from '../types/bridge';
import { CardView } from './CardView';
import { isCardLegal } from '../logic/play';

interface SideDummyHandViewProps {
  dummySeat: 'E' | 'W';
  dummyHand: Card[];
  trumpSuit?: string;
  canIPlayDummy?: boolean;
  leadCardSuit?: string | null;
  onPlayCard?: (cardId: string) => void;
  seatName?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
  NT: '',
};

const SUIT_COLORS: Record<Suit, string> = {
  S: 'text-slate-950 bg-white/95 rounded px-0.5',
  H: 'text-red-500',
  D: 'text-orange-500',
  C: 'text-green-500',
  NT: '',
};

const RANK_ORDER = '23456789TJQKA';

export const SideDummyHandView: React.FC<SideDummyHandViewProps> = ({
  dummySeat,
  dummyHand,
  trumpSuit,
  canIPlayDummy = false,
  leadCardSuit = null,
  onPlayCard,
  seatName,
}) => {
  if (!dummyHand || dummyHand.length === 0) return null;

  // Always sort suits: Spades (pik), Hearts (kier), Clubs (trefl), Diamonds (karo)
  const suitsOrder: Suit[] = ['S', 'H', 'C', 'D'];

  const cardsBySuit: Record<Suit, Card[]> = {
    S: [],
    H: [],
    D: [],
    C: [],
    NT: [],
  };

  dummyHand.forEach(card => {
    cardsBySuit[card.suit].push(card);
  });

  suitsOrder.forEach(suit => {
    cardsBySuit[suit].sort((a, b) => RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank));
  });

  return (
    <div className="flex flex-col gap-1 bg-slate-950/90 border-2 border-amber-400/80 rounded-xl p-1 sm:p-1.5 shadow-2xl w-full min-w-0 animate-fadeIn overflow-hidden">
      {/* Header */}
      <div className="text-center pb-0.5 border-b border-slate-700/80 leading-tight flex flex-col items-center justify-center">
        <span className="text-sm sm:text-base font-black text-white leading-none">{dummySeat}</span>
        {seatName && (
          <span className="text-[10px] sm:text-xs font-bold text-slate-300 leading-tight truncate max-w-full">
            {seatName}
          </span>
        )}
      </div>

      {/* 4 Suits rendered with full-size player cards ("player" - exact same size as S!) */}
      <div className="flex flex-col gap-1 pt-0.5">
        {suitsOrder.map((suit, sIdx) => {
          const cards = cardsBySuit[suit];
          if (cards.length === 0) return null;
          return (
            <div
              key={suit}
              className={`flex items-center min-w-0 ${sIdx > 0 ? '-mt-7 land:-mt-8 sm:-mt-5' : ''}`}
              style={{ zIndex: sIdx + 1 }}
            >
              <div className="flex items-center w-full overflow-visible">
                {cards.map((card, idx) => {
                  const isLast = idx === cards.length - 1;
                  const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
                  return (
                    <div
                      key={card.id}
                      style={{ zIndex: idx + 1 }}
                      className={
                        isLast
                          ? 'relative w-[60px] land:w-[50px] desk:w-[76px] shrink-0 flex justify-start'
                          : 'relative flex-1 min-w-0 max-w-[34px] land:max-w-[30px] desk:max-w-[48px] flex justify-start overflow-visible'
                      }
                    >
                      <CardView
                        card={card}
                        size="player"
                        isPlayable={isPlayable}
                        isHighlighted={isPlayable}
                        onClick={() => {
                          if (canIPlayDummy && isPlayable && onPlayCard) onPlayCard(card.id);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
