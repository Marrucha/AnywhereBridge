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

  // Always sort suits: Spades (pik), Hearts (kier), Clubs (trefl), Diamonds (karo)
  const suitsOrder: Suit[] = ['S', 'H', 'C', 'D'];

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
    <div className="w-full relative flex flex-col items-center shrink-0">
      {hintMessage && (
        <div className="absolute -bottom-5 z-30 text-amber-200 bg-rose-950/95 border border-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-lg animate-bounce pointer-events-none">
          {hintMessage}
        </div>
      )}

      {/* Full-width responsive card fan for Dummy directly on felt (no bulky wrapper bar) */}
      <div className="w-full flex items-end justify-center pt-1 pb-0.5 px-1 overflow-visible">
        {orderedCards.map(({ card, isNewSuit }, idx) => {
          const isLast = idx === orderedCards.length - 1;
          const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
          return (
            <React.Fragment key={card.id}>
              {isNewSuit && <div className="w-1.5 land:w-2 desk:w-2.5 shrink-0" />}
              <div
                style={{ zIndex: idx + 1 }}
                className={
                  isLast
                    ? 'relative w-[62px] land:w-[56px] desk:w-[78px] shrink-0 flex justify-start'
                    : 'relative flex-1 min-w-0 max-w-[56px] land:max-w-[52px] desk:max-w-[72px] flex justify-start overflow-visible'
                }
              >
                <CardView
                  card={card}
                  size="player"
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
