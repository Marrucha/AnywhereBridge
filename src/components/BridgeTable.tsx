import React from 'react';
import { Card, Contract, PlayedCard, RoomState, Seat, Trick } from '../types/bridge';
import { CardView } from './CardView';
import { BiddingBox } from './BiddingBox';
import { BiddingTray } from './BiddingTray';
import { DdsView } from './DdsView';
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

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-2 sm:p-4 select-none overflow-hidden">
      {/* LOBBY OVERLAY / PHASE */}
      {phase === 'LOBBY' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-6 max-w-lg w-full text-center shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-amber-400">Poczekalnia przy stole (Lobby)</h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Do rozpoczęcia gry potrzebnych jest 4 graczy. Każdy musi wybrać swoje krzesło.
              </p>
            </div>

            {/* CONNECTED PLAYERS REAL-TIME STATUS BOX */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Dołączyli do gry:</span>
                  <span className="text-emerald-400 font-mono text-sm font-black">
                    {totalPlayersInRoom}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {seatedCount}/4 ma wybrane miejsce
                </span>
              </div>

              {/* Badges of connected players */}
              <div className="flex flex-wrap gap-1.5">
                {connectedPlayers.length > 0 ? (
                  connectedPlayers.map((player) => {
                    const hasSeat = player.seat !== null;
                    const seatLabel = player.seat ? SEAT_NAMES[player.seat]?.split(' ')[0] : null;
                    return (
                      <span
                        key={player.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          hasSeat
                            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-950/60 border-amber-500/60 text-amber-200 animate-pulse'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            hasSeat ? 'bg-emerald-400' : 'bg-amber-400 ring-2 ring-amber-400/30'
                          }`}
                        />
                        <strong className="font-semibold">{player.name}</strong>
                        <span className="text-[10px] opacity-80">
                          {hasSeat ? `(${seatLabel})` : '⏳ wybiera miejsce'}
                        </span>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400 italic">Oczekiwanie na pierwsze połączenie...</span>
                )}
              </div>

              {/* Informational tip if players joined but haven't chosen a seat */}
              {unseatedList.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2 text-[11px] text-amber-200 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    <strong>
                      {unseatedList.length === 1
                        ? '1 gracz wszedł do gry'
                        : `${unseatedList.length} graczy weszło do gry`}
                    </strong>
                    , ale jeszcze nie kliknął wolnego krzesła poniżej! Poproś o wybranie pozycji (Północ, Wschód, Południe, Zachód).
                  </span>
                </div>
              )}
            </div>

            {/* Seat selection grid */}
            <div className="grid grid-cols-2 gap-3 my-4">
              {(['N', 'E', 'S', 'W'] as Seat[]).map(seat => {
                const occupant = seats[seat];
                const isMine = mySeat === seat;
                return (
                  <button
                    key={seat}
                    type="button"
                    disabled={occupant !== null && !isMine}
                    onClick={() => {
                      if (isMine) onLeaveSeat();
                      else onTakeSeat(seat);
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      isMine
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-2 ring-amber-400'
                        : occupant
                        ? 'bg-slate-800/50 border-slate-700 text-slate-400 opacity-70 cursor-not-allowed'
                        : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200 hover:bg-emerald-900/50 hover:scale-102 cursor-pointer'
                    }`}
                  >
                    <span className="text-base sm:text-lg font-black">{SEAT_NAMES[seat]}</span>
                    <span className="text-xs mt-1">
                      {isMine ? 'Twoje miejsce (Kliknij by wstać)' : occupant ? occupant.name : 'Wolne miejsce'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Prominent QR Code invite button in Lobby */}
            <button
              type="button"
              onClick={onOpenQR}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Pokaż kod QR dla współgraczy (Dołącz do pokoju {state.roomId})
            </button>

            {/* Play with bots option */}
            {onStartBotGame && (
              <button
                type="button"
                onClick={onStartBotGame}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 border border-indigo-400/40"
              >
                <Bot className="w-5 h-5 text-indigo-200" />
                <span>🤖 Zagraj testowo z botami (N, E, W)</span>
              </button>
            )}

            {allSeatsOccupied ? (
              <button
                type="button"
                onClick={onStartGame}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                Rozpocznij Rozdanie #1
              </button>
            ) : (
              <div className="text-xs text-amber-300/80 bg-amber-950/30 border border-amber-900/50 p-2.5 rounded-lg flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Oczekiwanie na zajęcie wszystkich 4 miejsc przez graczy...
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT MODAL OVERLAY */}
      {phase === 'BOARD_RESULT' && lastResult && (
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

            <button
              type="button"
              onClick={onNextBoard}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Następne Rozdanie (#{state.boardNumber + 1})
            </button>
          </div>
        </div>
      )}

      {/* TOP: NORTH SEAT & DUMMY PREVIEW IF NORTH IS DUMMY */}
      <div className="flex flex-col items-center">
        <div className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
          currentTurn === 'N' || currentBidder === 'N'
            ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400'
            : 'bg-slate-900/80 text-slate-300 border-slate-700'
        }`}>
          N: {seats.N ? seats.N.name : 'Pusto'}
          {declarerSeat === 'N' && ' (Rozgrywający)'}
          {dummySeat === 'N' && ' (Dziadek)'}
        </div>
      </div>

      {/* MIDDLE SECTION: WEST, FELT TABLE (TRICK / AUCTION), EAST */}
      <div className="flex-1 flex items-center justify-between my-2 relative">
        {/* WEST SEAT */}
        <div className="w-16 sm:w-24 flex flex-col items-center justify-center">
          <div className={`px-2.5 py-1 rounded-lg text-center text-xs font-bold border transition ${
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
        <div className="flex-1 max-w-xl mx-2 bg-felt/90 border-4 border-amber-900/40 rounded-3xl p-3 sm:p-5 shadow-inner relative min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center">
          {/* Phase: BIDDING */}
          {phase === 'BIDDING' && (
            <div className="w-full space-y-2">
              <BiddingTray dealer={dealer} bids={bids} />
            </div>
          )}

          {/* Phase: PLAYING (Trick cards in cross orientation) */}
          {phase === 'PLAYING' && (
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
              {/* North Card */}
              {getPlayedCardForSeat('N') && (
                <div className="absolute top-0 animate-scaleUp">
                  <CardView card={getPlayedCardForSeat('N')!.card} size="sm" isPlayable={false} />
                </div>
              )}
              {/* South Card */}
              {getPlayedCardForSeat('S') && (
                <div className="absolute bottom-0 animate-scaleUp">
                  <CardView card={getPlayedCardForSeat('S')!.card} size="sm" isPlayable={false} />
                </div>
              )}
              {/* West Card */}
              {getPlayedCardForSeat('W') && (
                <div className="absolute left-0 animate-scaleUp">
                  <CardView card={getPlayedCardForSeat('W')!.card} size="sm" isPlayable={false} />
                </div>
              )}
              {/* East Card */}
              {getPlayedCardForSeat('E') && (
                <div className="absolute right-0 animate-scaleUp">
                  <CardView card={getPlayedCardForSeat('E')!.card} size="sm" isPlayable={false} />
                </div>
              )}

              {/* Center trick summary badge */}
              <div className="bg-slate-950/70 border border-slate-700 px-2.5 py-1 rounded-full text-[11px] text-slate-300 font-semibold backdrop-blur text-center pointer-events-none">
                {contract && formatContractString(contract)}
              </div>
            </div>
          )}
        </div>

        {/* EAST SEAT */}
        <div className="w-16 sm:w-24 flex flex-col items-center justify-center">
          <div className={`px-2.5 py-1 rounded-lg text-center text-xs font-bold border transition ${
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

      {/* DUMMY CARDS (If exposed) */}
      {phase === 'PLAYING' && dummySeat && dummyHand && dummyHand.length > 0 && (
        <div className="mb-2 bg-slate-950/80 border border-slate-800 rounded-xl p-2 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1 px-1">
            <span>Karty Dziadka ({SEAT_NAMES[dummySeat]})</span>
            {canIPlayDummy && <span className="text-amber-400 animate-pulse font-bold">Twoja tura: zagraj z Dziadka!</span>}
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            {dummyHand.map((card) => {
              const isPlayable = canIPlayDummy && isCardLegal(card, dummyHand, leadCardSuit);
              return (
                <CardView
                  key={card.id}
                  card={card}
                  size="sm"
                  isPlayable={isPlayable}
                  onClick={() => {
                    if (canIPlayDummy && isPlayable) onPlayCard(card.id);
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

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
