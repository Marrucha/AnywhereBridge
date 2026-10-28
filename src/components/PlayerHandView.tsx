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

  // Alternate black/red suits (S, H, C, D) or put trump first for clear visual separation
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
    <div
      className={`w-full bg-slate-900/95 backdrop-blur rounded-xl px-1.5 pt-1 pb-1.5 border-2 shadow-2xl shrink-0 transition-colors ${
        isMyTurn && phase === 'PLAYING'
          ? 'border-amber-400 ring-2 ring-amber-400/40'
          : 'border-slate-800'
      }`}
    >
      {/* Title & Turn Status Bar */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs px-1 pb-0.5 leading-none">
        <span className="font-bold text-slate-200">
          Twoja ręka ({seatName || (mySeat ? `${mySeat}` : 'Gracz')})
        </span>
        {hintMessage ? (
          <span className="text-amber-300 bg-amber-950/90 border border-amber-500/60 px-2 py-0.5 rounded-full font-extrabold text-[10px] sm:text-xs animate-bounce">
            {hintMessage}
          </span>
        ) : isMyTurn && phase === 'PLAYING' ? (
          <span className="text-amber-400 font-black animate-pulse text-[11px] sm:text-xs">
            👇 Twoja tura — dotknij karty!
          </span>
        ) : canIPlayDummy && phase === 'PLAYING' ? (
          <span className="text-cyan-300 font-black animate-pulse text-[11px] sm:text-xs">
            👆 Teraz graj kartą z Dziadka (u góry)!
          </span>
        ) : null}
      </div>

      {/* Full-width responsive card fan filling 100% of mobile screen width */}
      <div className="w-full flex items-end justify-center pt-2 pb-0.5 px-0.5 overflow-hidden">
        {orderedCards.map(({ card, isNewSuit }, idx) => {
          const isLast = idx === orderedCards.length - 1;
          const isPlayable = isMyTurn && phase === 'PLAYING' && isCardLegal(card, hand, leadCardSuit);
          return (
            <React.Fragment key={card.id}>
              {isNewSuit && <div className="w-1.5 sm:w-3 shrink-0" />}
              <div
                style={{ zIndex: idx + 1 }}
                className={
                  isLast
                    ? 'w-[64px] sm:w-[78px] shrink-0 flex justify-start'
                    : 'flex-1 min-w-0 max-w-[58px] sm:max-w-[72px] flex justify-start overflow-visible'
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
