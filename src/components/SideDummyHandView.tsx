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
  S: 'text-sky-300',
  H: 'text-rose-400',
  D: 'text-amber-400',
  C: 'text-emerald-400',
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
    <div className="flex flex-col gap-0.5 bg-slate-950/95 border-2 border-amber-400/80 rounded-xl p-0.5 sm:p-1 shadow-2xl shrink-0 animate-fadeIn max-h-[96%] overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="text-center pb-0.5 border-b border-slate-700/80 leading-tight">
        <div className="text-[10px] sm:text-xs font-black text-amber-300">
          🂠 Dziadek ({dummySeat})
        </div>
        <div className="text-[9px] text-slate-400 font-semibold truncate max-w-[120px] sm:max-w-[160px]">
          {seatName || (dummySeat === 'E' ? 'Wschód' : 'Zachód')} ({dummyHand.length})
        </div>
      </div>

      {/* 4 Suits in bridge column notation with REAL PLAYING CARDS (SAME SIZE AS DUMMY N: size="dummy") */}
      <div className="space-y-0.5 sm:space-y-1 pt-0.5">
        {suitsOrder.map(suit => {
          const cards = cardsBySuit[suit];
          return (
            <div key={suit} className="flex items-center gap-0.5 sm:gap-1 min-h-[42px] sm:min-h-[56px]">
              {/* Suit marker */}
              <span className={`text-sm sm:text-base font-black w-3.5 sm:w-4 text-center shrink-0 ${SUIT_COLORS[suit]}`}>
                {SUIT_SYMBOLS[suit]}
              </span>

              {/* Real playing cards with overlap - EXACT same size as dummy N */}
              <div className="flex items-center">
                {cards.length === 0 ? (
                  <span className="text-xs text-slate-500 font-mono pl-1">—</span>
                ) : (
                  cards.map((card, idx) => {
                    const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
                    return (
                      <div
                        key={card.id}
                        className={`transition-transform ${
                          idx > 0 ? '-ml-[18px] sm:-ml-[23px]' : ''
                        } ${isPlayable ? 'hover:-translate-y-1 z-20' : 'z-10'}`}
                      >
                        <CardView
                          card={card}
                          size="dummy"
                          isPlayable={isPlayable}
                          isHighlighted={isPlayable}
                          onClick={() => {
                            if (canIPlayDummy && isPlayable && onPlayCard) onPlayCard(card.id);
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
