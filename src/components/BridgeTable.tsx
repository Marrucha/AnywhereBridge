import React from 'react';
import { Card, Contract, PlayedCard, RoomState, Seat, Trick } from '../types/bridge';
import { CardView } from './CardView';
import { BiddingBox } from './BiddingBox';
import { BiddingTray } from './BiddingTray';
import { DdsView } from './DdsView';
import { DummyHandView } from './DummyHandView';
import { PlayerHandView } from './PlayerHandView';
import { LobbyOverlay } from './LobbyOverlay';
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
        <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 max-w-lg w-full text-center shadow-2xl space-y-3.5 my-auto max-h-[95vh] overflow-y-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Rozdanie zakończone</span>
            <h3 className="text-xl sm:text-2xl font-black text-white">{lastResult.resultDetail}</h3>

            <div className="grid grid-cols-2 gap-2.5 py-2 border-y border-slate-800 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Lewy N-S</span>
                <span className="text-xl font-black text-white">{lastResult.tricksWonNS}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-xs">Lewy E-W</span>
                <span className="text-xl font-black text-white">{lastResult.tricksWonEW}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-2.5 rounded-xl text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Zapis N-S</span>
                <span className={`text-base sm:text-lg font-bold ${lastResult.scoreNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {lastResult.scoreNS >= 0 ? `+${lastResult.scoreNS}` : lastResult.scoreNS}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-xs block">Zapis E-W</span>
                <span className={`text-base sm:text-lg font-bold ${lastResult.scoreEW >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {lastResult.scoreEW >= 0 ? `+${lastResult.scoreEW}` : lastResult.scoreEW}
                </span>
              </div>
            </div>

            {/* Double Dummy Solver (DDS) & Minimax Matrix */}
            <DdsView
              ddsResult={ddsResult}
              loading={ddsLoading}
              contract={contract}
              wonNS={lastResult.tricksWonNS}
              wonEW={lastResult.tricksWonEW}
            />

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResultModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition border border-slate-700"
              >
                👁️ Podejrzyj stół
              </button>
              <button
                type="button"
                onClick={onNextBoard}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Następne (#{state.boardNumber + 1})
              </button>
            </div>
          </div>
        </div>
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
          <span className="font-bold">🏁 Koniec rozdania: {lastResult.resultDetail}</span>
          <span className="bg-emerald-950/80 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-200">
            Dotknij, aby otworzyć protokół & DDS 📊
          </span>
        </div>
      )}

      {/* TOP: NORTH SEAT & DUMMY CARDS (ABOVE THE TABLE) */}
      <div className="flex flex-col items-center gap-1">
        <div className={`px-3 py-0.5 rounded-full text-xs font-bold border transition ${
          currentTurn === 'N' || currentBidder === 'N'
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : isNSVul
            ? 'bg-rose-950/90 text-rose-200 border-rose-500'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
        }`}>
          N: {seats.N ? seats.N.name : 'Pusto'}
          {isNSVul ? ' (Po)' : ' (Przed)'}
          {declarerSeat === 'N' && ' (Rozgrywający)'}
          {dummySeat === 'N' && ' (Dziadek)'}
        </div>

        {/* DUMMY CARDS (If exposed) - Positioned ABOVE THE FELT TABLE */}
        {(phase === 'PLAYING' || phase === 'BOARD_RESULT') && dummySeat && dummyHand && dummyHand.length > 0 && (
          <div className="w-full max-w-xl mx-auto px-1">
            <DummyHandView
              dummySeat={dummySeat}
              dummyHand={dummyHand}
              canIPlayDummy={canIPlayDummy}
              leadCardSuit={leadCardSuit}
              onPlayCard={onPlayCard}
              trumpSuit={contract ? contract.suit : undefined}
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
        <div className="w-14 sm:w-20 flex flex-col items-center justify-center shrink-0">
          <div className={`px-2 py-0.5 rounded-lg text-center text-[11px] sm:text-xs font-bold border transition ${
            currentTurn === 'W' || currentBidder === 'W'
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
              : isEWVul
              ? 'bg-rose-950/90 text-rose-200 border-rose-500'
              : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
          }`}>
            W: {seats.W ? seats.W.name : 'Pusto'}
            {isEWVul ? ' (Po)' : ' (Przed)'}
            {declarerSeat === 'W' && <span className="block text-[9px]">(R)</span>}
            {dummySeat === 'W' && <span className="block text-[9px]">(D)</span>}
          </div>
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

          {/* Phase: PLAYING or BOARD_RESULT (Trick cards in cross orientation) */}
          {(phase === 'PLAYING' || phase === 'BOARD_RESULT') && (
            <div className="relative w-40 h-40 sm:w-52 sm:h-52 flex items-center justify-center">
              {/* North Card - SAME SIZE AS HAND (size="md") */}
              {getPlayedCardForSeat('N') && (
                <div className="absolute top-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('N')!.card} size="md" isPlayable={false} />
                </div>
              )}
              {/* South Card - SAME SIZE AS HAND (size="md") */}
              {getPlayedCardForSeat('S') && (
                <div className="absolute bottom-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('S')!.card} size="md" isPlayable={false} />
                </div>
              )}
              {/* West Card - SAME SIZE AS HAND (size="md") */}
              {getPlayedCardForSeat('W') && (
                <div className="absolute left-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('W')!.card} size="md" isPlayable={false} />
                </div>
              )}
              {/* East Card - SAME SIZE AS HAND (size="md") */}
              {getPlayedCardForSeat('E') && (
                <div className="absolute right-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('E')!.card} size="md" isPlayable={false} />
                </div>
              )}

              {/* CENTER: Winner badge if trick complete (doesn't cover any card) OR LARGE CONTRACT */}
              {currentTrick.cards.length === 4 && currentTrick.winnerSeat ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCollectTrick) onCollectTrick();
                  }}
                  className="z-30 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-xl shadow-2xl border-2 border-amber-100 animate-pulse cursor-pointer flex flex-col items-center justify-center text-center leading-tight"
                >
                  <span className="text-[11px] font-black">
                    🎉 {SEAT_NAMES[currentTrick.winnerSeat]?.split(' ')[0]} ({currentTrick.winnerSeat})
                  </span>
                  <span className="text-[9px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded font-bold mt-0.5">
                    Dotknij 👉
                  </span>
                </div>
              ) : (
                contract && (
                  <div className="z-10 bg-slate-950/95 border-2 border-amber-400 text-amber-300 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl shadow-2xl font-black flex items-center gap-1.5 pointer-events-none">
                    <span className="text-white text-base sm:text-2xl font-black">{formatContractString(contract)}</span>
                    <span className="text-amber-400 text-xs sm:text-sm font-bold">({contract.declarer})</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* EAST SEAT */}
        <div className="w-14 sm:w-20 flex flex-col items-center justify-center shrink-0">
          <div className={`px-2 py-0.5 rounded-lg text-center text-[11px] sm:text-xs font-bold border transition ${
            currentTurn === 'E' || currentBidder === 'E'
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
              : isEWVul
              ? 'bg-rose-950/90 text-rose-200 border-rose-500'
              : 'bg-emerald-950/80 text-emerald-200 border-emerald-600'
          }`}>
            E: {seats.E ? seats.E.name : 'Pusto'}
            {isEWVul ? ' (Po)' : ' (Przed)'}
            {declarerSeat === 'E' && <span className="block text-[9px]">(R)</span>}
            {dummySeat === 'E' && <span className="block text-[9px]">(D)</span>}
          </div>
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
          {declarerSeat === 'S' && ' (Rozgrywający)'}
          {dummySeat === 'S' && ' (Dziadek)'}
          {mySeat === 'S' && ' • (Ty)'}
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
        {myHand && myHand.length > 0 && (
          <PlayerHandView
            hand={myHand}
            isMyTurn={isMyTurn}
            phase={phase}
            leadCardSuit={leadCardSuit}
            onPlayCard={onPlayCard}
            mySeat={mySeat}
            seatName={mySeat ? SEAT_NAMES[mySeat] : undefined}
            trumpSuit={contract ? contract.suit : undefined}
          />
        )}
      </div>
    </div>
  );
};
