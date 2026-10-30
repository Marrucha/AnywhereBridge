import React, { useState, useEffect } from 'react';
import { ConnectedPlayer, RoomState, Seat } from '../types/bridge';
import { Users, AlertCircle, Play, QrCode, UserCheck } from 'lucide-react';

interface LobbyOverlayProps {
  state: RoomState;
  mySeat: Seat | null;
  playerName: string;
  onChangePlayerName: (name: string) => void;
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
  playerName,
  onChangePlayerName,
  seats,
  connectedPlayers,
  totalPlayersInRoom,
  seatedCount,
  unseatedList,
  seatNames,
  onTakeSeat,
  onLeaveSeat,
  onOpenQR,
  onStartGame,
}) => {
  const isScannedUrl = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('room');
  const isAutoName = playerName.startsWith('Gracz_');
  const [nameInput, setNameInput] = useState<string>(() => (isScannedUrl && isAutoName ? '' : playerName));

  useEffect(() => {
    if (!(isScannedUrl && playerName.startsWith('Gracz_') && nameInput === '')) {
      setNameInput(playerName);
    }
  }, [playerName]);

  const handleSaveName = (val: string) => {
    setNameInput(val);
    const trimmed = val.trim();
    if (trimmed.length > 0) {
      onChangePlayerName(trimmed);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-3.5 sm:p-6 max-w-lg w-full text-center shadow-2xl space-y-3 max-h-[94vh] overflow-y-auto">
        <div className="space-y-0.5">
          <h2 className="text-lg sm:text-2xl font-black text-amber-400">Poczekalnia przy stole (Lobby)</h2>
          <p className="text-[11px] sm:text-sm text-slate-300">
            Wpisz swój nick i wybierz krzesło przy stole (N, E, S lub W).
          </p>
        </div>

        {/* NICKNAME SELECTION BOX */}
        <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-2.5 sm:p-3 text-left space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Twój nick przy stole:</span>
            </label>
            {playerName !== 'Hey Ho Maro' && (
              <button
                type="button"
                onClick={() => handleSaveName('Hey Ho Maro')}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
              >
                Ustaw: Hey Ho Maro
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              autoFocus={isScannedUrl && isAutoName}
              maxLength={24}
              onChange={(e) => handleSaveName(e.target.value)}
              placeholder="Wpisz swój nick (np. Marek, Ania...)"
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-lg px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition"
            />
          </div>
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

        {/* Seat selection grid (click empty seat to take it, or click occupied seat to swap places!) */}
        <div className="grid grid-cols-2 gap-3 my-4">
          {(['N', 'E', 'S', 'W'] as Seat[]).map(seat => {
            const occupant = seats[seat];
            const isMine = mySeat === seat;
            return (
              <button
                key={seat}
                type="button"
                onClick={() => {
                  if (isMine) onLeaveSeat();
                  else onTakeSeat(seat);
                }}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isMine
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-2 ring-amber-400'
                    : occupant
                    ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-600 text-slate-200'
                    : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200 hover:bg-emerald-900/50 hover:scale-102'
                }`}
              >
                <span className="text-base sm:text-lg font-black">{seatNames[seat]}</span>
                <span className="text-xs mt-1">
                  {isMine
                    ? 'Twoje miejsce (Kliknij by wstać)'
                    : occupant
                    ? `${occupant.name} (Kliknij by zamienić)`
                    : 'Wolne miejsce'}
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

        {/* Start Game Button: Automatically seats all connected human players in the room first! */}
        {(() => {
          const effectivePlayersCount = Math.min(4, Math.max(seatedCount, totalPlayersInRoom));
          return effectivePlayersCount >= 1 ? (
            <button
              type="button"
              onClick={onStartGame}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm sm:text-base rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current shrink-0" />
              <span>
                {effectivePlayersCount === 4
                  ? `Rozpocznij Rozdanie #${state.boardNumber || 1} (4 graczy)`
                  : `Rozpocznij grę (${effectivePlayersCount} ${effectivePlayersCount === 1 ? 'gracz' : 'graczy'} + ${4 - effectivePlayersCount} ${4 - effectivePlayersCount === 1 ? 'Bot' : 'Boty'} 🤖)`}
              </span>
            </button>
          ) : (
            <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-500/50 p-3 rounded-xl flex items-center justify-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>👆 Wybierz swoje miejsce powyżej (N, E, S lub W), aby rozpocząć grę!</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
