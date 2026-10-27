import React from 'react';
import { Card, Seat, Suit } from '../types/bridge';
import { CardView } from './CardView';
import { isCardLegal } from '../logic/play';

interface DummyHandViewProps {
  dummySeat: Seat;
  dummyHand: Card[];
  canIPlayDummy: boolean;
  leadCardSuit: string | null;
  onPlayCard: (cardId: string) => void;
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

export const DummyHandView: React.FC<DummyHandViewProps> = ({
  dummySeat,
  dummyHand,
  canIPlayDummy,
  leadCardSuit,
  onPlayCard,
  seatName,
  trumpSuit,
}) => {
  if (!dummyHand || dummyHand.length === 0) return null;

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

  dummyHand.forEach(card => {
    cardsBySuit[card.suit].push(card);
  });

  suitsOrder.forEach(suit => {
    cardsBySuit[suit].sort((a, b) => RANK_ORDER.indexOf(b.rank) - RANK_ORDER.indexOf(a.rank));
  });

  return (
    <div
      className={`w-full max-w-xl mx-auto my-1 px-2 py-1 rounded-2xl border transition-all shadow-lg ${
        canIPlayDummy
          ? 'bg-amber-950/40 border-amber-400/80 ring-2 ring-amber-400/50 shadow-amber-500/10'
          : 'bg-slate-950/85 border-slate-700/80'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between text-[11px] font-bold px-1 pb-1">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-amber-400 font-black">Dziadek ({dummySeat}):</span>
          <span className="text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[180px]">
            {seatName || dummySeat}
          </span>
          <span className="text-slate-500 text-[10px]">({dummyHand.length} kart)</span>
        </div>

        {canIPlayDummy ? (
          <span className="text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black animate-pulse border border-amber-400/50">
            👉 Wybierz kartę z Dziadka
          </span>
        ) : (
          <span className="text-slate-400 text-[10px]">Karty odkryte dla stołu</span>
        )}
      </div>

      {/* Cards grouped by suit - optimized for mobile width */}
      <div className="flex items-center justify-center gap-1 sm:gap-3 overflow-x-auto py-0.5 scrollbar-none">
        {suitsOrder.map(suit => {
          const suitCards = cardsBySuit[suit];
          if (suitCards.length === 0) return null;

          return (
            <div key={suit} className="flex items-center bg-slate-900/60 rounded-lg px-1 py-0.5 border border-slate-800 shrink-0">
              {/* Suit marker */}
              <span className={`text-xs sm:text-sm font-black mr-1 ${SUIT_COLORS[suit]}`}>
                {SUIT_SYMBOLS[suit]}
              </span>

              {/* Overlapped cards within suit */}
              <div className="flex items-center">
                {suitCards.map((card, idx) => {
                  const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
                  return (
                    <div
                      key={card.id}
                      className={`transition-transform ${
                        idx > 0 ? '-ml-4 sm:-ml-3' : ''
                      } ${isPlayable ? 'hover:-translate-y-1.5 z-10' : ''}`}
                    >
                      <CardView
                        card={card}
                        size="sm"
                        isPlayable={isPlayable}
                        isHighlighted={isPlayable}
                        onClick={() => {
                          if (canIPlayDummy && isPlayable) onPlayCard(card.id);
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
