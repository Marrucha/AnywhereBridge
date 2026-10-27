import { Bid, Card, Contract, RoomState, ScoreRecord, Seat } from '../types/bridge';
import { createDeck, dealDeck } from './deck';
import { checkBiddingStatus, isValidBid } from './bidding';
import { determineTrickWinner, isCardLegal } from './play';
import { calculateDuplicateScore, formatContractString } from './scoring';
import { getBoardSetup, nextSeat } from './vulnerability';
import { chooseBotCard, getBotBid } from './bot';

export interface LocalGameSession {
  state: RoomState;
  fullHands: Record<Seat, Card[]>;
  isBotGame: boolean;
}

export function createLocalBotGame(
  boardNumber: number = 1,
  mySeat: Seat = 'S',
  myName: string = 'Gracz (Ty)'
): LocalGameSession {
  const setup = getBoardSetup(boardNumber);
  const deck = createDeck();
  const hands = dealDeck(deck);

  const botNames: Record<Seat, string> = {
    N: 'Bot N (Północ)',
    E: 'Bot E (Wschód)',
    S: 'Bot S (Południe)',
    W: 'Bot W (Zachód)',
  };

  const seats: RoomState['seats'] = {
    N: mySeat === 'N' ? { id: 'me', name: myName, connected: true } : { id: 'bot_N', name: botNames.N, connected: true },
    E: mySeat === 'E' ? { id: 'me', name: myName, connected: true } : { id: 'bot_E', name: botNames.E, connected: true },
    S: mySeat === 'S' ? { id: 'me', name: myName, connected: true } : { id: 'bot_S', name: botNames.S, connected: true },
    W: mySeat === 'W' ? { id: 'me', name: myName, connected: true } : { id: 'bot_W', name: botNames.W, connected: true },
  };

  const state: RoomState = {
    roomId: 'BOT-SOLO',
    boardNumber,
    dealer: setup.dealer,
    vulnerability: setup.vulnerability,
    phase: 'BIDDING',
    connectedCount: 4,
    connectedPlayers: [
      { id: 'me', name: myName, seat: mySeat },
      { id: 'bot_N', name: botNames.N, seat: 'N' },
      { id: 'bot_E', name: botNames.E, seat: 'E' },
      { id: 'bot_W', name: botNames.W, seat: 'W' },
    ].filter(p => p.seat !== mySeat).concat([{ id: 'me', name: myName, seat: mySeat }]),
    seats,
    hands,
    myHand: hands[mySeat],
    dummyHand: null,
    dummySeat: null,
    declarerSeat: null,
    openingLeadMade: false,
    bids: [],
    currentBidder: setup.dealer,
    contract: null,
    currentTrick: {
      leadSeat: 'N',
      cards: [],
    },
    pastTricks: [],
    tricksWonNS: 0,
    tricksWonEW: 0,
    currentTurn: null,
    lastResult: null,
    history: [],
    hostId: 'me',
  };

  return {
    state,
    fullHands: hands,
    isBotGame: true,
  };
}

export function applyLocalBid(
  session: LocalGameSession,
  bidData: { type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE'; level?: number; suit?: any }
): LocalGameSession {
  const { state, fullHands } = session;
  const bidder = state.currentBidder;
  if (!bidder || state.phase !== 'BIDDING') return session;

  if (!isValidBid(bidData, bidder, state.bids)) {
    console.warn('Invalid bid attempted:', bidData);
    return session;
  }

  const newBid: Bid = {
    ...bidData,
    bidder,
  };

  const updatedBids = [...state.bids, newBid];
  const biddingStatus = checkBiddingStatus(updatedBids);

  let nextPhase = state.phase;
  let nextContract = state.contract;
  let nextDeclarer = state.declarerSeat;
  let nextDummy = state.dummySeat;
  let nextCurrentBidder: Seat | null = state.currentBidder;
  let nextCurrentTurn = state.currentTurn;
  let nextLeadSeat: Seat = 'N';
  let nextResult: ScoreRecord | null = null;

  if (biddingStatus.isFinished) {
    if (biddingStatus.isAllPass) {
      nextPhase = 'BOARD_RESULT';
      nextResult = {
        id: `local_b_${Date.now()}`,
        boardNumber: state.boardNumber,
        dealer: state.dealer,
        vulnerability: state.vulnerability,
        contractStr: 'PAS',
        declarer: state.dealer,
        tricksWonNS: 0,
        tricksWonEW: 0,
        scoreNS: 0,
        scoreEW: 0,
        resultDetail: '4x PAS (Rozdanie pasowe, 0 pkt)',
        timestamp: Date.now(),
      };
    } else {
      nextPhase = 'PLAYING';
      nextContract = biddingStatus.contract;
      nextDeclarer = biddingStatus.declarer;
      nextDummy = biddingStatus.dummy;
      nextCurrentTurn = biddingStatus.openingLeader;
      nextLeadSeat = biddingStatus.openingLeader || 'N';
      nextCurrentBidder = null;
    }
  } else {
    nextCurrentBidder = nextSeat(bidder);
  }

  const nextState: RoomState = {
    ...state,
    phase: nextPhase,
    bids: updatedBids,
    currentBidder: nextCurrentBidder,
    contract: nextContract,
    declarerSeat: nextDeclarer,
    dummySeat: nextDummy,
    currentTurn: nextCurrentTurn,
    currentTrick: {
      leadSeat: nextLeadSeat,
      cards: [],
    },
    lastResult: nextResult || state.lastResult,
    history: nextResult ? [nextResult, ...state.history] : state.history,
  };

  return {
    ...session,
    state: nextState,
  };
}

export function applyLocalPlayCard(
  session: LocalGameSession,
  cardId: string,
  playedBySeat: Seat
): LocalGameSession {
  const { state, fullHands } = session;
  if (state.phase !== 'PLAYING' || state.currentTurn !== playedBySeat) {
    return session;
  }

  const playerHand = fullHands[playedBySeat] || [];
  const cardIndex = playerHand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    console.warn('Card not in hand:', cardId, playedBySeat);
    return session;
  }

  const card = playerHand[cardIndex];
  const leadSuit = state.currentTrick.cards.length > 0 ? state.currentTrick.cards[0].card.suit : null;
  if (!isCardLegal(card, playerHand, leadSuit)) {
    console.warn('Illegal card played:', card, leadSuit);
    return session;
  }

  // Remove card from player hand
  const nextPlayerHand = [...playerHand];
  nextPlayerHand.splice(cardIndex, 1);
  const nextFullHands = {
    ...fullHands,
    [playedBySeat]: nextPlayerHand,
  };

  const isOpeningLead = !state.openingLeadMade;
  const newCards = [...state.currentTrick.cards, { card, playedBy: playedBySeat }];
  const newTrick = {
    ...state.currentTrick,
    cards: newCards,
  };

  // Expose dummy if opening lead was just made
  const openingLeadMade = state.openingLeadMade || isOpeningLead;
  let dummyHand = state.dummyHand;
  if (state.dummySeat && openingLeadMade) {
    dummyHand = nextFullHands[state.dummySeat];
  }

  // Check if trick completed (4 cards)
  if (newCards.length === 4) {
    const winner = determineTrickWinner(newTrick, state.contract!.suit);
    const completedTrick = { ...newTrick, winnerSeat: winner };

    // Keep all 4 cards visible on table! The trick will be cleared after a 1.2s delay
    const nextState: RoomState = {
      ...state,
      hands: nextFullHands,
      myHand: nextFullHands['S'] || [],
      dummyHand,
      currentTrick: completedTrick,
      currentTurn: null,
      openingLeadMade,
    };

    return {
      ...session,
      state: nextState,
      fullHands: nextFullHands,
    };
  }

  // Trick in progress -> Next seat
  const nextTurn = nextSeat(playedBySeat);
  const nextState: RoomState = {
    ...state,
    hands: nextFullHands,
    myHand: nextFullHands['S'] || [],
    dummyHand,
    currentTrick: newTrick,
    currentTurn: nextTurn,
    openingLeadMade,
  };

  return {
    ...session,
    state: nextState,
    fullHands: nextFullHands,
  };
}

/**
 * Checks if current turn belongs to a bot and returns the chosen action.
 */
export function getBotNextAction(
  session: LocalGameSession,
  mySeat: Seat
): { type: 'bid' | 'play'; seat: Seat; cardId?: string; bid?: any } | null {
  const { state, fullHands } = session;

  if (state.phase === 'BIDDING') {
    const bidder = state.currentBidder;
    if (bidder && bidder !== mySeat) {
      // Testowo boty zawsze pasują
      return { type: 'bid', seat: bidder, bid: { type: 'PASS' } };
    }
    return null;
  }

  if (state.phase === 'PLAYING') {
    const turn = state.currentTurn;
    if (!turn) return null;

    // Is it dummy's turn?
    if (turn === state.dummySeat) {
      // In Bridge, Declarer plays Dummy's card.
      if (state.declarerSeat === mySeat) {
        // Human is Declarer, so human chooses Dummy's card
        return null;
      }
      // Bot is Declarer, so bot plays Dummy's card using the bot rule!
      const dummyHand = fullHands[state.dummySeat] || [];
      if (dummyHand.length === 0) return null;
      const card = chooseBotCard(dummyHand, state.currentTrick);
      return { type: 'play', seat: state.dummySeat, cardId: card.id };
    }

    // Normal turn
    if (turn !== mySeat) {
      const botHand = fullHands[turn] || [];
      if (botHand.length === 0) return null;
      const card = chooseBotCard(botHand, state.currentTrick);
      return { type: 'play', seat: turn, cardId: card.id };
    }
  }

  return null;
}

/**
 * Resolves a completed 4-card trick after a brief pause so players can see all cards played.
 */
export function resolveCompletedTrick(session: LocalGameSession): LocalGameSession {
  const { state, fullHands } = session;
  if (state.phase !== 'PLAYING' || state.currentTrick.cards.length !== 4) {
    return session;
  }

  const winner = state.currentTrick.winnerSeat || determineTrickWinner(state.currentTrick, state.contract!.suit);
  const completedTrick = { ...state.currentTrick, winnerSeat: winner };
  const nextPastTricks = [...state.pastTricks, completedTrick];

  const wonNS = (winner === 'N' || winner === 'S') ? state.tricksWonNS + 1 : state.tricksWonNS;
  const wonEW = (winner === 'E' || winner === 'W') ? state.tricksWonEW + 1 : state.tricksWonEW;
  const dummyHand = state.dummySeat ? fullHands[state.dummySeat] : null;

  if (nextPastTricks.length === 13) {
    // Board finished!
    const score = calculateDuplicateScore(state.contract!, wonNS, wonEW, state.vulnerability);
    const cStr = formatContractString(state.contract!);
    const diffStr = score.diff === 0 ? '=' : score.diff > 0 ? `+${score.diff}` : `${score.diff}`;
    const resultDetail = `${cStr} ${diffStr} (${score.points >= 0 ? '+' : ''}${score.points})`;

    const lastResult: ScoreRecord = {
      id: `local_b_${Date.now()}`,
      boardNumber: state.boardNumber,
      dealer: state.dealer,
      vulnerability: state.vulnerability,
      contractStr: cStr,
      declarer: state.contract!.declarer,
      tricksWonNS: wonNS,
      tricksWonEW: wonEW,
      scoreNS: score.scoreNS,
      scoreEW: score.scoreEW,
      resultDetail,
      timestamp: Date.now(),
    };

    const finalState: RoomState = {
      ...state,
      phase: 'BOARD_RESULT',
      hands: fullHands,
      myHand: fullHands['S'] || [],
      dummyHand,
      currentTrick: completedTrick, // 13th trick stays on table
      pastTricks: nextPastTricks,
      tricksWonNS: wonNS,
      tricksWonEW: wonEW,
      currentTurn: null,
      lastResult,
      history: [lastResult, ...state.history],
      openingLeadMade: true,
    };

    return {
      ...session,
      state: finalState,
      fullHands,
    };
  } else {
    // Advance to winner for next trick
    const nextState: RoomState = {
      ...state,
      hands: fullHands,
      myHand: fullHands['S'] || [],
      dummyHand,
      currentTrick: { leadSeat: winner, cards: [] },
      pastTricks: nextPastTricks,
      tricksWonNS: wonNS,
      tricksWonEW: wonEW,
      currentTurn: winner,
      openingLeadMade: true,
    };

    return {
      ...session,
      state: nextState,
      fullHands,
    };
  }
}

