import React, { useState } from 'react';
import { Bid, Seat, TrumpSuit } from '../types/bridge';
import { isValidBid } from '../logic/bidding';

interface BiddingBoxProps {
  bids: Bid[];
  currentBidder: Seat | null;
  mySeat: Seat | null;
  onMakeBid: (bid: { type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE'; level?: number; suit?: TrumpSuit }) => void;
}

const SUITS: { suit: TrumpSuit; label: string; color: string }[] = [
  { suit: 'C', label: '♣', color: 'text-emerald-800' },
  { suit: 'D', label: '♦', color: 'text-amber-600' },
  { suit: 'H', label: '♥', color: 'text-rose-600' },
  { suit: 'S', label: '♠', color: 'text-slate-900' },
  { suit: 'NT', label: 'BA', color: 'text-indigo-900 font-extrabold' },
];

export const BiddingBox: React.FC<BiddingBoxProps> = ({
  bids,
  currentBidder,
  mySeat,
  onMakeBid,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const isMyTurn = mySeat !== null && currentBidder === mySeat;

  const canDouble = isMyTurn && isValidBid({ type: 'DOUBLE' }, mySeat!, bids);
  const canRedouble = isMyTurn && isValidBid({ type: 'REDOUBLE' }, mySeat!, bids);

  const handleLevelClick = (lvl: number) => {
    setSelectedLevel(lvl === selectedLevel ? null : lvl);
  };

  const handleSuitClick = (suit: TrumpSuit) => {
    if (!selectedLevel || !mySeat) return;
    const bid = { type: 'BID' as const, level: selectedLevel, suit };
    if (isValidBid(bid, mySeat, bids)) {
      onMakeBid(bid);
      setSelectedLevel(null);
    }
  };

  if (!isMyTurn) {
    return (
      <div className="bg-slate-900/90 backdrop-blur border border-slate-700/70 rounded-xl px-3 py-1.5 text-center shadow-lg">
        <p className="text-xs text-slate-300">
          Licytuje:{' '}
          <span className="font-bold text-amber-400">
            {currentBidder === 'N' ? 'Północ (N)' : currentBidder === 'S' ? 'Południe (S)' : currentBidder === 'E' ? 'Wschód (E)' : 'Zachód (W)'}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur border-2 border-amber-500/70 rounded-xl p-2 land:p-1.5 desk:p-3 shadow-2xl w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] desk:text-xs font-extrabold uppercase tracking-wider text-amber-400">
          Twoja odzywka ({mySeat})
        </span>
        <span className="text-[10px] text-slate-400">Wysokość i kolor</span>
      </div>

      {/* Levels 1-7 */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
          <button
            key={lvl}
            type="button"
            onClick={() => handleLevelClick(lvl)}
            className={`py-1 land:py-1 desk:py-1.5 text-xs desk:text-sm font-black rounded-lg border transition-all ${
              selectedLevel === lvl
                ? 'bg-amber-500 border-amber-300 text-slate-950 scale-105 shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Suits for selected level */}
      {selectedLevel && (
        <div className="grid grid-cols-5 gap-1 mb-1.5 animate-fadeIn">
          {SUITS.map(({ suit, label, color }) => {
            const isLegal = isValidBid({ type: 'BID', level: selectedLevel, suit }, mySeat!, bids);
            return (
              <button
                key={suit}
                type="button"
                disabled={!isLegal}
                onClick={() => handleSuitClick(suit)}
                className={`py-1.5 px-1 rounded-lg border font-bold text-sm desk:text-base flex items-center justify-center transition-all bg-white shadow ${
                  isLegal
                    ? 'border-slate-300 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'opacity-30 border-slate-400 cursor-not-allowed bg-slate-200'
                }`}
              >
                <span className={color}>{selectedLevel}{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Action buttons: Pass, Double, Redouble */}
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => onMakeBid({ type: 'PASS' })}
          className="py-1.5 desk:py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs tracking-wide transition shadow"
        >
          PAS
        </button>

        <button
          type="button"
          disabled={!canDouble}
          onClick={() => onMakeBid({ type: 'DOUBLE' })}
          className={`py-1.5 desk:py-2 rounded-lg font-bold text-xs tracking-wide transition shadow ${
            canDouble
              ? 'bg-rose-700 hover:bg-rose-600 active:scale-95 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
          }`}
        >
          KONTRA (X)
        </button>

        <button
          type="button"
          disabled={!canRedouble}
          onClick={() => onMakeBid({ type: 'REDOUBLE' })}
          className={`py-1.5 desk:py-2 rounded-lg font-bold text-xs tracking-wide transition shadow ${
            canRedouble
              ? 'bg-blue-700 hover:bg-blue-600 active:scale-95 text-white cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
          }`}
        >
          REKONTRA (XX)
        </button>
      </div>
    </div>
  );
};
