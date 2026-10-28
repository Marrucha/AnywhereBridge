import React, { useEffect, useState } from 'react';
import { Seat, UndoRequest } from '../types/bridge';
import { getPartnership } from '../logic/vulnerability';
import { RotateCcw, Check, X, Clock } from 'lucide-react';

interface UndoRequestBannerProps {
  undoRequest?: UndoRequest | null;
  undoNotice?: string | null;
  mySeat: Seat | null;
  onRespondUndo?: (accept: boolean) => void;
}

export const UndoRequestBanner: React.FC<UndoRequestBannerProps> = ({
  undoRequest,
  undoNotice,
  mySeat,
  onRespondUndo,
}) => {
  const [visibleNotice, setVisibleNotice] = useState<string | null>(null);

  useEffect(() => {
    if (undoNotice) {
      setVisibleNotice(undoNotice);
      const t = setTimeout(() => {
        setVisibleNotice(prev => (prev === undoNotice ? null : prev));
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [undoNotice]);

  const isOpponent =
    undoRequest &&
    mySeat &&
    getPartnership(mySeat) !== getPartnership(undoRequest.requesterSeat);

  return (
    <>
      {/* Notice Toast after Undo Accepted or Rejected */}
      {visibleNotice && !undoRequest && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border-2 border-amber-400 text-white px-4 py-1.5 rounded-full shadow-2xl text-xs sm:text-sm font-bold animate-bounce pointer-events-none">
          {visibleNotice}
        </div>
      )}

      {/* Blocking Overlay when Undo Request is Pending */}
      {undoRequest && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-center shadow-2xl space-y-3">
            <div className="inline-flex items-center justify-center p-2.5 bg-amber-500/20 text-amber-400 rounded-full">
              {isOpponent ? <RotateCcw className="w-6 h-6" /> : <Clock className="w-6 h-6 animate-spin" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-amber-400">
                Prośba o cofnięcie
              </h3>
              <p className="text-xs sm:text-sm text-slate-200">
                Gracz <strong className="text-white">{undoRequest.requesterName} ({undoRequest.requesterSeat})</strong> prosi o cofnięcie ostatniego ruchu / karty.
              </p>
              <p className="text-[11px] text-amber-300/90 font-semibold">
                ⛔ Dokładanie kart i licytacja są wstrzymane do podjęcia decyzji.
              </p>
            </div>

            {isOpponent ? (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onRespondUndo && onRespondUndo(true)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Akceptuj</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRespondUndo && onRespondUndo(false)}
                  className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition"
                >
                  <X className="w-4 h-4" />
                  <span>Odrzuć</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 font-semibold">
                Oczekiwanie na decyzję drużyny przeciwnej (wystarczy odpowiedź 1 gracza)...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
