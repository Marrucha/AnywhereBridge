import React, { useState } from 'react';
import { Card, Seat, Suit } from '../types/bridge';
import { CardView } from './CardView';
import { isCardLegal } from '../logic/play';

interface PlayerHandViewProps {
  hand: Card[];
  isMyTurn: boolean;
  canIPlayDummy?: boolean;
  currentTurn?: Seat | null;
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

const RANK_ORDER = '23456789TJQKA';

export const PlayerHandView: React.FC<PlayerHandViewProps> = ({
  hand,
  isMyTurn,
  canIPlayDummy = false,
  currentTurn,
  phase,
  leadCardSuit,
  onPlayCard,
  mySeat,
  seatName,
  trumpSuit,
}) => {
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  if (!hand || hand.length === 0) return null;

  // Always sort suits: Spades (pik), Hearts (kier), Clubs (trefl), Diamonds (karo)
  const suitsOrder: Suit[] = ['S', 'H', 'C', 'D'];

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
    }, 2600);
  };

  const handleInvalidTap = (card: Card) => {
    if (phase === 'BIDDING') {
      showHint('Trwa licytacja — wybierz odzywkę z panelu licytacji.');
      return;
    }
    if (phase !== 'PLAYING') return;

    if (canIPlayDummy) {
      showHint('👆 Teraz ruch Dziadka — kliknij kartę U GÓRY ekranu!');
      return;
    }
    if (!isMyTurn) {
      showHint(`⏳ Poczekaj — teraz ruch gracza ${currentTurn || ''}.`);
      return;
    }
    if (leadCardSuit && !isCardLegal(card, hand, leadCardSuit)) {
      const sym = SUIT_SYMBOLS[leadCardSuit as Suit] || leadCardSuit;
      showHint(`⚠️ Musisz dołożyć do koloru wyjścia (${sym})!`);
    }
  };

  return (
    <div className="w-full relative flex flex-col items-center shrink-0">
      {/* Floating hint toast when invalid card is tapped */}
      {hintMessage && (
        <div className="absolute -top-6 z-30 text-amber-200 bg-slate-950/95 border border-amber-400 px-3 py-0.5 rounded-full font-extrabold text-[11px] shadow-xl animate-bounce pointer-events-none">
          {hintMessage}
        </div>
      )}

      {/* Full-width responsive card fan directly on the felt (no bulky background bar) */}
      <div className="w-full flex items-end justify-center pt-1 pb-0.5 px-1 overflow-visible">
        {orderedCards.map(({ card, isNewSuit }, idx) => {
          const isLast = idx === orderedCards.length - 1;
          const isPlayable = isMyTurn && phase === 'PLAYING' && isCardLegal(card, hand, leadCardSuit);
          return (
            <React.Fragment key={card.id}>
              {isNewSuit && <div className="w-1.5 land:w-2 desk:w-3 shrink-0" />}
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
                  onClick={() => onPlayCard(card.id)}
                  onDisabledClick={() => handleInvalidTap(card)}
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
