import React from 'react';
import { RoomState, Seat } from '../types/bridge';
import { Users, X, CheckCircle2, Clock, QrCode } from 'lucide-react';

interface PlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: RoomState | null;
  onOpenQR: () => void;
}

const SEAT_LABELS: Record<Seat, string> = {
  N: 'Północ (N)',
  E: 'Wschód (E)',
  S: 'Południe (S)',
  W: 'Zachód (W)',
};

export const PlayersModal: React.FC<PlayersModalProps> = ({
  isOpen,
  onClose,
  state,
  onOpenQR,
}) => {
  if (!isOpen || !state) return null;

  const connectedPlayers = state.connectedPlayers || [];
  const seatedCount = (['N', 'E', 'S', 'W'] as Seat[]).filter(s => state.seats[s] !== null).length;
  const totalCount = state.connectedCount !== undefined
    ? state.connectedCount
    : Math.max(connectedPlayers.length, seatedCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Gracze w pokoju ({state.roomId})
            </h2>
            <p className="text-xs text-slate-400">
              Łącznie dołączyło: <strong className="text-emerald-400">{totalCount}</strong> | Przy stole: <strong className="text-amber-400">{seatedCount}/4</strong>
            </p>
          </div>
        </div>

        {/* List of all connected players */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Wszyscy aktualnie połączeni ({connectedPlayers.length}):
          </h3>

          {connectedPlayers.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 italic text-center">Brak połączonych graczy</p>
          ) : (
            <div className="space-y-1.5">
              {connectedPlayers.map((p) => {
                const isSeated = !!p.seat;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isSeated
                        ? 'bg-slate-950/60 border-emerald-500/30'
                        : 'bg-amber-950/30 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSeated ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                        }`}
                      />
                      <span className="font-bold text-sm text-white">{p.name}</span>
                    </div>

                    <div className="text-right">
                      {isSeated ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-600/30">
                          <CheckCircle2 className="w-3 h-3" />
                          {SEAT_LABELS[p.seat!]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-300 font-semibold bg-amber-950/50 px-2 py-0.5 rounded border border-amber-600/30">
                          <Clock className="w-3 h-3" />
                          W poczekalni (brak miejsca)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Table positions summary */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Miejsca przy stole:
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(['N', 'E', 'S', 'W'] as Seat[]).map((seat) => {
              const occupant = state.seats[seat];
              return (
                <div
                  key={seat}
                  className={`p-2 rounded-lg border text-xs flex flex-col ${
                    occupant
                      ? 'bg-slate-800/60 border-slate-700 text-slate-200'
                      : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-500'
                  }`}
                >
                  <span className="font-bold text-[11px] text-amber-400/90">{SEAT_LABELS[seat]}</span>
                  <span className="truncate mt-0.5 font-medium">
                    {occupant ? occupant.name : 'Wolne miejsce'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* QR Invite button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenQR();
          }}
          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 mb-2"
        >
          <QrCode className="w-4 h-4" />
          Pokaż kod QR do dołączenia
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition"
        >
          Zamknij
        </button>
      </div>
    </div>
  );
};
