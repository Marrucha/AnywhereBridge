import React from 'react';
import { Card, Contract, PlayedCard, RoomState, Seat, Trick } from '../types/bridge';
import { CardView } from './CardView';
import { BiddingBox } from './BiddingBox';
import { BiddingTray } from './BiddingTray';
import { BoardResultModal } from './BoardResultModal';
import { DummyHandView } from './DummyHandView';
import { SideDummyHandView } from './SideDummyHandView';
import { PlayerHandView } from './PlayerHandView';
import { LobbyOverlay } from './LobbyOverlay';
import { TrickCenterView } from './TrickCenterView';
import { DdsTableResult } from '../logic/dds';
import { isCardLegal } from '../logic/play';
import { formatContractString } from '../logic/scoring';
import { formatVulnerabilityPl, isSideVulnerable } from '../logic/vulnerability';
import { Users, AlertCircle, Play, RotateCcw, QrCode, Bot } from 'lucide-react';

interface BridgeTableProps {
  state: RoomState;
  mySeat: Seat | null;
  onTakeSeat: (seat: Seat) => void;
  onLeaveSeat: () => void;
  onStartGame: () => void;
  onMakeBid: (bid: { type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE'; level?: number; suit?: any }) => void;
  onPlayCard: (cardId: string) => void;
  onNextBoard: () => void;
  onResetRoom: () => void;
  onOpenQR: () => void;
  onStartBotGame?: () => void;
  onCollectTrick?: () => void;
  isBotGame?: boolean;
  ddsResult?: DdsTableResult | null;
  ddsLoading?: boolean;
  onStartNewEight?: () => void;
}

const SEAT_NAMES: Record<Seat, string> = {
  N: 'Północ (N)',
  E: 'Wschód (E)',
  S: 'Południe (S)',
  W: 'Zachód (W)',
};

export const BridgeTable: React.FC<BridgeTableProps> = ({
  state,
  mySeat,
  onTakeSeat,
  onLeaveSeat,
  onStartGame,
  onMakeBid,
  onPlayCard,
  onNextBoard,
  onOpenQR,
  onStartBotGame,
  onCollectTrick,
  isBotGame = false,
  ddsResult = null,
  ddsLoading = false,
  onStartNewEight,
}) => {
  const {
    phase,
    seats,
    bids,
    currentBidder,
    contract,
    myHand,
    dummyHand,
    dummySeat,
    declarerSeat,
    openingLeadMade,
    currentTrick,
    pastTricks = [],
    currentTurn,
    tricksWonNS,
    tricksWonEW,
    lastResult,
    dealer,
    vulnerability,
    connectedCount,
    connectedPlayers = [],
  } = state;

  const isMyTurn = mySeat !== null && currentTurn === mySeat;
  const isDummyTurn = dummySeat !== null && currentTurn === dummySeat;
  // In bridge, declarer plays the dummy's cards on dummy's turn!
  const canIPlayDummy = mySeat !== null && declarerSeat === mySeat && isDummyTurn;

  const leadCardSuit = currentTrick.cards.length > 0 ? currentTrick.cards[0].card.suit : null;

  // Find played cards in current trick by seat
  const getPlayedCardForSeat = (seat: Seat): PlayedCard | undefined => {
    return currentTrick.cards.find(c => c.playedBy === seat);
  };

  const seatedCount = (['N', 'E', 'S', 'W'] as Seat[]).filter(s => seats[s] !== null).length;
  const allSeatsOccupied = seatedCount === 4;
  const totalPlayersInRoom = connectedCount !== undefined ? connectedCount : Math.max(connectedPlayers.length, seatedCount);
  const unseatedList = connectedPlayers.filter(p => !p.seat);
  const isNSVul = isSideVulnerable('NS', vulnerability);
  const isEWVul = isSideVulnerable('EW', vulnerability);

  const [showResultModal, setShowResultModal] = React.useState(false);

  React.useEffect(() => {
    if (phase !== 'BOARD_RESULT') {
      setShowResultModal(false);
    }
  }, [phase]);

  return (
    <div
      onClick={() => {
        if (phase === 'BOARD_RESULT' && !showResultModal) {
          setShowResultModal(true);
        } else if (phase === 'PLAYING' && currentTrick.cards.length === 4 && onCollectTrick) {
          onCollectTrick();
        }
      }}
      className="relative w-full h-full flex flex-col justify-between p-1.5 sm:p-3 select-none overflow-hidden cursor-default"
    >
      {/* LOBBY OVERLAY / PHASE */}
      {phase === 'LOBBY' && (
        <LobbyOverlay
          state={state}
          mySeat={mySeat}
          seats={seats}
          connectedPlayers={connectedPlayers}
          totalPlayersInRoom={totalPlayersInRoom}
          seatedCount={seatedCount}
          allSeatsOccupied={allSeatsOccupied}
          unseatedList={unseatedList}
          seatNames={SEAT_NAMES}
          onTakeSeat={onTakeSeat}
          onLeaveSeat={onLeaveSeat}
          onOpenQR={onOpenQR}
          onStartBotGame={onStartBotGame}
          onStartGame={onStartGame}
        />
      )}

      {/* RESULT MODAL OVERLAY */}
      {phase === 'BOARD_RESULT' && lastResult && showResultModal && (
        <BoardResultModal
          lastResult={lastResult}
          contract={contract}
          boardNumber={state.boardNumber}
          ddsResult={ddsResult}
          ddsLoading={ddsLoading}
          onClose={() => setShowResultModal(false)}
          onNextBoard={onNextBoard}
          onStartNewEight={onStartNewEight}
        />
      )}

      {/* RESULT BANNER (When table is previewed after board finishes) */}
      {phase === 'BOARD_RESULT' && lastResult && !showResultModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowResultModal(true);
          }}
          className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-center cursor-pointer transition shadow-lg border border-emerald-400/50 mb-1 flex items-center justify-between text-xs sm:text-sm animate-pulse"
        >
          <span className="font-bold">🏁 Koniec: {lastResult.resultDetail}</span>
          <span className="bg-emerald-950/80 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-200">
            {state.boardNumber % 8 === 0 ? '🏆 Zakończona 8! Protokół & DDS 📊' : 'Protokół & DDS 📊'}
          </span>
        </div>
      )}

      {/* TOP: NORTH SEAT & DUMMY CARDS */}
      <div className="flex flex-col items-center gap-0.5">
        <div className={`px-3 py-0.5 rounded-full text-xs font-bold border transition ${
          currentTurn === 'N' || currentBidder === 'N'
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : isNSVul
            ? 'bg-rose-950/90 text-rose-200 border-rose-500'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
        }`}>
          N: {seats.N ? seats.N.name : 'Pusto'}
          {isNSVul ? ' (Po)' : ' (Przed)'}
          {phase === 'PLAYING' && (
            declarerSeat === 'N' ? ' • Rozgrywający' :
            dummySeat === 'N' ? ' • Dziadek' :
            ' • Partner (Obrońca)'
          )}
        </div>

        {/* If North is Defender, partner's cards are hidden */}
        {phase === 'PLAYING' && dummySeat !== 'N' && declarerSeat !== 'N' && (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] sm:text-[11px] text-slate-300 shadow-sm">
            <span className="text-amber-400">🔒</span>
            <span className="font-semibold text-slate-200">Karty partnera zakryte</span>
            <span className="text-slate-400">
              ({Math.max(0, 13 - (pastTricks ? pastTricks.length : 0) - (getPlayedCardForSeat('N') ? 1 : 0))} kart)
            </span>
          </div>
        )}

        {/* NORTH HAND: Dummy during play OR full hand revealed in BOARD_RESULT */}
        {((phase === 'PLAYING' && dummySeat === 'N' && dummyHand && dummyHand.length > 0) ||
          (phase === 'BOARD_RESULT' && (state.dealHands?.N || dummyHand))) && (
          <div className="w-full max-w-xl mx-auto px-1">
            <DummyHandView
              dummySeat="N"
              dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.N || dummyHand || []) : dummyHand!}
              canIPlayDummy={false}
              leadCardSuit={null}
              onPlayCard={() => {}}
              trumpSuit={contract ? contract.suit : undefined}
              declarerSeat={declarerSeat}
              mySeat={mySeat}
              seatName={seats.N?.name}
            />
          </div>
        )}
      </div>

      {/* PROMINENT TRICK SCOREBOARD BAR */}
      {(phase === 'PLAYING' || phase === 'BOARD_RESULT') && contract && (
        <div className="w-full max-w-xl mx-auto px-2 py-0.5 bg-slate-950/90 border border-slate-700/80 rounded-lg flex items-center justify-between text-[11px] sm:text-xs font-bold shadow-md my-0.5 shrink-0">
          {/* N-S tricks */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
            (mySeat === 'N' || mySeat === 'S') ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-300'
          }`}>
            <span className="text-[10px] font-semibold text-slate-400">
              {(mySeat === 'N' || mySeat === 'S') ? 'My (N-S):' : 'Para N-S:'}
            </span>
            <span className="text-sm sm:text-base font-black text-white font-mono">{tricksWonNS}</span>
            {(contract.declarer === 'N' || contract.declarer === 'S') && (
              <span className="text-[9px] text-emerald-400">/ cel: {contract.level + 6}</span>
            )}
          </div>

          {/* Vulnerability badge */}
          <div className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black ${
            vulnerability === 'NONE' ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/40' :
            vulnerability === 'BOTH' ? 'text-rose-300 bg-rose-950/80 border border-rose-500/40' :
            'text-amber-300 bg-amber-950/80 border border-amber-500/40'
          }`}>
            {formatVulnerabilityPl(vulnerability)}
          </div>

          {/* E-W tricks */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
            (mySeat === 'E' || mySeat === 'W') ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-300'
          }`}>
            <span className="text-[10px] font-semibold text-slate-400">
              {(mySeat === 'E' || mySeat === 'W') ? 'My (E-W):' : 'Para E-W:'}
            </span>
            <span className="text-sm sm:text-base font-black text-white font-mono">{tricksWonEW}</span>
            {(contract.declarer === 'E' || contract.declarer === 'W') && (
              <span className="text-[9px] text-emerald-400">/ cel: {contract.level + 6}</span>
            )}
          </div>
        </div>
      )}

      {/* MIDDLE SECTION: WEST, FELT TABLE (TRICK / AUCTION), EAST */}
      <div className="flex-1 min-h-0 flex items-center justify-between my-0.5 sm:my-1 relative overflow-hidden">
        {/* WEST SEAT */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {(phase === 'PLAYING' && dummySeat === 'W' && dummyHand && dummyHand.length > 0) ||
           (phase === 'BOARD_RESULT' && (state.dealHands?.W || (dummySeat === 'W' && dummyHand))) ? (
            <SideDummyHandView
              dummySeat="W"
              dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.W || dummyHand || []) : dummyHand!}
              trumpSuit={contract ? contract.suit : undefined}
              canIPlayDummy={false}
              leadCardSuit={null}
              onPlayCard={() => {}}
              seatName={seats.W?.name}
            />
          ) : (
            <div className={`w-14 sm:w-20 px-2 py-0.5 rounded-lg text-center text-[11px] sm:text-xs font-bold border transition ${
              currentTurn === 'W' || currentBidder === 'W'
                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
                : isEWVul
                ? 'bg-rose-950/90 text-rose-200 border-rose-500'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
            }`}>
              W: {seats.W ? seats.W.name : 'Pusto'}
              {isEWVul ? ' (Po)' : ' (Przed)'}
              {declarerSeat === 'W' && <span className="block text-[9px] text-amber-300 font-black">Rozgrywa 🎯</span>}
              {dummySeat === 'W' && <span className="block text-[9px] text-cyan-300 font-black">Dziadek 👁️</span>}
              {phase === 'PLAYING' && declarerSeat !== 'W' && dummySeat !== 'W' && (
                <span className="block text-[8px] text-slate-400">Obrońca</span>
              )}
            </div>
          )}
        </div>

        {/* FELT CENTER */}
        <div
          onClick={() => {
            if (phase === 'PLAYING' && currentTrick.cards.length === 4 && onCollectTrick) {
              onCollectTrick();
            }
          }}
          className={`flex-1 max-w-xl mx-1 sm:mx-2 bg-felt/90 border-2 sm:border-4 border-amber-900/40 rounded-2xl p-1 sm:p-2 shadow-inner relative min-h-[120px] sm:min-h-[160px] max-h-[165px] sm:max-h-[220px] flex flex-col items-center justify-center ${
            currentTrick.cards.length === 4 ? 'cursor-pointer' : ''
          }`}
        >
          {/* Phase: BIDDING */}
          {phase === 'BIDDING' && (
            <div className="w-full space-y-1">
              <BiddingTray dealer={dealer} bids={bids} />
            </div>
          )}

          {/* Center Trick View or Finished Board Overview */}
          <TrickCenterView
            phase={phase}
            lastResult={lastResult}
            boardNumber={state.boardNumber}
            contract={contract}
            declarerSeat={declarerSeat}
            currentTrick={currentTrick}
            seatNames={SEAT_NAMES}
            onCollectTrick={onCollectTrick}
            onOpenResultModal={() => setShowResultModal(true)}
            onNextBoard={onNextBoard}
            onStartNewEight={onStartNewEight}
          />
        </div>

        {/* EAST SEAT */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {(phase === 'PLAYING' && dummySeat === 'E' && dummyHand && dummyHand.length > 0) ||
           (phase === 'BOARD_RESULT' && (state.dealHands?.E || (dummySeat === 'E' && dummyHand))) ? (
            <SideDummyHandView
              dummySeat="E"
              dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.E || dummyHand || []) : dummyHand!}
              trumpSuit={contract ? contract.suit : undefined}
              canIPlayDummy={false}
              leadCardSuit={null}
              onPlayCard={() => {}}
              seatName={seats.E?.name}
            />
          ) : (
            <div className={`w-14 sm:w-20 px-2 py-0.5 rounded-lg text-center text-[11px] sm:text-xs font-bold border transition ${
              currentTurn === 'E' || currentBidder === 'E'
                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
                : isEWVul
                ? 'bg-rose-950/90 text-rose-200 border-rose-500'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
            }`}>
              E: {seats.E ? seats.E.name : 'Pusto'}
              {isEWVul ? ' (Po)' : ' (Przed)'}
              {declarerSeat === 'E' && <span className="block text-[9px] text-amber-300 font-black">Rozgrywa 🎯</span>}
              {dummySeat === 'E' && <span className="block text-[9px] text-cyan-300 font-black">Dziadek 👁️</span>}
              {phase === 'PLAYING' && declarerSeat !== 'E' && dummySeat !== 'E' && (
                <span className="block text-[8px] text-slate-400">Obrońca</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: SOUTH SEAT / BIDDING CONTROLS OR MY HAND */}
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto space-y-0.5 sm:space-y-1 shrink-0">
        <div className={`px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border transition shrink-0 ${
          currentTurn === 'S' || currentBidder === 'S'
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : isNSVul
            ? 'bg-rose-950/90 text-rose-200 border-rose-500'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
        }`}>
          S: {seats.S ? seats.S.name : 'Pusto'}
          {isNSVul ? ' (Po)' : ' (Przed)'}
          {phase === 'PLAYING' && (
            declarerSeat === 'S' ? ' • Rozgrywający' :
            dummySeat === 'S' ? ' • Dziadek' :
            ' • Ty (Obrońca)'
          )}
          {phase !== 'PLAYING' && mySeat === 'S' && ' • (Ty)'}
        </div>

        {/* Bidding Controls if Bidding phase */}
        {phase === 'BIDDING' && (
          <div className="w-full">
            <BiddingBox
              bids={bids}
              currentBidder={currentBidder}
              mySeat={mySeat}
              onMakeBid={onMakeBid}
            />
          </div>
        )}

        {/* Player's Cards in Hand - Grouped by suit with overlap exactly like Dummy */}
        {((phase !== 'BOARD_RESULT' && myHand && myHand.length > 0) ||
          (phase === 'BOARD_RESULT' && (state.dealHands?.S || myHand))) && (
          <PlayerHandView
            hand={phase === 'BOARD_RESULT' ? (state.dealHands?.S || myHand) : myHand}
            isMyTurn={false}
            phase={phase}
            leadCardSuit={null}
            onPlayCard={() => {}}
            mySeat={mySeat}
            seatName={mySeat ? SEAT_NAMES[mySeat] : undefined}
            trumpSuit={contract ? contract.suit : undefined}
          />
        )}
      </div>
    </div>
  );
};
