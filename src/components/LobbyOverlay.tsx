import React from 'react';
import { ConnectedPlayer, RoomState, Seat } from '../types/bridge';
import { Users, AlertCircle, Play, QrCode, Bot } from 'lucide-react';

interface LobbyOverlayProps {
  state: RoomState;
  mySeat: Seat | null;
  seats: RoomState['seats'];
  connectedPlayers: ConnectedPlayer[];
  totalPlayersInRoom: number;
  seatedCount: number;
  allSeatsOccupied: boolean;
  unseatedList: ConnectedPlayer[];
  seatNames: Record<Seat, string>;
  onTakeSeat: (seat: Seat) => void;
  onLeaveSeat: () => void;
  onOpenQR: () => void;
  onStartBotGame?: () => void;
  onStartGame: () => void;
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  state,
  mySeat,
  seats,
  connectedPlayers,
  totalPlayersInRoom,
  seatedCount,
  allSeatsOccupied,
  unseatedList,
  seatNames,
  onTakeSeat,
  onLeaveSeat,
  onOpenQR,
  onStartBotGame,
  onStartGame,
}) => {
  return (
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
                const seatLabel = player.seat ? seatNames[player.seat]?.split(' ')[0] : null;
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
                <span className="text-base sm:text-lg font-black">{seatNames[seat]}</span>
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
  );
};
