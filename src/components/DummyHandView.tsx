import React, { useState } from 'react';
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
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  if (!dummyHand || dummyHand.length === 0) return null;

  const isOpponent = mySeat
    ? (mySeat === 'N' || mySeat === 'S')
      ? (dummySeat === 'E' || dummySeat === 'W')
      : (dummySeat === 'N' || dummySeat === 'S')
    : (dummySeat === 'E' || dummySeat === 'W');

  const standardSuits: Suit[] = ['S', 'H', 'C', 'D'];
  const suitsOrder: Suit[] =
    trumpSuit && trumpSuit !== 'NT'
      ? [trumpSuit as Suit, ...standardSuits.filter(s => s !== trumpSuit)]
      : standardSuits;

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

  const orderedCards: { card: Card; isNewSuit: boolean }[] = [];
  let seenAnySuit = false;
  suitsOrder.forEach(suit => {
    const suitCards = cardsBySuit[suit];
    if (suitCards.length === 0) return;
    suitCards.forEach((card, idx) => {
      orderedCards.push({
        card,
        isNewSuit: seenAnySuit && idx === 0,
      });
    });
    seenAnySuit = true;
  });

  const showHint = (msg: string) => {
    setHintMessage(msg);
    setTimeout(() => {
      setHintMessage(prev => (prev === msg ? null : prev));
    }, 2400);
  };

  const handleInvalidDummyTap = (card: Card) => {
    if (!canIPlayDummy) {
      showHint('👇 Teraz zagraj kartę ze swojej ręki na dole (lub poczekaj na ruch)!');
      return;
    }
    if (leadCardSuit && !isCardLegal(card, dummyHand, leadCardSuit)) {
      const sym = SUIT_SYMBOLS[leadCardSuit as Suit] || leadCardSuit;
      showHint(`⚠️ Dziadek musi dołożyć do koloru (${sym})!`);
    }
  };

  return (
    <div
      className={`w-full my-0.5 px-1.5 py-1 rounded-xl border-2 transition-all shrink-0 ${
        canIPlayDummy
          ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/60 shadow-lg'
          : isOpponent
          ? 'bg-slate-950/95 border-amber-500/50 shadow-md'
          : 'bg-slate-950/90 border-slate-700/80'
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold px-1 pb-0.5 leading-none">
        <div className="flex items-center gap-1.5 text-slate-200 flex-wrap">
          <span className="text-amber-400 font-black">
            🂠 DZIADEK: {seatName || SEAT_FULL_NAMES[dummySeat]} ({dummySeat})
          </span>
          {declarerSeat && (
            <span className="text-slate-400 text-[10px] hidden sm:inline">
              (Rozgrywa: {SEAT_FULL_NAMES[declarerSeat]})
            </span>
          )}
        </div>

        {hintMessage ? (
          <span className="text-amber-200 bg-rose-950/90 border border-amber-400 px-2 py-0.5 rounded-full text-[10px] font-black animate-bounce">
            {hintMessage}
          </span>
        ) : canIPlayDummy ? (
          <span className="text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black animate-pulse border border-amber-400/60">
            👆 Twoja tura z Dziadka — dotknij karty!
          </span>
        ) : (
          <span className="text-slate-400 text-[10px]">
            {dummyHand.length} kart
          </span>
        )}
      </div>

      {/* Full-width responsive card fan for Dummy at top */}
      <div className="w-full flex items-end justify-center pt-1.5 pb-0.5 px-0.5 overflow-hidden">
        {orderedCards.map(({ card, isNewSuit }, idx) => {
          const isLast = idx === orderedCards.length - 1;
          const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
          return (
            <React.Fragment key={card.id}>
              {isNewSuit && <div className="w-1.5 sm:w-2.5 shrink-0" />}
              <div
                style={{ zIndex: idx + 1 }}
                className={
                  isLast
                    ? 'w-[54px] sm:w-[64px] shrink-0 flex justify-start'
                    : 'flex-1 min-w-0 max-w-[48px] sm:max-w-[58px] flex justify-start overflow-visible'
                }
              >
                <CardView
                  card={card}
                  size="topDummy"
                  isPlayable={isPlayable}
                  isHighlighted={isPlayable}
                  onClick={() => {
                    if (canIPlayDummy && isPlayable) onPlayCard(card.id);
                  }}
                  onDisabledClick={() => handleInvalidDummyTap(card)}
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
