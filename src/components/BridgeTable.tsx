import React from 'react';
import { Card, ChatMessage, Contract, PlayedCard, RoomState, Seat, Trick } from '../types/bridge';
import { CardView } from './CardView';
import { BiddingBox } from './BiddingBox';
import { BiddingTray, BiddingReviewModal } from './BiddingTray';
import { BoardResultModal } from './BoardResultModal';
import { DummyHandView } from './DummyHandView';
import { SideDummyHandView } from './SideDummyHandView';
import { PlayerHandView } from './PlayerHandView';
import { LobbyOverlay } from './LobbyOverlay';
import { TrickCenterView } from './TrickCenterView';
import { UndoRequestBanner } from './UndoRequestBanner';
import { LandscapeSidePanel } from './LandscapeSidePanel';
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
  unreadChatCount?: number;
  latestChatMessage?: ChatMessage | null;
  onRequestUndo?: () => void;
  onRespondUndo?: (accept: boolean) => void;
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
  unreadChatCount = 0,
  latestChatMessage = null,
  onRequestUndo,
  onRespondUndo,
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

  const isUndoPending = !!state.undoRequest;
  const canUndoMove =
    !isUndoPending &&
    ((phase === 'BIDDING' && bids.length > 0) ||
      (phase === 'PLAYING' && (currentTrick.cards.length > 0 || pastTricks.length > 0)));

  // If 4 cards are lying on the table, the trick is already won by winnerSeat, so the next turn belongs to winnerSeat
  // and the next card played leads a new trick (leadCardSuit = null)!
  const effectiveTurn: Seat | null =
    currentTrick.cards.length === 4 && currentTrick.winnerSeat
      ? currentTrick.winnerSeat
      : currentTurn;

  const isMyTurn = !isUndoPending && mySeat !== null && effectiveTurn === mySeat;
  const isDummyTurn = !isUndoPending && dummySeat !== null && effectiveTurn === dummySeat;
  // In bridge, declarer plays the dummy's cards from the top hand on dummy's turn!
  const canIPlayDummy =
    !isUndoPending && mySeat !== null && declarerSeat === mySeat && isDummyTurn;

  const leadCardSuit =
    currentTrick.cards.length > 0 && currentTrick.cards.length < 4
      ? currentTrick.cards[0].card.suit
      : null;

  // Find played cards in current trick by seat
  const getPlayedCardForSeat = (seat: Seat): PlayedCard | undefined => {
    return currentTrick.cards.find(c => c.playedBy === seat);
  };

  const seatedCount = (['N', 'E', 'S', 'W'] as Seat[]).filter(s => seats[s] !== null).length;
  const allSeatsOccupied = seatedCount === 4;
  const totalPlayersInRoom = connectedCount !== undefined ? connectedCount : Math.max(connectedPlayers.length, seatedCount);
  const unseatedList = connectedPlayers.filter(p => !p.seat);

  const [showResultModal, setShowResultModal] = React.useState(false);
  const [showBiddingModal, setShowBiddingModal] = React.useState(false);
  const [hideResultCenterBox, setHideResultCenterBox] = React.useState(false);

  React.useEffect(() => {
    if (phase !== 'BOARD_RESULT') {
      setShowResultModal(false);
      setHideResultCenterBox(false);
    }
    if (phase === 'BIDDING' || phase === 'LOBBY') setShowBiddingModal(false);
  }, [phase, state.boardNumber]);

  const bottomHandToDisplay =
    phase === 'LOBBY'
      ? []
      : phase === 'BOARD_RESULT'
        ? (state.dealHands?.[bottomSeat] || myHand)
        : (myHand && myHand.length > 0 ? myHand : (dummySeat === bottomSeat && dummyHand ? dummyHand : []));

  const getCleanPlayerName = (seat: Seat): string => {
    const raw = seats[seat]?.name || 'Pusto';
    return raw.replace(/\s*\((Północ|Wschód|Południe|Zachód)\)/gi, '').trim();
  };

  const renderSeatBadge = (seat: Seat) => {
    const isDummy = dummySeat === seat;
    const isActiveTurn = effectiveTurn === seat || currentBidder === seat;
    return (
      <div
        className={`px-2.5 py-1 rounded-xl text-center border-2 transition shadow-md flex flex-col items-center justify-center min-w-[54px] sm:min-w-[68px] ${
          isDummy
            ? 'bg-amber-400 text-slate-950 border-amber-200'
            : 'bg-white text-slate-950 border-slate-300'
        } ${isActiveTurn ? 'ring-2 ring-emerald-400 shadow-emerald-500/30' : ''}`}
      >
        <span className="text-base sm:text-lg font-black leading-none">{seat}</span>
        <span className="text-[10px] sm:text-xs font-bold leading-tight truncate max-w-[74px] sm:max-w-[96px]">
          {getCleanPlayerName(seat)}
        </span>
      </div>
    );
  };

  const renderSideSeat = (sideSeat: Seat) => {
    const showDummy =
      phase === 'BOARD_RESULT' && (state.dealHands?.[sideSeat] || (dummySeat === sideSeat && dummyHand));
    if (showDummy) {
      return (
        <SideDummyHandView
          dummySeat={sideSeat as 'E' | 'W'}
          dummyHand={state.dealHands?.[sideSeat] || dummyHand || []}
          trumpSuit={contract ? contract.suit : undefined}
          canIPlayDummy={false}
          leadCardSuit={null}
          onPlayCard={() => {}}
          seatName={getCleanPlayerName(sideSeat)}
          expanded={phase === 'BOARD_RESULT' && hideResultCenterBox}
        />
      );
    }
    return renderSeatBadge(sideSeat);
  };

  return (
    <div
      onClick={() => {
        if (phase === 'BOARD_RESULT' && hideResultCenterBox) {
          setHideResultCenterBox(false);
        } else if (phase === 'PLAYING' && currentTrick.cards.length === 4 && onCollectTrick) {
          onCollectTrick();
        }
      }}
      className="relative w-full h-full flex flex-col justify-between p-1 sm:p-2.5 landscape:p-0.5 select-none overflow-hidden cursor-default"
    >
      {/* UNDO REQUEST MODAL & NOTICE TOAST */}
      <UndoRequestBanner
        undoRequest={state.undoRequest} undoNotice={state.undoNotice}
        mySeat={mySeat} onRespondUndo={onRespondUndo}
      />

      <BiddingReviewModal
        isOpen={showBiddingModal} onClose={() => setShowBiddingModal(false)}
        boardNumber={state.boardNumber} dealer={dealer} bids={bids}
      />

      {phase === 'LOBBY' && (
        <LobbyOverlay
          state={state} mySeat={mySeat} playerName={playerName} onChangePlayerName={onChangePlayerName}
          seats={seats} connectedPlayers={connectedPlayers} totalPlayersInRoom={totalPlayersInRoom}
          seatedCount={seatedCount} allSeatsOccupied={allSeatsOccupied} unseatedList={unseatedList}
          seatNames={SEAT_NAMES} onTakeSeat={onTakeSeat} onLeaveSeat={onLeaveSeat}
          onOpenQR={onOpenQR} onStartBotGame={onStartBotGame} onStartGame={onStartGame}
        />
      )}

      {phase === 'BOARD_RESULT' && lastResult && showResultModal && (
        <BoardResultModal
          lastResult={lastResult} contract={contract} boardNumber={state.boardNumber}
          ddsResult={ddsResult} ddsLoading={ddsLoading} onClose={() => setShowResultModal(false)}
          onNextBoard={onNextBoard} onStartNewEight={onStartNewEight} onOpenScores={onOpenScores}
        />
      )}

      {/* MAIN LAYOUT: Only rendered once a deal is started (never in LOBBY) */}
      {phase !== 'LOBBY' && (
      <div className="flex-1 min-h-0 w-full flex flex-col landscape:flex-row items-stretch justify-between gap-1 landscape:gap-0.5 overflow-hidden">
        {/* TABLE COLUMN (Top Partner, Middle Felt + Left/Right Seats, Bottom Player Hand) */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col justify-between">
          {/* TOP: PARTNER SEAT (topSeat), INLINE SCORE PILLS & DUMMY CARDS */}
          <div className="w-full relative z-30 flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-full flex items-center justify-center flex-wrap gap-2 px-1 landscape:hidden">
              {/* N-S Tricks card (during play) */}
              {phase === 'PLAYING' && contract && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm sm:text-base font-black border-2 shadow ${
                  (bottomSeat === 'N' || bottomSeat === 'S')
                    ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900/95 border-slate-600 text-slate-200'
                }`}>
                  <span>NS:</span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono leading-none">{tricksWonNS}</span>
                  {(contract.declarer === 'N' || contract.declarer === 'S') && (
                    <span className="text-xs sm:text-sm text-emerald-400 font-bold">/{contract.level + 6}</span>
                  )}
                </div>
              )}

              {/* Top Partner Seat Badge */}
              {renderSeatBadge(topSeat)}

              {/* Enlarged Undo button (without vulnerability text) */}
              {(phase === 'PLAYING' || phase === 'BIDDING') && onRequestUndo && (
                <button
                  type="button"
                  disabled={!canUndoMove}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestUndo();
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 transition shadow-md ${
                    canUndoMove
                      ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 border-amber-200 cursor-pointer'
                      : 'bg-slate-900/80 text-slate-400 border-slate-700 cursor-not-allowed opacity-60'
                  }`}
                  title="Poproś przeciwników o cofnięcie ostatniego ruchu / karty"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Cofnij</span>
                </button>
              )}

              {/* E-W Tricks card (during play) */}
              {phase === 'PLAYING' && contract && (
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm sm:text-base font-black border-2 shadow ${
                  (bottomSeat === 'E' || bottomSeat === 'W')
                    ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900/95 border-slate-600 text-slate-200'
                }`}>
                  <span>EW:</span>
                  <span className="text-lg sm:text-xl font-black text-white font-mono leading-none">{tricksWonEW}</span>
                  {(contract.declarer === 'E' || contract.declarer === 'W') && (
                    <span className="text-xs sm:text-sm text-emerald-400 font-bold">/{contract.level + 6}</span>
                  )}
                </div>
              )}
            </div>

            {/* TOP HAND: During PLAYING, ALWAYS show Dummy's cards at the top */}
            {((phase === 'PLAYING' && dummySeat && dummySeat !== bottomSeat && dummyHand && dummyHand.length > 0) ||
              (phase === 'BOARD_RESULT' && (state.dealHands?.[topSeat] || (dummySeat === topSeat && dummyHand)))) && (
              <div className="w-full">
                <DummyHandView
                  dummySeat={phase === 'PLAYING' && dummySeat ? dummySeat : topSeat}
                  dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.[topSeat] || dummyHand || []) : dummyHand!}
                  canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
                  leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
                  onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
                  trumpSuit={contract ? contract.suit : undefined}
                  declarerSeat={declarerSeat}
                  mySeat={mySeat}
                  seatName={getCleanPlayerName(phase === 'PLAYING' && dummySeat ? dummySeat : topSeat)}
                />
              </div>
            )}
          </div>

          {/* MIDDLE SECTION: LEFT OPPONENT (leftSeat), TALL SQUARE-ISH FELT TABLE, RIGHT OPPONENT (rightSeat) */}
          <div className="flex-1 min-h-0 flex items-center justify-center my-0.5 relative z-10">
            {phase === 'BOARD_RESULT' && hideResultCenterBox ? (
              <div className="w-full h-full grid grid-cols-2 gap-1.5 sm:gap-3 items-center px-1">
                {renderSideSeat(leftSeat)}
                {renderSideSeat(rightSeat)}
              </div>
            ) : (
              <>
                <div className={`flex flex-col items-center justify-center shrink-0 ${phase === 'PLAYING' ? 'landscape:hidden' : ''}`}>
                  {renderSideSeat(leftSeat)}
                </div>

                {/* FELT CENTER - Thick Vulnerability Frame: Top/Bottom = Our Side, Left/Right = Opponents */}
                <div
                  onClick={() => {
                    if (phase === 'PLAYING' && currentTrick.cards.length === 4 && onCollectTrick) {
                      onCollectTrick();
                    }
                  }}
                  style={{
                    borderTopColor: isSeatVul(bottomSeat) ? '#dc2626' : '#ffffff',
                    borderBottomColor: isSeatVul(bottomSeat) ? '#dc2626' : '#ffffff',
                    borderLeftColor: isSeatVul(leftSeat) ? '#dc2626' : '#ffffff',
                    borderRightColor: isSeatVul(leftSeat) ? '#dc2626' : '#ffffff',
                  }}
                  className={`flex-1 self-stretch max-w-xl mx-1 sm:mx-2 bg-felt/90 border-[5px] sm:border-[6px] border-solid rounded-2xl p-1 sm:p-2 shadow-inner relative min-h-[110px] land:min-h-[80px] desk:min-h-[220px] flex flex-col items-center justify-center ${
                    currentTrick.cards.length === 4 ? 'cursor-pointer' : ''
                  }`}
                >
                  {phase === 'BIDDING' && (
                    <>
                      <div className="w-full landscape:hidden">
                        <BiddingTray dealer={dealer} bids={bids} />
                      </div>
                      <div className="hidden landscape:flex flex-col items-center justify-center text-center gap-1">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                          Trwa licytacja • Rozdanie #{state.boardNumber}
                        </span>
                        <span className="text-xs text-slate-300">
                          Rozdaje: <strong className="text-white">{dealer}</strong>
                        </span>
                        <span className="text-[11px] text-emerald-300 font-semibold">
                          👉 Panel licytacji po prawej stronie stołu
                        </span>
                      </div>
                    </>
                  )}

                  <TrickCenterView
                    phase={phase} lastResult={lastResult} boardNumber={state.boardNumber}
                    contract={contract} declarerSeat={declarerSeat} currentTrick={currentTrick}
                    seatNames={SEAT_NAMES} topSeat={topSeat} bottomSeat={bottomSeat}
                    leftSeat={leftSeat} rightSeat={rightSeat} onCollectTrick={onCollectTrick}
                    onOpenResultModal={() => setShowResultModal(true)}
                    onOpenBiddingReview={() => setShowBiddingModal(true)}
                    onHideCenterBox={() => setHideResultCenterBox(true)}
                    onNextBoard={onNextBoard} onStartNewEight={onStartNewEight}
                  />
                </div>

                <div className={`flex flex-col items-center justify-center shrink-0 ${phase === 'PLAYING' ? 'landscape:hidden' : ''}`}>
                  {renderSideSeat(rightSeat)}
                </div>
              </>
            )}
          </div>

          {/* BOTTOM SECTION: MY SEAT (bottomSeat) / PORTRAIT BIDDING CONTROLS & MY HAND */}
          <div className="relative z-30 flex flex-col items-center w-full space-y-0.5 shrink-0">
            <div className="landscape:hidden shrink-0 flex items-center gap-2">
              {renderSeatBadge(bottomSeat)}
              {phase === 'BOARD_RESULT' && hideResultCenterBox && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHideResultCenterBox(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs border-2 border-emerald-300 shadow-lg cursor-pointer"
                >
                  Pokaż wynik
                </button>
              )}
            </div>

            {phase === 'BIDDING' && (
              <div className="w-full landscape:hidden">
                <BiddingBox
                  bids={bids} currentBidder={currentBidder}
                  mySeat={isUndoPending ? null : mySeat} onMakeBid={onMakeBid}
                />
              </div>
            )}

            {bottomHandToDisplay && bottomHandToDisplay.length > 0 && (
              <PlayerHandView
                hand={bottomHandToDisplay}
                isMyTurn={phase === 'PLAYING' ? isMyTurn : false}
                canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
                currentTurn={effectiveTurn} phase={phase}
                leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
                onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
                mySeat={bottomSeat}
                seatName={seats[bottomSeat]?.name || SEAT_NAMES[bottomSeat]}
                trumpSuit={contract ? contract.suit : undefined}
              />
            )}
          </div>
        </div>

        {/* LANDSCAPE RIGHT 1/4 BOX (Cofnij, Czat, Zliczanie lew, Licytacja) */}
        <LandscapeSidePanel
          phase={phase} boardNumber={state.boardNumber} dealer={dealer}
          vulnerability={vulnerability} bids={bids} currentBidder={currentBidder}
          mySeat={mySeat} bottomSeat={bottomSeat} isUndoPending={isUndoPending}
          canUndoMove={canUndoMove} contract={contract} tricksWonNS={tricksWonNS}
          tricksWonEW={tricksWonEW} effectiveTurn={effectiveTurn} onMakeBid={onMakeBid}
          onRequestUndo={onRequestUndo} onOpenChat={onOpenChat} unreadChatCount={unreadChatCount}
          onOpenScores={onOpenScores}
          onOpenBiddingReview={() => setShowBiddingModal(true)}
        />
      </div>
      )}

      {/* 2-SECOND CHAT POPUP OVER TABLE */}
      {latestChatMessage && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChat) onOpenChat();
          }}
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-md bg-slate-950/95 border-2 border-emerald-400 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-sm sm:text-base flex items-center gap-2 cursor-pointer animate-scaleUp hover:bg-slate-900 transition"
        >
          <span className="text-emerald-400 font-black shrink-0">💬 {latestChatMessage.senderName}:</span>
          <span className="font-bold text-white break-words">{latestChatMessage.text}</span>
        </div>
      )}
    </div>
  );
};
