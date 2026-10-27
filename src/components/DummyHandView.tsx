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
  declarerSeat?: Seat | null;
  mySeat?: Seat | null;
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

const SEAT_FULL_NAMES: Record<Seat, string> = {
  N: 'Północ (N)',
  E: 'Wschód (E)',
  S: 'Południe (S)',
  W: 'Zachód (W)',
};

export const DummyHandView: React.FC<DummyHandViewProps> = ({
  dummySeat,
  dummyHand,
  canIPlayDummy,
  leadCardSuit,
  onPlayCard,
  seatName,
  trumpSuit,
  declarerSeat,
  mySeat,
}) => {
  if (!dummyHand || dummyHand.length === 0) return null;

  const isOpponent = mySeat
    ? (mySeat === 'N' || mySeat === 'S')
      ? (dummySeat === 'E' || dummySeat === 'W')
      : (dummySeat === 'N' || dummySeat === 'S')
    : (dummySeat === 'E' || dummySeat === 'W');

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
      className={`w-full max-w-xl mx-auto my-0.5 px-1.5 py-1 rounded-xl border transition-all shrink-0 ${
        canIPlayDummy
          ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/60 shadow-md shadow-amber-500/20'
          : isOpponent
          ? 'bg-slate-950/95 border-amber-500/50 shadow-md'
          : 'bg-slate-950/90 border-slate-700/80'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold px-1 pb-0.5 leading-none">
        <div className="flex items-center gap-1.5 text-slate-200 flex-wrap">
          <span className="text-amber-400 font-black">
            🂠 DZIADEK: {SEAT_FULL_NAMES[dummySeat]}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black ${
              isOpponent
                ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                : 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
            }`}
          >
            {isOpponent ? 'PRZECIWNIK' : 'TWÓJ PARTNER'}
          </span>
          {declarerSeat && (
            <span className="text-slate-400 text-[10px] hidden sm:inline">
              (Rozgrywa: {SEAT_FULL_NAMES[declarerSeat]})
            </span>
          )}
          <span className="text-slate-400 text-[10px]">({dummyHand.length} kart)</span>
        </div>

        {canIPlayDummy ? (
          <span className="text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse border border-amber-400/60">
            👉 Wybierz kartę z Dziadka
          </span>
        ) : (
          <span className="text-slate-300 text-[10px] bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/80">
            {isOpponent ? 'Karty wyłożone na stół' : 'Karty odkryte dla stołu'}
          </span>
        )}
      </div>

      {/* Cards grouped by suit - single horizontal row, cleanly fitting on screen */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-2 overflow-x-hidden sm:overflow-x-auto py-0.5 px-0.5">
        {suitsOrder.map(suit => {
          const suitCards = cardsBySuit[suit];
          if (suitCards.length === 0) return null;

          return (
            <div
              key={suit}
              className="flex items-center bg-slate-900/80 rounded-md sm:rounded-lg px-0.5 sm:px-1 py-0.5 border border-slate-700 shrink-0"
            >
              {/* Suit marker */}
              <span className={`text-[10px] sm:text-xs font-black mr-0.5 shrink-0 ${SUIT_COLORS[suit]}`}>
                {SUIT_SYMBOLS[suit]}
              </span>

              {/* Overlapped cards within suit (size="dummy" is ~10% smaller than hand cards) */}
              <div className="flex items-center">
                {suitCards.map((card, idx) => {
                  const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
                  return (
                    <div
                      key={card.id}
                      className={`transition-transform ${
                        idx > 0 ? '-ml-[21px] sm:-ml-6' : ''
                      } ${isPlayable ? 'hover:-translate-y-1 z-20' : 'z-10'}`}
                    >
                      <CardView
                        card={card}
                        size="dummy"
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
