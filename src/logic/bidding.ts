import { Bid, Contract, DoubleStatus, Seat, TrumpSuit } from '../types/bridge';
import { getPartnership, isSamePartnership, nextSeat, partnerSeat } from './vulnerability';

export const TRUMP_ORDER: Record<TrumpSuit, number> = {
  C: 1,
  D: 2,
  H: 3,
  S: 4,
  NT: 5,
};

export function getBidRank(level: number, suit: TrumpSuit): number {
  return level * 10 + TRUMP_ORDER[suit];
}

export function getLastMeaningfulBid(bids: Bid[]): Bid | null {
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type === 'BID') {
      return bids[i];
    }
  }
  return null;
}

export function getLastActionBid(bids: Bid[]): Bid | null {
  for (let i = bids.length - 1; i >= 0; i--) {
    if (bids[i].type !== 'PASS') {
      return bids[i];
    }
  }
  return null;
}

export function isValidBid(
  bid: { type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE'; level?: number; suit?: TrumpSuit },
  bidder: Seat,
  bids: Bid[]
): boolean {
  if (bid.type === 'PASS') {
    return true;
  }

  const lastMeaningful = getLastMeaningfulBid(bids);
  const lastAction = getLastActionBid(bids);

  if (bid.type === 'BID') {
    if (!bid.level || !bid.suit || bid.level < 1 || bid.level > 7) {
      return false;
    }
    if (!lastMeaningful) {
      return true;
    }
    return getBidRank(bid.level, bid.suit) > getBidRank(lastMeaningful.level!, lastMeaningful.suit!);
  }

  if (bid.type === 'DOUBLE') {
    if (!lastAction || lastAction.type !== 'BID') {
      return false;
    }
    // Can only double an opponent's bid
    return !isSamePartnership(bidder, lastAction.bidder);
  }

  if (bid.type === 'REDOUBLE') {
    if (!lastAction || lastAction.type !== 'DOUBLE') {
      return false;
    }
    // Can only redouble when the opponent doubled our bid
    return !isSamePartnership(bidder, lastAction.bidder);
  }

  return false;
}

export interface BiddingStatus {
  isFinished: boolean;
  isAllPass: boolean;
  contract: Contract | null;
  declarer: Seat | null;
  dummy: Seat | null;
  openingLeader: Seat | null;
}

export function checkBiddingStatus(bids: Bid[]): BiddingStatus {
  // If first 4 are all PASS -> All pass
  if (bids.length === 4 && bids.every(b => b.type === 'PASS')) {
    return {
      isFinished: true,
      isAllPass: true,
      contract: null,
      declarer: null,
      dummy: null,
      openingLeader: null,
    };
  }

  const lastMeaningful = getLastMeaningfulBid(bids);
  if (!lastMeaningful) {
    return {
      isFinished: false,
      isAllPass: false,
      contract: null,
      declarer: null,
      dummy: null,
      openingLeader: null,
    };
  }

  // Check if there are 3 consecutive passes after at least one contract bid
  if (bids.length >= 4) {
    const last3 = bids.slice(-3);
    if (last3.every(b => b.type === 'PASS')) {
      // Auction finished! Determine contract, double status, declarer
      let doubled: DoubleStatus = 'NONE';
      for (let i = bids.length - 4; i >= 0; i--) {
        if (bids[i].type === 'REDOUBLE') {
          doubled = 'REDOUBLED';
          break;
        } else if (bids[i].type === 'DOUBLE') {
          doubled = 'DOUBLED';
          break;
        } else if (bids[i].type === 'BID') {
          break;
        }
      }

      const winningSide = getPartnership(lastMeaningful.bidder);
      const winningSuit = lastMeaningful.suit!;

      // Declarer is the FIRST player of winning side who bid the winning suit/strain
      let declarer: Seat = lastMeaningful.bidder;
      for (const b of bids) {
        if (b.type === 'BID' && b.suit === winningSuit && getPartnership(b.bidder) === winningSide) {
          declarer = b.bidder;
          break;
        }
      }

      const dummy = partnerSeat(declarer);
      const openingLeader = nextSeat(declarer);

      const contract: Contract = {
        level: lastMeaningful.level!,
        suit: winningSuit,
        doubled,
        declarer,
      };

      return {
        isFinished: true,
        isAllPass: false,
        contract,
        declarer,
        dummy,
        openingLeader,
      };
    }
  }

  return {
    isFinished: false,
    isAllPass: false,
    contract: null,
    declarer: null,
    dummy: null,
    openingLeader: null,
  };
}
