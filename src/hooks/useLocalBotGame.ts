import { useEffect, useRef, useState } from 'react';
import { Card, Contract, RoomState, ScoreRecord, Seat } from '../types/bridge';
import {
  LocalGameSession,
  applyLocalBid,
  applyLocalPlayCard,
  createLocalBotGame,
  getBotNextAction,
  resolveCompletedTrick,
  undoLocalMove,
} from '../logic/localGame';
import { DdsTableResult, calculateDdsAnalysis } from '../logic/dds';

export interface UseLocalBotGameResult {
  localSession: LocalGameSession | null;
  isBotGame: boolean;
  ddsResult: DdsTableResult | null;
  ddsLoading: boolean;
  startBotGame: (seat?: Seat, boardNumber?: number) => void;
  stopBotGame: () => void;
  makeBotGameBid: (bid: any) => void;
  playBotGameCard: (cardId: string) => void;
  collectCompletedTrick: () => void;
  undoBotGameMove: () => void;
  nextBotGameBoard: (targetBoardNumber?: number) => void;
}

export function useLocalBotGame(
  currentSeat: Seat | null,
  playerName: string,
  onScoreRecorded?: (score: ScoreRecord) => void
): UseLocalBotGameResult {
  const [localSession, setLocalSession] = useState<LocalGameSession | null>(null);
  const [ddsResult, setDdsResult] = useState<DdsTableResult | null>(null);
  const [ddsLoading, setDdsLoading] = useState<boolean>(false);
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecordedIdRef = useRef<string | null>(null);

  const activeSeat: Seat = currentSeat || 'S';

  // Synchronize score recording safely outside state updaters, preventing duplicate entries
  useEffect(() => {
    const lastRes = localSession?.state.lastResult;
    if (lastRes && lastRes.id !== lastRecordedIdRef.current) {
      lastRecordedIdRef.current = lastRes.id;
      if (onScoreRecorded) {
        onScoreRecorded(lastRes);
      }
    }
  }, [localSession?.state.lastResult, onScoreRecorded]);

  const triggerDds = (hands: Record<Seat, Card[]>, dealer: Seat, vul: any) => {
    setDdsLoading(true);
    calculateDdsAnalysis(hands, dealer, vul)
      .then(res => {
        setDdsResult(res);
        setDdsLoading(false);
      })
      .catch(err => {
        console.error('DDS Calculation failed:', err);
        setDdsLoading(false);
      });
  };

  const startBotGame = (seat: Seat = activeSeat, boardNumber: number = 1) => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    const session = createLocalBotGame(boardNumber, seat, playerName);
    setDdsResult(null);
    setDdsLoading(false);
    setLocalSession(session);
  };

  const stopBotGame = () => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setLocalSession(null);
    setDdsResult(null);
  };

  const makeBotGameBid = (bid: any) => {
    if (!localSession) return;
    const nextSession = applyLocalBid(localSession, bid);
    setLocalSession(nextSession);
  };

  const playBotGameCard = (cardId: string) => {
    if (!localSession) return;
    let current = localSession;
    if (current.state.phase !== 'PLAYING') return;

    // If 4 cards are still on the table, resolve the completed trick first so the user's card click can proceed immediately
    if (current.state.currentTrick.cards.length === 4) {
      current = resolveCompletedTrick(current);
      if (current.state.phase !== 'PLAYING') {
        setLocalSession(current);
        return;
      }
    }

    const humanSeat = current.mySeat || activeSeat;
    let playSeat = humanSeat;
    if (current.state.declarerSeat === humanSeat && current.state.currentTurn === current.state.dummySeat) {
      playSeat = current.state.dummySeat!;
    }

    const nextSession = applyLocalPlayCard(current, cardId, playSeat);
    setLocalSession(nextSession);
  };

  const collectCompletedTrick = () => {
    if (!localSession) return;
    const { state } = localSession;
    if (state.phase === 'PLAYING' && state.currentTrick.cards.length === 4) {
      setLocalSession(prev => {
        if (!prev) return null;
        return resolveCompletedTrick(prev);
      });
    }
  };

  const undoBotGameMove = () => {
    if (!localSession) return;
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setLocalSession(prev => (prev ? undoLocalMove(prev) : null));
  };

  const nextBotGameBoard = (targetBoardNumber?: number) => {
    const humanSeat = localSession?.mySeat || activeSeat;
    const nextNum = targetBoardNumber !== undefined
      ? targetBoardNumber
      : localSession
      ? localSession.state.boardNumber + 1
      : 1;
    startBotGame(humanSeat, nextNum);
  };

  // Bot automation loop & automatic trick collection after brief pause
  useEffect(() => {
    if (!localSession || !localSession.isBotGame) return;
    const { state } = localSession;
    const humanSeat = localSession.mySeat || activeSeat;

    if (state.phase === 'BOARD_RESULT') {
      if (!ddsResult && !ddsLoading) {
        const ddsHands = localSession.dealHands || localSession.fullHands;
        const t = setTimeout(() => {
          triggerDds(ddsHands, state.dealer, state.vulnerability);
        }, 250);
        return () => clearTimeout(t);
      }
      return;
    }

    // If no one taps the table, auto-collect the 4 cards after 5 seconds (5000ms)
    if (state.phase === 'PLAYING' && state.currentTrick.cards.length === 4) {
      botTimerRef.current = setTimeout(() => {
        setLocalSession(prev => {
          if (!prev || prev.state.currentTrick.cards.length !== 4) return prev;
          return resolveCompletedTrick(prev);
        });
      }, 5000);
      return () => {
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
      };
    }

    if (state.phase === 'PLAYING' && state.currentTurn === null) return;

    const botAction = getBotNextAction(localSession, humanSeat);
    if (!botAction) return;

    // Small realistic delay for bot moves (700ms)
    botTimerRef.current = setTimeout(() => {
      if (botAction.type === 'bid') {
        setLocalSession(prev => {
          if (!prev) return null;
          return applyLocalBid(prev, botAction.bid);
        });
      } else if (botAction.type === 'play') {
        setLocalSession(prev => {
          if (!prev) return null;
          return applyLocalPlayCard(prev, botAction.cardId!, botAction.seat);
        });
      }
    }, 700);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [localSession, activeSeat]);

  return {
    localSession,
    isBotGame: !!localSession?.isBotGame,
    ddsResult,
    ddsLoading,
    startBotGame,
    stopBotGame,
    makeBotGameBid,
    playBotGameCard,
    collectCompletedTrick,
    undoBotGameMove,
    nextBotGameBoard,
  };
}
