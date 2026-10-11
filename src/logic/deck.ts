import { Card, Rank, Seat, Suit } from '../types/bridge';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'T': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealDeck(deck: Card[]): Record<Seat, Card[]> {
  const shuffled = shuffleDeck(deck);
  const hands: Record<Seat, Card[]> = {
    N: sortHand(shuffled.slice(0, 13)),
    E: sortHand(shuffled.slice(13, 26)),
    S: sortHand(shuffled.slice(26, 39)),
    W: sortHand(shuffled.slice(39, 52)),
  };
  return hands;
}

/**
 * Sorts cards by bridge standard: Spades, Hearts, Diamonds, Clubs,
 * and within suit descending by rank: A, K, Q, J, 10, 9...
 */
export function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    S: 0,
    H: 1,
    D: 2,
    C: 3,
  };

  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });
}
