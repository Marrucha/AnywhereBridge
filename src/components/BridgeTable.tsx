import React from 'react';
import { Card, Contract, PlayedCard, RoomState, Seat, Trick } from '../types/bridge';
import { CardView } from './CardView';
import { BiddingBox } from './BiddingBox';
import { BiddingTray } from './BiddingTray';
import { DdsView } from './DdsView';
import { DummyHandView } from './DummyHandView';
import { LobbyOverlay } from './LobbyOverlay';
import { DdsTableResult } from '../logic/dds';
import { isCardLegal } from '../logic/play';
import { formatContractString } from '../logic/scoring';
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
        }
      }}
      className="relative w-full h-full flex flex-col justify-between p-1.5 sm:p-3 select-none overflow-hidden"
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
            : 'bg-slate-900/80 text-slate-300 border-slate-700'
        }`}>
          N: {seats.N ? seats.N.name : 'Pusto'}
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
        <div className="w-full max-w-xl mx-auto px-2.5 py-1 bg-slate-950/90 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-lg my-0.5">
          {/* N-S tricks */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
            (mySeat === 'N' || mySeat === 'S') ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-300'
          }`}>
            <span className="text-[11px] font-semibold text-slate-400">
              {(mySeat === 'N' || mySeat === 'S') ? 'My (N-S):' : 'Para N-S:'}
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono">{tricksWonNS}</span>
            {(contract.declarer === 'N' || contract.declarer === 'S') && (
              <span className="text-[10px] text-emerald-400">/ cel: {contract.level + 6}</span>
            )}
          </div>

          {/* Contract badge */}
          <div className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 rounded-lg text-amber-300 font-black text-xs flex items-center gap-1">
            <span>Kontrakt:</span>
            <span className="text-white">{formatContractString(contract)}</span>
            <span className="text-amber-400 text-[10px]">({contract.declarer})</span>
          </div>

          {/* E-W tricks */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
            (mySeat === 'E' || mySeat === 'W') ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300' : 'text-slate-300'
          }`}>
            <span className="text-[11px] font-semibold text-slate-400">
              {(mySeat === 'E' || mySeat === 'W') ? 'My (E-W):' : 'Para E-W:'}
            </span>
            <span className="text-base sm:text-lg font-black text-white font-mono">{tricksWonEW}</span>
            {(contract.declarer === 'E' || contract.declarer === 'W') && (
              <span className="text-[10px] text-emerald-400">/ cel: {contract.level + 6}</span>
            )}
          </div>
        </div>
      )}

      {/* MIDDLE SECTION: WEST, FELT TABLE (TRICK / AUCTION), EAST */}
      <div className="flex-1 flex items-center justify-between my-1 sm:my-2 relative">
        {/* WEST SEAT */}
        <div className="w-16 sm:w-24 flex flex-col items-center justify-center">
          <div className={`px-2 py-1 rounded-lg text-center text-xs font-bold border transition ${
            currentTurn === 'W' || currentBidder === 'W'
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
              : 'bg-slate-900/80 text-slate-300 border-slate-700'
          }`}>
            W: {seats.W ? seats.W.name : 'Pusto'}
            {declarerSeat === 'W' && <span className="block text-[10px]">(R)</span>}
            {dummySeat === 'W' && <span className="block text-[10px]">(D)</span>}
          </div>
        </div>

        {/* FELT CENTER */}
        <div className="flex-1 max-w-xl mx-2 bg-felt/90 border-4 border-amber-900/40 rounded-3xl p-2 sm:p-4 shadow-inner relative min-h-[170px] sm:min-h-[230px] flex flex-col items-center justify-center">
          {/* Phase: BIDDING */}
          {phase === 'BIDDING' && (
            <div className="w-full space-y-2">
              <BiddingTray dealer={dealer} bids={bids} />
            </div>
          )}

          {/* Phase: PLAYING or BOARD_RESULT (Trick cards in cross orientation) */}
          {(phase === 'PLAYING' || phase === 'BOARD_RESULT') && (
            <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center">
              {/* Winner banner if trick completed (4 cards) */}
              {currentTrick.cards.length === 4 && currentTrick.winnerSeat && (
                <div className="absolute -top-3 z-30 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg border border-amber-200 animate-bounce">
                  🎉 Lewę bierze: {SEAT_NAMES[currentTrick.winnerSeat]}
                </div>
              )}

              {/* North Card */}
              {getPlayedCardForSeat('N') && (
                <div className="absolute top-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('N')!.card} size="md" isPlayable={false} />
                </div>
              )}
              {/* South Card */}
              {getPlayedCardForSeat('S') && (
                <div className="absolute bottom-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('S')!.card} size="md" isPlayable={false} />
                </div>
              )}
              {/* West Card */}
              {getPlayedCardForSeat('W') && (
                <div className="absolute left-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('W')!.card} size="md" isPlayable={false} />
                </div>
              )}
              {/* East Card */}
              {getPlayedCardForSeat('E') && (
                <div className="absolute right-0 animate-scaleUp z-10">
                  <CardView card={getPlayedCardForSeat('E')!.card} size="md" isPlayable={false} />
                </div>
              )}

              {/* Center trick summary badge */}
              <div className="bg-slate-950/80 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] text-slate-300 font-semibold backdrop-blur text-center pointer-events-none">
                {contract && formatContractString(contract)}
              </div>
            </div>
          )}
        </div>

        {/* EAST SEAT */}
        <div className="w-16 sm:w-24 flex flex-col items-center justify-center">
          <div className={`px-2 py-1 rounded-lg text-center text-xs font-bold border transition ${
            currentTurn === 'E' || currentBidder === 'E'
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
              : 'bg-slate-900/80 text-slate-300 border-slate-700'
          }`}>
            E: {seats.E ? seats.E.name : 'Pusto'}
            {declarerSeat === 'E' && <span className="block text-[10px]">(R)</span>}
            {dummySeat === 'E' && <span className="block text-[10px]">(D)</span>}
          </div>
        </div>
      </div>


      {/* BOTTOM SECTION: SOUTH SEAT / BIDDING CONTROLS OR MY HAND */}
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto space-y-1.5">
        <div className={`px-3 py-0.5 rounded-full text-xs font-bold border transition ${
          currentTurn === 'S' || currentBidder === 'S'
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : 'bg-slate-900/80 text-slate-300 border-slate-700'
        }`}>
          S: {seats.S ? seats.S.name : 'Pusto'}
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

        {/* Player's Cards in Hand */}
        {myHand && myHand.length > 0 && (
          <div className="w-full bg-slate-900/60 backdrop-blur rounded-2xl p-1.5 sm:p-2 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between text-xs text-slate-400 px-2 pb-1">
              <span>Twoja ręka ({mySeat ? SEAT_NAMES[mySeat] : 'Widz'})</span>
              {isMyTurn && phase === 'PLAYING' && (
                <span className="text-amber-400 font-bold animate-pulse">Twoja tura do zagrania karty!</span>
              )}
            </div>

            <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
              {myHand.map((card) => {
                const isPlayable = isMyTurn && phase === 'PLAYING' && isCardLegal(card, myHand, leadCardSuit);
                return (
                  <CardView
                    key={card.id}
                    card={card}
                    size="md"
                    isPlayable={isPlayable}
                    onClick={() => {
                      if (isPlayable) onPlayCard(card.id);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
