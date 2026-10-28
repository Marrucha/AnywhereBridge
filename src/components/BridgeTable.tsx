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
import { UndoRequestBanner } from './UndoRequestBanner';
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
  // In bridge, declarer plays the dummy's cards on dummy's turn!
  const canIPlayDummy = !isUndoPending && mySeat !== null && declarerSeat === mySeat && isDummyTurn;

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

  React.useEffect(() => {
    if (phase !== 'BOARD_RESULT') {
      setShowResultModal(false);
    }
  }, [phase]);

  const bottomHandToDisplay =
    phase === 'BOARD_RESULT'
      ? (state.dealHands?.[bottomSeat] || myHand)
      : (myHand && myHand.length > 0 ? myHand : (dummySeat === bottomSeat && dummyHand ? dummyHand : []));

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
          seatName={seats[sideSeat]?.name}
        />
      );
    }
    return (
      <div className={`w-14 sm:w-20 px-1.5 py-1 rounded-lg text-center text-[10px] sm:text-xs font-bold border transition ${
        effectiveTurn === sideSeat || currentBidder === sideSeat
          ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
          : isSeatVul(sideSeat)
          ? 'bg-rose-950/90 text-rose-200 border-rose-500'
          : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
      }`}>
        {sideSeat}: {seats[sideSeat] ? seats[sideSeat]!.name : 'Pusto'}
        {isSeatVul(sideSeat) ? ' (Po)' : ' (Przed)'}
        {declarerSeat === sideSeat && <span className="block text-[9px] text-amber-300 font-black">Rozgrywa 🎯</span>}
        {dummySeat === sideSeat && <span className="block text-[9px] text-cyan-300 font-black">Dziadek 👁️ (u góry)</span>}
        {phase === 'PLAYING' && declarerSeat !== sideSeat && dummySeat !== sideSeat && (
          <span className="block text-[8px] text-slate-400">Obrońca</span>
        )}
      </div>
    );
  };

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
      {/* UNDO REQUEST MODAL & NOTICE TOAST */}
      <UndoRequestBanner
        undoRequest={state.undoRequest}
        undoNotice={state.undoNotice}
        mySeat={mySeat}
        onRespondUndo={onRespondUndo}
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

      {/* MAIN LAYOUT: Column in Portrait, Row in Landscape when BIDDING (so Bidding Box is on the side of the table!) */}
      <div className="flex-1 min-h-0 w-full flex flex-col landscape:flex-row items-stretch justify-between gap-1 overflow-hidden">
        {/* TABLE COLUMN (Top Partner, Middle Felt + Left/Right Seats, Bottom Player Hand) */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col justify-between">
          {/* TOP: PARTNER SEAT (topSeat), INLINE SCORE PILLS & DUMMY CARDS */}
          <div className="w-full flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-full flex items-center justify-center flex-wrap gap-1.5 px-1">
              {/* N-S Tricks compact pill (during play) */}
              {phase === 'PLAYING' && contract && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${
                  (bottomSeat === 'N' || bottomSeat === 'S')
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}>
                  <span>NS:</span>
                  <span className="font-black text-white font-mono">{tricksWonNS}</span>
                  {(contract.declarer === 'N' || contract.declarer === 'S') && (
                    <span className="text-[9px] text-emerald-400">/{contract.level + 6}</span>
                  )}
                </div>
              )}

              {/* Top Partner Seat Badge (with inline hidden card count so no 2nd bar is needed!) */}
              <div className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border transition flex items-center gap-1 ${
                currentTurn === topSeat || currentBidder === topSeat
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
                  : isSeatVul(topSeat)
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500'
                  : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
              }`}>
                <span>
                  {topSeat}: {seats[topSeat] ? seats[topSeat]!.name : 'Pusto'}
                  {isSeatVul(topSeat) ? ' (Po)' : ' (Przed)'}
                </span>
                {phase === 'PLAYING' && (
                  <span className="opacity-90">
                    {declarerSeat === topSeat ? '• Rozgrywający' :
                     dummySeat === topSeat ? '• Dziadek' :
                     `• 🔒 ${Math.max(0, 13 - (pastTricks ? pastTricks.length : 0) - (getPlayedCardForSeat(topSeat) ? 1 : 0))} kart`}
                  </span>
                )}
              </div>

              {/* Vulnerability badge + Undo button right next to it ("Obok informacji obie przed") */}
              {(phase === 'PLAYING' || phase === 'BIDDING') && (
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black border ${
                    vulnerability === 'NONE' ? 'text-emerald-300 bg-emerald-950/90 border-emerald-500/50' :
                    vulnerability === 'BOTH' ? 'text-rose-300 bg-rose-950/90 border-rose-500/50' :
                    'text-amber-300 bg-amber-950/90 border-amber-500/50'
                  }`}>
                    {formatVulnerabilityPl(vulnerability)}
                  </span>

                  {onRequestUndo && (
                    <button
                      type="button"
                      disabled={!canUndoMove}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestUndo();
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black border transition shadow ${
                        canUndoMove
                          ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 border-amber-300 cursor-pointer'
                          : 'bg-slate-900/70 text-slate-500 border-slate-700/60 cursor-not-allowed opacity-60'
                      }`}
                      title="Poproś przeciwników o cofnięcie ostatniego ruchu / karty"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Cofnij</span>
                    </button>
                  )}
                </div>
              )}

              {/* E-W Tricks compact pill (during play) */}
              {phase === 'PLAYING' && contract && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${
                  (bottomSeat === 'E' || bottomSeat === 'W')
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}>
                  <span>EW:</span>
                  <span className="font-black text-white font-mono">{tricksWonEW}</span>
                  {(contract.declarer === 'E' || contract.declarer === 'W') && (
                    <span className="text-[9px] text-emerald-400">/{contract.level + 6}</span>
                  )}
                </div>
              )}
            </div>

            {/* TOP HAND: During PLAYING, ALWAYS show Dummy's cards at the top in full-width large size ("player", exact same size as your hand!) */}
            {((phase === 'PLAYING' && dummySeat && dummySeat !== bottomSeat && dummyHand && dummyHand.length > 0) ||
              (phase === 'BOARD_RESULT' && (state.dealHands?.[topSeat] || (dummySeat === topSeat && dummyHand)))) && (
              <div className="w-full">
                {phase === 'PLAYING' && dummySeat && dummySeat !== topSeat && (
                  <div className="text-center text-[10px] font-black text-cyan-300 leading-none pb-0.5">
                    🂠 Karty Dziadka ({dummySeat}: {seats[dummySeat]?.name || SEAT_NAMES[dummySeat]})
                  </div>
                )}
                <DummyHandView
                  dummySeat={phase === 'PLAYING' && dummySeat ? dummySeat : topSeat}
                  dummyHand={phase === 'BOARD_RESULT' ? (state.dealHands?.[topSeat] || dummyHand || []) : dummyHand!}
                  canIPlayDummy={phase === 'PLAYING' ? canIPlayDummy : false}
                  leadCardSuit={phase === 'PLAYING' ? leadCardSuit : null}
                  onPlayCard={phase === 'PLAYING' ? onPlayCard : () => {}}
                  trumpSuit={contract ? contract.suit : undefined}
                  declarerSeat={declarerSeat}
                  mySeat={mySeat}
                  seatName={seats[phase === 'PLAYING' && dummySeat ? dummySeat : topSeat]?.name}
                />
              </div>
            )}
          </div>

          {/* MIDDLE SECTION: LEFT OPPONENT (leftSeat), TALL FELT TABLE, RIGHT OPPONENT (rightSeat) */}
          <div className="flex-1 min-h-0 flex items-center justify-between my-0.5 relative">
            <div className="flex flex-col items-center justify-center shrink-0">
              {renderSideSeat(leftSeat)}
            </div>

            {/* FELT CENTER - Tall full-height felt table with no max-h cap */}
            <div
              onClick={() => {
                if (phase === 'PLAYING' && currentTrick.cards.length === 4 && onCollectTrick) {
                  onCollectTrick();
                }
              }}
              className={`flex-1 self-stretch max-w-2xl mx-1 sm:mx-2 bg-felt/90 border-2 sm:border-4 border-amber-900/40 rounded-2xl p-1 sm:p-2 shadow-inner relative min-h-[190px] land:min-h-[150px] desk:min-h-[240px] flex flex-col items-center justify-center ${
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
                      Rozdaje: <strong className="text-white">{SEAT_NAMES[dealer]}</strong> • Założenia: <strong className="text-amber-300">{formatVulnerabilityPl(vulnerability)}</strong>
                    </span>
                    <span className="text-[11px] text-emerald-300 font-semibold">
                      👉 Panel licytacji po prawej stronie stołu
                    </span>
                  </div>
                </>
              )}

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

            <div className="flex flex-col items-center justify-center shrink-0">
              {renderSideSeat(rightSeat)}
            </div>
          </div>

          {/* BOTTOM SECTION: MY SEAT (bottomSeat) / PORTRAIT BIDDING CONTROLS & MY HAND */}
          <div className="flex flex-col items-center w-full space-y-0.5 shrink-0">
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
              {phase === 'PLAYING' && isMyTurn && ' • 👇 Twoja tura!'}
              {phase === 'PLAYING' && canIPlayDummy && ' • 👆 Graj z Dziadka!'}
              {phase !== 'PLAYING' && mySeat === bottomSeat && ' • (Ty)'}
            </div>

            {phase === 'BIDDING' && (
              <div className="w-full landscape:hidden">
                <BiddingBox
                  bids={bids}
                  currentBidder={currentBidder}
                  mySeat={isUndoPending ? null : mySeat}
                  onMakeBid={onMakeBid}
                />
              </div>
            )}

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
        </div>

        {/* LANDSCAPE SIDE BIDDING PANEL (Shown on the right side of the table in Landscape mode during BIDDING!) */}
        {phase === 'BIDDING' && (
          <div className="hidden landscape:flex landscape:flex-col landscape:w-[270px] desk:landscape:w-[310px] shrink-0 h-full justify-center gap-1.5 pl-1 border-l border-slate-800/70 overflow-y-auto">
            <BiddingTray dealer={dealer} bids={bids} />
            <BiddingBox
              bids={bids}
              currentBidder={currentBidder}
              mySeat={isUndoPending ? null : mySeat}
              onMakeBid={onMakeBid}
            />
          </div>
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
