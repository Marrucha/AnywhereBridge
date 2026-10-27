import React from 'react';
import { Card, Seat, Suit } from '../types/bridge';
import { CardView } from './CardView';
import { isCardLegal } from '../logic/play';

interface PlayerHandViewProps {
  hand: Card[];
  isMyTurn: boolean;
  phase: string;
  leadCardSuit: string | null;
  onPlayCard: (cardId: string) => void;
  mySeat: Seat | null;
  seatName?: string;
  trumpSuit?: string;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_COLORS: Record<Suit, string> = {
  S: 'text-sky-300',
  H: 'text-rose-400',
  D: 'text-amber-400',
  C: 'text-emerald-400',
};

const RANK_ORDER = '23456789TJQKA';

export const PlayerHandView: React.FC<PlayerHandViewProps> = ({
  hand,
  isMyTurn,
  phase,
  leadCardSuit,
  onPlayCard,
  mySeat,
  seatName,
  trumpSuit,
}) => {
  if (!hand || hand.length === 0) return null;

  // Order suits: put trump on the left if suit contract, otherwise standard S, H, D, C
  const standardSuits: Suit[] = ['S', 'H', 'D', 'C'];
  const suitsOrder: Suit[] =
    trumpSuit && trumpSuit !== 'NT'
      ? [trumpSuit as Suit, ...standardSuits.filter(s => s !== trumpSuit)]
      : standardSuits;

  // Group cards by suit and sort descending within suit
  const cardsBySuit: Record<Suit, Card[]> = {
    S: [],
    H: [],
    D: [],
    C: [],
  };

  hand.forEach(card => {
    if (cardsBySuit[card.suit]) {
      cardsBySuit[card.suit].push(card);
    }
  });

  suitsOrder.forEach(suit => {
    cardsBySuit[suit].sort((a, b) => RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank));
  });

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/90 backdrop-blur rounded-xl p-1 sm:p-1.5 border border-slate-800 shadow-xl shrink-0">
      {/* Title bar */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pb-0.5 leading-none">
        <span className="font-semibold">Twoja ręka ({seatName || (mySeat ? `Południe (${mySeat})` : 'Widz')})</span>
        {isMyTurn && phase === 'PLAYING' && (
          <span className="text-amber-400 font-black animate-pulse text-[10px]">
            👉 Twoja tura do zagrania karty!
          </span>
        )}
      </div>

      {/* Cards grouped by suit with overlapping cards - exactly like Dummy */}
      <div className="flex items-center justify-center gap-1 sm:gap-2.5 overflow-x-auto scrollbar-none py-0.5 px-0.5">
        {suitsOrder.map(suit => {
          const suitCards = cardsBySuit[suit];
          if (suitCards.length === 0) return null;

          return (
            <div
              key={suit}
              className="flex items-center bg-slate-950/80 rounded-lg px-1 py-0.5 border border-slate-800 shrink-0"
            >
              {/* Suit marker */}
              <span className={`text-xs sm:text-sm font-black mr-1 ${SUIT_COLORS[suit]}`}>
                {SUIT_SYMBOLS[suit]}
              </span>

              {/* Overlapped cards within suit */}
              <div className="flex items-center">
                {suitCards.map((card, idx) => {
                  const isPlayable = isMyTurn && phase === 'PLAYING' && isCardLegal(card, hand, leadCardSuit);
                  return (
                    <div
                      key={card.id}
                      className={`transition-transform ${
                        idx > 0 ? '-ml-5 sm:-ml-6' : ''
                      } ${isPlayable ? 'hover:-translate-y-1.5 z-20' : 'z-10'}`}
                    >
                      <CardView
                        card={card}
                        size="md"
                        isPlayable={isPlayable}
                        isHighlighted={isPlayable}
                        onClick={() => {
                          if (isPlayable) onPlayCard(card.id);
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
