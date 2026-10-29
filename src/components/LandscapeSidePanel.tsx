import React from 'react';
import { Bid, Contract, Seat, Vulnerability } from '../types/bridge';
import { BiddingTray } from './BiddingTray';
import { BiddingBox } from './BiddingBox';
import { formatContractString } from '../logic/scoring';
import { formatVulnerabilityPl } from '../logic/vulnerability';
import { RotateCcw, MessageSquare, Trophy } from 'lucide-react';

interface LandscapeSidePanelProps {
  phase: string;
  boardNumber: number;
  dealer: Seat;
  vulnerability: Vulnerability;
  bids: Bid[];
  currentBidder: Seat | null;
  mySeat: Seat | null;
  bottomSeat: Seat;
  isUndoPending: boolean;
  canUndoMove: boolean;
  contract: Contract | null;
  tricksWonNS: number;
  tricksWonEW: number;
  effectiveTurn: Seat | null;
  onMakeBid: (bid: { type: 'BID' | 'PASS' | 'DOUBLE' | 'REDOUBLE'; level?: number; suit?: any }) => void;
  onRequestUndo?: () => void;
  onOpenChat?: () => void;
  onOpenScores?: () => void;
}

export const LandscapeSidePanel: React.FC<LandscapeSidePanelProps> = ({
  phase,
  boardNumber,
  dealer,
  vulnerability,
  bids,
  currentBidder,
  mySeat,
  bottomSeat,
  isUndoPending,
  canUndoMove,
  contract,
  tricksWonNS,
  tricksWonEW,
  effectiveTurn,
  onMakeBid,
  onRequestUndo,
  onOpenChat,
  onOpenScores,
}) => {
  if (phase !== 'BIDDING' && phase !== 'PLAYING' && phase !== 'BOARD_RESULT') {
    return null;
  }

  const isMySideNS = bottomSeat === 'N' || bottomSeat === 'S';

  const renderColoredContract = (c: Contract) => {
    const suitMap: Record<string, { sym: string; cls: string; style?: React.CSSProperties }> = {
      C: { sym: '♣', cls: 'text-green-500' },
      D: { sym: '♦', cls: 'text-orange-500' },
      H: { sym: '♥', cls: 'text-red-500' },
      S: {
        sym: '♠',
        cls: 'text-slate-950',
        style: {
          color: '#020617',
          textShadow: '-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff',
        },
      },
      NT: { sym: 'BA', cls: 'text-sky-400' },
    };
    const s = suitMap[c.suit] || { sym: c.suit, cls: 'text-white' };
    const dStr = c.doubled === 'REDOUBLED' ? 'xx' : c.doubled === 'DOUBLED' ? 'x' : '';
    return (
      <span className="inline-flex items-center gap-0.5 text-xl font-black">
        <span className="text-white">{c.level}</span>
        <span className={s.cls} style={s.style}>{s.sym}</span>
        {dStr && <span className="text-rose-400">{dStr}</span>}
      </span>
    );
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="hidden landscape:flex landscape:flex-col landscape:w-1/4 landscape:min-w-[175px] landscape:max-w-[260px] shrink-0 h-full justify-between bg-slate-950/90 border-l border-slate-800/90 p-1.5 gap-1.5 overflow-y-auto z-30"
    >
      {/* Top Action Row: Cofnij & Czat (always available in right box) */}
      <div className="grid grid-cols-2 gap-1 shrink-0">
        <button
          type="button"
          disabled={!canUndoMove || !onRequestUndo}
          onClick={(e) => {
            e.stopPropagation();
            if (onRequestUndo) onRequestUndo();
          }}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-black border transition shadow ${
            canUndoMove
              ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 border-amber-300 cursor-pointer'
              : 'bg-slate-900/80 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Cofnij</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenChat) onOpenChat();
          }}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-300 border border-slate-700 transition shadow cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span>Czat</span>
        </button>
      </div>

      {/* BIDDING PHASE: Bidding Tray & Bidding Box */}
      {phase === 'BIDDING' && (
        <div className="flex-1 min-h-0 flex flex-col justify-start gap-1 overflow-y-auto">
          <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-300">
            <span>Rozd. #{boardNumber} ({dealer})</span>
            <span className="text-amber-300">{formatVulnerabilityPl(vulnerability)}</span>
          </div>
          <BiddingTray dealer={dealer} bids={bids} />
          <BiddingBox
            bids={bids}
            currentBidder={currentBidder}
            mySeat={isUndoPending ? null : mySeat}
            onMakeBid={onMakeBid}
          />
        </div>
      )}

      {/* PLAYING / BOARD_RESULT PHASE: Tricks Counter & Contract Box */}
      {(phase === 'PLAYING' || phase === 'BOARD_RESULT') && (
        <div className="flex-1 flex flex-col justify-center gap-2">
          {/* Contract & Vulnerability compact card */}
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2 text-center shadow-lg">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Rozdanie #{boardNumber} • {formatVulnerabilityPl(vulnerability)}
            </div>
            {contract && (
              <div className="mt-0.5 flex items-center justify-center gap-1.5">
                {renderColoredContract(contract)}
                <span className="text-xs font-bold text-amber-400">({contract.declarer})</span>
              </div>
            )}
            {phase === 'PLAYING' && effectiveTurn && (
              <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-extrabold text-amber-300">
                Teraz ruch: {effectiveTurn}
              </div>
            )}
          </div>

          {/* Zliczanie lew (Tricks Won NS & EW) */}
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2 shadow-lg space-y-1.5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-center text-emerald-400">
              Zliczanie lew
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div
                className={`p-2 rounded-xl border text-center ${
                  isMySideNS
                    ? 'bg-emerald-950/80 border-emerald-500/70'
                    : 'bg-slate-800/80 border-slate-700'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-300">NS</div>
                <div className="text-xl font-black font-mono text-white leading-tight">
                  {tricksWonNS}
                  {contract && (contract.declarer === 'N' || contract.declarer === 'S') && (
                    <span className="text-xs text-emerald-400 font-bold">/{contract.level + 6}</span>
                  )}
                </div>
              </div>

              <div
                className={`p-2 rounded-xl border text-center ${
                  !isMySideNS
                    ? 'bg-emerald-950/80 border-emerald-500/70'
                    : 'bg-slate-800/80 border-slate-700'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-300">EW</div>
                <div className="text-xl font-black font-mono text-white leading-tight">
                  {tricksWonEW}
                  {contract && (contract.declarer === 'E' || contract.declarer === 'W') && (
                    <span className="text-xs text-emerald-400 font-bold">/{contract.level + 6}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Optional compact Scores button at the bottom of right panel */}
      {onOpenScores && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenScores();
          }}
          className="w-full py-1 px-2 rounded-xl text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 flex items-center justify-center gap-1 shrink-0"
        >
          <Trophy className="w-3 h-3" />
          <span>Protokół IMP</span>
        </button>
      )}
    </div>
  );
};
