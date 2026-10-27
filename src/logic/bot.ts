import { Card, Rank, Seat, Suit, Trick, TrumpSuit } from '../types/bridge';

const RANK_VALUES: Record<Rank, number> = {
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

export const getCardRankValue = (rank: Rank): number => RANK_VALUES[rank] || 0;

/**
 * ZASADA BOTA WEDŁUG WYTYCZNYCH:
 * 1. Jeśli bot wychodzi do lewy (jest pierwszy): kładzie najniższą kartę ze swojego pierwszego koloru.
 * 2. Jeśli dokłada do koloru wyjścia:
 *    a) Jeżeli może położyć wyższą kartę do koloru niż najwyższa dotychczas zagrana w tym kolorze,
 *       kładzie najwyższą kartę do koloru (by wziąć lewę).
 *    b) Jeżeli nie może położyć wyższej, kładzie najniższą kartę do koloru (oszczędza wysokie).
 * 3. Jeśli nie ma kart w kolorze wyjścia (renons):
 *    - Kładzie najniższą kartę z dowolnego koloru (najniższy rank w całej ręce).
 */
export function chooseBotCard(hand: Card[], currentTrick: Trick): Card {
  if (!hand || hand.length === 0) {
    throw new Error('Bot hand is empty');
  }

  // 1. Bot wychodzi jako pierwszy do lewy (brak kart w lewie)
  if (!currentTrick.cards || currentTrick.cards.length === 0) {
    // Sortuj rosnąco i wybierz najniższą
    const sorted = [...hand].sort((a, b) => getCardRankValue(a.rank) - getCardRankValue(b.rank));
    return sorted[0];
  }

  const leadSuit = currentTrick.cards[0].card.suit;
  const leadSuitCards = hand.filter(c => c.suit === leadSuit);

  // 2. Gracz posiada karty w kolorze wyjścia (obowiązek obsługi koloru)
  if (leadSuitCards.length > 0) {
    // Znajdź najwyższą dotychczas zagraną kartę w kolorze wyjścia w tej lewie
    const playedInSuit = currentTrick.cards
      .filter(pc => pc.card.suit === leadSuit)
      .map(pc => pc.card);

    let highestPlayedRank = 0;
    for (const card of playedInSuit) {
      const val = getCardRankValue(card.rank);
      if (val > highestPlayedRank) {
        highestPlayedRank = val;
      }
    }

    // Karty w ręku bota wyższe niż dotychczasowa najwyższa karta do koloru
    const higherCards = leadSuitCards.filter(c => getCardRankValue(c.rank) > highestPlayedRank);

    if (higherCards.length > 0) {
      // "Jeżeli mogą położyć wyższą kartę do koloru to kładą wyższą"
      // Wybierz najwyższą z nich
      higherCards.sort((a, b) => getCardRankValue(b.rank) - getCardRankValue(a.rank));
      return higherCards[0];
    } else {
      // "a jak nie mogą to najniższą do koloru"
      leadSuitCards.sort((a, b) => getCardRankValue(a.rank) - getCardRankValue(b.rank));
      return leadSuitCards[0];
    }
  }

  // 3. "a jak nie mają do koloru to najniższą z dowolnego koloru"
  const sortedAnySuit = [...hand].sort((a, b) => getCardRankValue(a.rank) - getCardRankValue(b.rank));
  return sortedAnySuit[0];
}

/**
 * Prosta licytacja dla botów:
 * Boty pasują, umożliwiając graczowi swobodne wybranie i przetestowanie dowolnego kontraktu.
 */
export function getBotBid(
  bidsCount: number,
  hasHumanBid: boolean
): { type: 'BID' | 'PASS'; level?: number; suit?: TrumpSuit } {
  // Jeśli nikt nie zalicytował przez 3 odzywki i bot jest 4., może spasować lub dać 1NT do testu
  return { type: 'PASS' };
}
