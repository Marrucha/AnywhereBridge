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
  { suit: 'C', label: '♣', color: 'text-green-600' },
  { suit: 'D', label: '♦', color: 'text-orange-500' },
  { suit: 'H', label: '♥', color: 'text-red-600' },
  { suit: 'S', label: '♠', color: 'text-slate-950' },
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
      <div className="bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl px-3.5 py-2 text-center shadow-lg">
        <p className="text-sm sm:text-base text-slate-200 font-semibold">
          Licytuje:{' '}
          <span className="font-black text-amber-400">
            {currentBidder === 'N' ? 'Północ (N)' : currentBidder === 'S' ? 'Południe (S)' : currentBidder === 'E' ? 'Wschód (E)' : 'Zachód (W)'}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur border-2 border-amber-500/80 rounded-xl p-2 land:p-1.5 desk:p-3 shadow-2xl w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
          Twoja odzywka ({mySeat})
        </span>
        <span className="text-xs font-semibold text-slate-300">Wysokość i kolor</span>
      </div>

      {/* Levels 1-7 */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
          <button
            key={lvl}
            type="button"
            onClick={() => handleLevelClick(lvl)}
            className={`py-2 land:py-1.5 desk:py-2.5 text-base sm:text-lg font-black rounded-lg border transition-all ${
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
                className={`py-2 px-1 rounded-lg border font-black text-lg sm:text-xl flex items-center justify-center transition-all bg-white shadow ${
                  isLegal
                    ? 'border-slate-300 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'opacity-30 border-slate-400 cursor-not-allowed bg-slate-200'
                }`}
              >
                <span className="text-slate-950">{selectedLevel}</span>
                <span className={color}>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Action buttons: Pass, Double, Redouble */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onMakeBid({ type: 'PASS' })}
          className="py-2 land:py-1.5 desk:py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black text-sm sm:text-base tracking-wide transition shadow"
        >
          PAS
        </button>

        <button
          type="button"
          disabled={!canDouble}
          onClick={() => onMakeBid({ type: 'DOUBLE' })}
          className={`py-2 land:py-1.5 desk:py-2.5 rounded-lg font-black text-sm sm:text-base tracking-wide transition shadow ${
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
          className={`py-2 land:py-1.5 desk:py-2.5 rounded-lg font-black text-sm sm:text-base tracking-wide transition shadow ${
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
