import React from 'react';
import { Bid, Seat } from '../types/bridge';
import { SEAT_ORDER } from '../logic/vulnerability';

interface BiddingTrayProps {
  dealer: Seat;
  bids: Bid[];
}

const SUIT_ICONS: Record<string, { symbol: string; color: string }> = {
  C: { symbol: '♣', color: 'text-emerald-500' },
  D: { symbol: '♦', color: 'text-amber-500' },
  H: { symbol: '♥', color: 'text-rose-500' },
  S: { symbol: '♠', color: 'text-slate-100' },
  NT: { symbol: 'BA', color: 'text-sky-400 font-extrabold' },
};

export const BiddingTray: React.FC<BiddingTrayProps> = ({ dealer, bids }) => {
  // We lay out 4 columns: W, N, E, S (or N, E, S, W)
  const columns: Seat[] = ['N', 'E', 'S', 'W'];
  const dealerIndex = columns.indexOf(dealer);

  // Pad empty slots before dealer
  const paddedBids: (Bid | null)[] = [];
  for (let i = 0; i < dealerIndex; i++) {
    paddedBids.push(null);
  }
  for (const b of bids) {
    paddedBids.push(b);
  }

  // Split into rows of 4
  const rows: (Bid | null)[][] = [];
  for (let i = 0; i < paddedBids.length; i += 4) {
    rows.push(paddedBids.slice(i, i + 4));
  }

  const renderBidCell = (bid: Bid | null, key: number) => {
    if (!bid) {
      return (
        <div key={key} className="py-1 px-1.5 text-center text-slate-600 font-mono text-xs">
          -
        </div>
      );
    }

    if (bid.type === 'PASS') {
      return (
        <div key={key} className="py-1 px-1.5 text-center text-emerald-400 font-bold text-xs bg-emerald-950/30 rounded">
          PAS
        </div>
      );
    }

    if (bid.type === 'DOUBLE') {
      return (
        <div key={key} className="py-1 px-1.5 text-center text-rose-400 font-extrabold text-xs bg-rose-950/40 rounded">
          X
        </div>
      );
    }

    if (bid.type === 'REDOUBLE') {
      return (
        <div key={key} className="py-1 px-1.5 text-center text-blue-400 font-extrabold text-xs bg-blue-950/40 rounded">
          XX
        </div>
      );
    }

    const suitInfo = bid.suit ? SUIT_ICONS[bid.suit] : null;

    return (
      <div key={key} className="py-1 px-1.5 text-center font-bold text-xs sm:text-sm bg-slate-800/80 rounded border border-slate-700/50 flex items-center justify-center gap-0.5">
        <span>{bid.level}</span>
        {suitInfo && <span className={suitInfo.color}>{suitInfo.symbol}</span>}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-2.5 shadow-xl max-w-md mx-auto">
      <div className="grid grid-cols-4 gap-1 border-b border-slate-700/80 pb-1.5 mb-1 text-center font-bold text-xs text-amber-400 tracking-wider">
        <div>N (Północ)</div>
        <div>E (Wschód)</div>
        <div>S (Południe)</div>
        <div>W (Zachód)</div>
      </div>

      <div className="max-h-36 overflow-y-auto space-y-1">
        {rows.length === 0 ? (
          <div className="text-center py-2 text-xs text-slate-500">Początek licytacji...</div>
        ) : (
          rows.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-4 gap-1 items-center">
              {[0, 1, 2, 3].map(cIdx => renderBidCell(row[cIdx] || null, cIdx))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
