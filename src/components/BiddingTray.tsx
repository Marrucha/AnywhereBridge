import React, { useEffect, useRef } from 'react';
import { Bid, Seat } from '../types/bridge';

interface BiddingTrayProps {
  dealer: Seat;
  bids: Bid[];
}

const BLACK_SPADE_STYLE: React.CSSProperties = {
  color: '#020617',
  textShadow: '-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff',
};

const SUIT_ICONS: Record<string, { symbol: string; color: string; style?: React.CSSProperties }> = {
  C: { symbol: '♣', color: 'text-green-500 font-black' },
  D: { symbol: '♦', color: 'text-orange-500 font-black' },
  H: { symbol: '♥', color: 'text-red-500 font-black' },
  S: { symbol: '♠', color: 'text-slate-950 font-black', style: BLACK_SPADE_STYLE },
  NT: { symbol: 'BA', color: 'text-sky-400 font-extrabold' },
};

type TrayCell = Bid | null | 'ACTIVE';

export const BiddingTray: React.FC<BiddingTrayProps> = ({ dealer, bids }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 4 columns: N, E, S, W
  const columns: Seat[] = ['N', 'E', 'S', 'W'];
  const dealerIndex = columns.indexOf(dealer);

  // Pad empty slots before dealer
  const paddedBids: TrayCell[] = [];
  for (let i = 0; i < dealerIndex; i++) {
    paddedBids.push(null);
  }
  for (const b of bids) {
    paddedBids.push(b);
  }
  // Always append the active slot for the current bidder so the next row (e.g. 2nd row after 4th column bids) appears immediately!
  paddedBids.push('ACTIVE');

  // Split into rows of 4
  const rows: TrayCell[][] = [];
  for (let i = 0; i < paddedBids.length; i += 4) {
    rows.push(paddedBids.slice(i, i + 4));
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bids.length, dealer]);

  const renderBidCell = (cell: TrayCell | undefined, key: number) => {
    if (cell === undefined) {
      return <div key={key} className="py-1 px-1 text-center text-xs" />;
    }

    if (cell === null) {
      return (
        <div key={key} className="py-1 px-1.5 text-center text-slate-600 font-mono text-xs">
          -
        </div>
      );
    }

    if (cell === 'ACTIVE') {
      return (
        <div
          key={key}
          className="py-1 px-1.5 text-center text-amber-300 font-black text-xs bg-amber-500/20 border border-amber-400/60 rounded animate-pulse"
        >
          ?
        </div>
      );
    }

    const bid = cell;

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
      <div key={key} className="py-1 px-1.5 text-center font-black text-sm sm:text-base bg-slate-800/80 rounded border border-slate-700/50 flex items-center justify-center gap-0.5">
        <span className="text-white">{bid.level}</span>
        {suitInfo && (
          <span className={suitInfo.color} style={suitInfo.style}>
            {suitInfo.symbol}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-xl p-1.5 sm:p-2 shadow-xl w-full max-w-md mx-auto shrink-0">
      <div className="grid grid-cols-4 gap-1 border-b border-slate-700/80 pb-1 mb-1 text-center font-bold text-[10px] sm:text-xs text-amber-400 tracking-wider">
        <div>N</div>
        <div>E</div>
        <div>S</div>
        <div>W</div>
      </div>

      <div ref={scrollRef} className="max-h-36 land:max-h-28 desk:max-h-44 overflow-y-auto space-y-0.5">
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-4 gap-1 items-center">
            {[0, 1, 2, 3].map(cIdx => renderBidCell(row[cIdx], cIdx))}
          </div>
        ))}
      </div>
    </div>
  );
};
