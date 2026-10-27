import { useEffect, useRef, useState } from 'react';
import { Card, Contract, RoomState, ScoreRecord, Seat } from '../types/bridge';
import {
  LocalGameSession,
  applyLocalBid,
  applyLocalPlayCard,
  createLocalBotGame,
  getBotNextAction,
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
  nextBotGameBoard: () => void;
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

  const activeSeat: Seat = currentSeat || 'S';

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
    setLocalSession(session);
    triggerDds(session.fullHands, session.state.dealer, session.state.vulnerability);
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

    if (nextSession.state.lastResult && onScoreRecorded) {
      onScoreRecorded(nextSession.state.lastResult);
    }
  };

  const playBotGameCard = (cardId: string) => {
    if (!localSession) return;
    const { state } = localSession;
    if (state.phase !== 'PLAYING') return;

    // Determine who is playing: human or human-controlled dummy
    let playSeat = activeSeat;
    if (state.declarerSeat === activeSeat && state.currentTurn === state.dummySeat) {
      playSeat = state.dummySeat;
    }

    const nextSession = applyLocalPlayCard(localSession, cardId, playSeat);
    setLocalSession(nextSession);

    if (nextSession.state.lastResult && onScoreRecorded) {
      onScoreRecorded(nextSession.state.lastResult);
    }
  };

  const nextBotGameBoard = () => {
    if (!localSession) return;
    startBotGame(activeSeat, localSession.state.boardNumber + 1);
  };

  // Bot automation loop
  useEffect(() => {
    if (!localSession || !localSession.isBotGame) return;
    const { state } = localSession;

    if (state.phase === 'BOARD_RESULT') return;

    const botAction = getBotNextAction(localSession, activeSeat);
    if (!botAction) return;

    // Small realistic delay for bot moves
    botTimerRef.current = setTimeout(() => {
      if (botAction.type === 'bid') {
        setLocalSession(prev => {
          if (!prev) return null;
          const next = applyLocalBid(prev, botAction.bid);
          if (next.state.lastResult && onScoreRecorded) {
            onScoreRecorded(next.state.lastResult);
          }
          return next;
        });
      } else if (botAction.type === 'play') {
        setLocalSession(prev => {
          if (!prev) return null;
          const next = applyLocalPlayCard(prev, botAction.cardId!, botAction.seat);
          if (next.state.lastResult && onScoreRecorded) {
            onScoreRecorded(next.state.lastResult);
          }
          return next;
        });
      }
    }, 600);

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
    nextBotGameBoard,
  };
}
