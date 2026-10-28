import React from 'react';
import { Card, ChatMessage, Contract, PlayedCard, RoomState, Seat, Trick } from '../types/bridge';
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
import { formatVulnerabilityPl, isSideVulnerable, nextSeat, partnerSeat } from '../logic/vulnerability';
import { Users, AlertCircle, Play, RotateCcw, QrCode, Bot } from 'lucide-react';

interface BridgeTableProps {
  state: RoomState;
  mySeat: Seat | null;
  playerName: string;
  onChangePlayerName: (name: string) => void;
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
  onOpenScores?: () => void;
  onOpenChat?: () => void;
  latestChatMessage?: ChatMessage | null;
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
  playerName,
  onChangePlayerName,
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
  onOpenScores,
  onOpenChat,
  latestChatMessage = null,
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

  // Relative seats from the perspective of the current player (bottom = me, top = partner, left = LHO, right = RHO)
  const bottomSeat: Seat = mySeat || 'S';
  const leftSeat: Seat = nextSeat(bottomSeat);
  const topSeat: Seat = partnerSeat(bottomSeat);
  const rightSeat: Seat = nextSeat(topSeat);

  const isSeatVul = (s: Seat) => isSideVulnerable(s === 'N' || s === 'S' ? 'NS' : 'EW', vulnerability);

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

  const [showResultModal, setShowResultModal] = React.useState(false);

  React.useEffect(() => {
    if (phase !== 'BOARD_RESULT') {
      setShowResultModal(false);
    }
  }, [phase]);

  const bottomHandToDisplay =
    phase === 'BOARD_RESULT'
      ? (state.dealHands?.[bottomSeat] || myHand)
      : (myHand && myHand.length > 0 ? myHand : (dummySeat === bottomSeat && dummyHand ? dummyHand : []));

  return (
    <div
      onClick={() => {
        if (phase === 'BOARD_RESULT' && !showResultModal) {
          setShowResultModal(true);
        } else if (phase === 'PLAYING' && currentTrick.cards.length === 4 && onCollectTrick) {
          onCollectTrick();
        }
      }}
      className="relative w-full h-full flex flex-col justify-between p-1 sm:p-2.5 select-none overflow-hidden cursor-default"
    >
      {/* LOBBY OVERLAY / PHASE */}
      {phase === 'LOBBY' && (
        <LobbyOverlay
          state={state}
          mySeat={mySeat}
          playerName={playerName}
          onChangePlayerName={onChangePlayerName}
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
          onOpenScores={onOpenScores}
        />
      )}

      {/* RESULT BANNER (When table is previewed after board finishes) */}
      {phase === 'BOARD_RESULT' && lastResult && !showResultModal && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowResultModal(true);
          }}
          className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-3 py-1 rounded-xl text-center cursor-pointer transition shadow-lg border border-emerald-400/50 mb-0.5 flex items-center justify-between text-xs sm:text-sm animate-pulse shrink-0"
        >
          <span className="font-bold">🏁 Koniec: {lastResult.resultDetail}</span>
          <span className="bg-emerald-950/80 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-200">
            {state.boardNumber % 8 === 0 ? '🏆 Zakończona 8! Protokół & DDS 📊' : 'Protokół & DDS 📊'}
          </span>
        </div>
      )}

      {/* TOP: PARTNER SEAT (topSeat) & DUMMY CARDS */}
      <div className="w-full flex flex-col items-center gap-0.5 shrink-0">
        <div className={`px-3 py-0.5 rounded-full text-xs font-bold border transition ${
          currentTurn === topSeat || currentBidder === topSeat
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : isSeatVul(topSeat)
            ? 'bg-rose-950/90 text-rose-200 border-rose-500'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
        }`}>
          {topSeat}: {seats[topSeat] ? seats[topSeat]!.name : 'Pusto'}
          {isSeatVul(topSeat) ? ' (Po)' : ' (Przed)'}
          {phase === 'PLAYING' && (
            declarerSeat === topSeat ? ' • Rozgrywający' :
            dummySeat === topSeat ? ' • Dziadek' :
            ' • Partner (Obrońca)'
          )}
        </div>

        {/* If topSeat is not Dummy, partner's cards are hidden during play */}
        {phase === 'PLAYING' && dummySeat !== topSeat && (
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] sm:text-[11px] text-slate-300 shadow-sm">
            <span className="text-amber-400">🔒</span>
            <span className="font-semibold text-slate-200">Karty partnera ({topSeat}) zakryte</span>
            <span className="text-slate-400">
              ({Math.max(0, 13 - (pastTricks ? pastTricks.length : 0) - (getPlayedCardForSeat(topSeat) ? 1 : 0))} kart)
            </span>
          </div>
        )}

        {/* TOP HAND: Partner Dummy during play OR full hand revealed in BOARD_RESULT */}
        {((phase === 'PLAYING' && dummySeat === topSeat && dummyHand && dummyHand.length > 0) ||
          (phase === 'BOARD_RESULT' && (state.dealHands?.[topSeat] || (dummySeat === topSeat && dummyHand)))) && (
          <div className="w-full">
            <DummyHandView
              dummySeat={topSeat}
              dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.[topSeat] || dummyHand || []) : dummyHand!}
              canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
              leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
              onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
              trumpSuit={contract ? contract.suit : undefined}
              declarerSeat={declarerSeat}
              mySeat={mySeat}
              seatName={seats[topSeat]?.name}
            />
          </div>
        )}
      </div>

      {/* PROMINENT TRICK SCOREBOARD BAR (Active only during play) */}
      {phase === 'PLAYING' && contract && (
        <div className="w-full max-w-xl mx-auto px-2 py-0.5 bg-slate-950/90 border border-slate-700/80 rounded-lg flex items-center justify-between text-[11px] sm:text-xs font-bold shadow-md my-0.5 shrink-0">
          {/* N-S tricks */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
            (bottomSeat === 'N' || bottomSeat === 'S') ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-300'
          }`}>
            <span className="text-[10px] font-semibold text-slate-400">
              {(bottomSeat === 'N' || bottomSeat === 'S') ? 'My (N-S):' : 'Para N-S:'}
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
            (bottomSeat === 'E' || bottomSeat === 'W') ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-300'
          }`}>
            <span className="text-[10px] font-semibold text-slate-400">
              {(bottomSeat === 'E' || bottomSeat === 'W') ? 'My (E-W):' : 'Para E-W:'}
            </span>
            <span className="text-sm sm:text-base font-black text-white font-mono">{tricksWonEW}</span>
            {(contract.declarer === 'E' || contract.declarer === 'W') && (
              <span className="text-[9px] text-emerald-400">/ cel: {contract.level + 6}</span>
            )}
          </div>
        </div>
      )}

      {/* MIDDLE SECTION: LEFT OPPONENT (leftSeat), FELT TABLE, RIGHT OPPONENT (rightSeat) */}
      <div className="flex-1 min-h-0 flex items-center justify-between my-0.5 relative">
        {/* LEFT SEAT */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {(phase === 'PLAYING' && dummySeat === leftSeat && dummyHand && dummyHand.length > 0) ||
           (phase === 'BOARD_RESULT' && (state.dealHands?.[leftSeat] || (dummySeat === leftSeat && dummyHand))) ? (
            <SideDummyHandView
              dummySeat={leftSeat}
              dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.[leftSeat] || dummyHand || []) : dummyHand!}
              trumpSuit={contract ? contract.suit : undefined}
              canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
              leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
              onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
              seatName={seats[leftSeat]?.name}
            />
          ) : (
            <div className={`w-14 sm:w-20 px-1.5 py-1 rounded-lg text-center text-[10px] sm:text-xs font-bold border transition ${
              currentTurn === leftSeat || currentBidder === leftSeat
                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
                : isSeatVul(leftSeat)
                ? 'bg-rose-950/90 text-rose-200 border-rose-500'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
            }`}>
              {leftSeat}: {seats[leftSeat] ? seats[leftSeat]!.name : 'Pusto'}
              {isSeatVul(leftSeat) ? ' (Po)' : ' (Przed)'}
              {declarerSeat === leftSeat && <span className="block text-[9px] text-amber-300 font-black">Rozgrywa 🎯</span>}
              {dummySeat === leftSeat && <span className="block text-[9px] text-cyan-300 font-black">Dziadek 👁️</span>}
              {phase === 'PLAYING' && declarerSeat !== leftSeat && dummySeat !== leftSeat && (
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
          className={`flex-1 max-w-xl mx-1 sm:mx-2 bg-felt/90 border-2 sm:border-4 border-amber-900/40 rounded-2xl p-1 sm:p-2 shadow-inner relative min-h-[120px] sm:min-h-[160px] max-h-[175px] sm:max-h-[220px] flex flex-col items-center justify-center ${
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
            topSeat={topSeat}
            bottomSeat={bottomSeat}
            leftSeat={leftSeat}
            rightSeat={rightSeat}
            onCollectTrick={onCollectTrick}
            onOpenResultModal={() => setShowResultModal(true)}
            onNextBoard={onNextBoard}
            onStartNewEight={onStartNewEight}
          />
        </div>

        {/* RIGHT SEAT */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {(phase === 'PLAYING' && dummySeat === rightSeat && dummyHand && dummyHand.length > 0) ||
           (phase === 'BOARD_RESULT' && (state.dealHands?.[rightSeat] || (dummySeat === rightSeat && dummyHand))) ? (
            <SideDummyHandView
              dummySeat={rightSeat}
              dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.[rightSeat] || dummyHand || []) : dummyHand!}
              trumpSuit={contract ? contract.suit : undefined}
              canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
              leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
              onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
              seatName={seats[rightSeat]?.name}
            />
          ) : (
            <div className={`w-14 sm:w-20 px-1.5 py-1 rounded-lg text-center text-[10px] sm:text-xs font-bold border transition ${
              currentTurn === rightSeat || currentBidder === rightSeat
                ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
                : isSeatVul(rightSeat)
                ? 'bg-rose-950/90 text-rose-200 border-rose-500'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
            }`}>
              {rightSeat}: {seats[rightSeat] ? seats[rightSeat]!.name : 'Pusto'}
              {isSeatVul(rightSeat) ? ' (Po)' : ' (Przed)'}
              {declarerSeat === rightSeat && <span className="block text-[9px] text-amber-300 font-black">Rozgrywa 🎯</span>}
              {dummySeat === rightSeat && <span className="block text-[9px] text-cyan-300 font-black">Dziadek 👁️</span>}
              {phase === 'PLAYING' && declarerSeat !== rightSeat && dummySeat !== rightSeat && (
                <span className="block text-[8px] text-slate-400">Obrońca</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: MY SEAT (bottomSeat) / BIDDING CONTROLS & MY HAND */}
      <div className="flex flex-col items-center w-full space-y-0.5 sm:space-y-1 shrink-0">
        <div className={`px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border transition shrink-0 ${
          currentTurn === bottomSeat || currentBidder === bottomSeat
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : isSeatVul(bottomSeat)
            ? 'bg-rose-950/90 text-rose-200 border-rose-500'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
        }`}>
          {bottomSeat}: {seats[bottomSeat] ? seats[bottomSeat]!.name : 'Pusto'}
          {isSeatVul(bottomSeat) ? ' (Po)' : ' (Przed)'}
          {phase === 'PLAYING' && (
            declarerSeat === bottomSeat ? ' • Ty (Rozgrywający 🎯)' :
            dummySeat === bottomSeat ? ' • Ty (Dziadek)' :
            ' • Ty (Obrońca)'
          )}
          {phase !== 'PLAYING' && mySeat === bottomSeat && ' • (Ty)'}
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

        {/* Player's Cards in Hand - Full-width large cards at the bottom */}
        {bottomHandToDisplay && bottomHandToDisplay.length > 0 && (
          <PlayerHandView
            hand={bottomHandToDisplay}
            isMyTurn={phase === 'PLAYING' ? isMyTurn : false}
            canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
            currentTurn={currentTurn}
            phase={phase}
            leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
            onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
            mySeat={bottomSeat}
            seatName={seats[bottomSeat]?.name || SEAT_NAMES[bottomSeat]}
            trumpSuit={contract ? contract.suit : undefined}
          />
        )}
      </div>

      {/* FLOATING RECENT CHAT BUBBLE OVER TABLE */}
      {latestChatMessage && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChat) onOpenChat();
          }}
          className="absolute bottom-20 left-3 sm:left-6 z-30 max-w-[220px] sm:max-w-xs bg-slate-900/95 border border-emerald-400 text-white px-3 py-1.5 rounded-2xl shadow-2xl text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer animate-scaleUp hover:bg-slate-800 transition"
        >
          <span className="text-emerald-400 font-bold shrink-0">💬 {latestChatMessage.senderName}:</span>
          <span className="truncate text-slate-200">{latestChatMessage.text}</span>
        </div>
      )}
    </div>
  );
};
