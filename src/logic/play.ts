import { Card, PlayedCard, Seat, Trick, TrumpSuit } from '../types/bridge';
import { RANK_VALUES } from './deck';

export function getLegalCards(hand: Card[], leadSuit: string | null): Card[] {
  if (!leadSuit) {
    return hand;
  }
  const cardsInSuit = hand.filter(c => c.suit === leadSuit);
  if (cardsInSuit.length > 0) {
    return cardsInSuit;
  }
  return hand;
}

export function isCardLegal(card: Card, hand: Card[], leadSuit: string | null): boolean {
  if (!leadSuit) {
    return true;
  }
  const hasSuit = hand.some(c => c.suit === leadSuit);
  if (hasSuit) {
    return card.suit === leadSuit;
  }
  return true;
}

export function determineTrickWinner(trick: Trick, trumpSuit: TrumpSuit): Seat {
  if (trick.cards.length === 0) {
    return trick.leadSeat;
  }

  const leadSuit = trick.cards[0].card.suit;
  let winningPlayedCard: PlayedCard = trick.cards[0];

  for (let i = 1; i < trick.cards.length; i++) {
    const candidate = trick.cards[i];
    const currBest = winningPlayedCard.card;

    // Check trump logic
    if (trumpSuit !== 'NT') {
      const candidateIsTrump = candidate.card.suit === trumpSuit;
      const bestIsTrump = currBest.suit === trumpSuit;

      if (candidateIsTrump && !bestIsTrump) {
        winningPlayedCard = candidate;
        continue;
      }
      if (candidateIsTrump && bestIsTrump) {
        if (RANK_VALUES[candidate.card.rank] > RANK_VALUES[currBest.rank]) {
          winningPlayedCard = candidate;
        }
        continue;
      }
      if (!candidateIsTrump && bestIsTrump) {
        continue;
      }
    }

    // Both are non-trumps (or NT contract)
    if (candidate.card.suit === leadSuit && currBest.suit === leadSuit) {
      if (RANK_VALUES[candidate.card.rank] > RANK_VALUES[currBest.rank]) {
        winningPlayedCard = candidate;
      }
    }
  }

  return winningPlayedCard.playedBy;
}
