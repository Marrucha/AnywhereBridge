export type Suit = 'C' | 'D' | 'H' | 'S';
export type TrumpSuit = Suit | 'NT';

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  id: string; // e.g. "AS", "TH", "2C"
  suit: Suit;
  rank: Rank;
}

export type Seat = 'N' | 'E' | 'S' | 'W';

export type Vulnerability = 'NONE' | 'NS' | 'EW' | 'BOTH';

export type DoubleStatus = 'NONE' | 'DOUBLED' | 'REDOUBLED';

export interface Bid {
  type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE';
  level?: number; // 1 - 7
  suit?: TrumpSuit;
  bidder: Seat;
}

export interface Contract {
  level: number; // 1 - 7
  suit: TrumpSuit;
  doubled: DoubleStatus;
  declarer: Seat;
}

export interface PlayedCard {
  card: Card;
  playedBy: Seat;
}

export interface Trick {
  leadSeat: Seat;
  cards: PlayedCard[];
  winnerSeat?: Seat;
}

export interface PlayerInfo {
  id: string;
  name: string;
  seat: Seat;
  connected: boolean;
  isHost: boolean;
}

export interface ScoreRecord {
  id: string;
  boardNumber: number;
  dealer: Seat;
  vulnerability: Vulnerability;
  contractStr: string;
  declarer: Seat;
  tricksWonNS: number;
  tricksWonEW: number;
  scoreNS: number; // Positive is favorable for NS
  scoreEW: number; // Positive is favorable for EW
  resultDetail: string; // e.g. "4♠ = (+420)" or "3NT -1 (-50)"
  timestamp: number;
}

export type GamePhase = 'LOBBY' | 'BIDDING' | 'PLAYING' | 'BOARD_RESULT';

export interface RoomState {
  roomId: string;
  boardNumber: number;
  dealer: Seat;
  vulnerability: Vulnerability;
  phase: GamePhase;
  seats: {
    N: { id: string; name: string; connected: boolean } | null;
    E: { id: string; name: string; connected: boolean } | null;
    S: { id: string; name: string; connected: boolean } | null;
    W: { id: string; name: string; connected: boolean } | null;
  };
  // Full hands (only sent partially to client: my hand + dummy if exposed)
  hands?: {
    N: Card[];
    E: Card[];
    S: Card[];
    W: Card[];
  };
  myHand: Card[];
  dummyHand: Card[] | null;
  dummySeat: Seat | null;
  declarerSeat: Seat | null;
  openingLeadMade: boolean;

  bids: Bid[];
  currentBidder: Seat | null;
  contract: Contract | null;

  currentTrick: Trick;
  pastTricks: Trick[];
  tricksWonNS: number;
  tricksWonEW: number;
  currentTurn: Seat | null;

  lastResult: ScoreRecord | null;
  history: ScoreRecord[];
  hostId: string | null;
}

export type ClientMessage =
  | { type: 'join'; roomId: string; playerId: string; playerName: string }
  | { type: 'take_seat'; seat: Seat }
  | { type: 'leave_seat' }
  | { type: 'start_game' }
  | { type: 'make_bid'; bid: { type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE'; level?: number; suit?: TrumpSuit } }
  | { type: 'play_card'; cardId: string }
  | { type: 'next_board' }
  | { type: 'reset_room' }
  | { type: 'clear_history' };

export type ServerMessage =
  | { type: 'state_update'; state: RoomState; yourSeat: Seat | null }
  | { type: 'room_reset' }
  | { type: 'error'; message: string };
