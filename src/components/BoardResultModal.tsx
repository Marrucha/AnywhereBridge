import React from 'react';
import { Contract, ScoreRecord } from '../types/bridge';
import { DdsTableResult } from '../logic/dds';
import { DdsView } from './DdsView';
import { RotateCcw } from 'lucide-react';

interface BoardResultModalProps {
  lastResult: ScoreRecord;
  contract: Contract | null;
  boardNumber: number;
  ddsResult: DdsTableResult | null;
  ddsLoading: boolean;
  onClose: () => void;
  onNextBoard: () => void;
  onStartNewEight?: () => void;
  onOpenScores?: () => void;
}

export const BoardResultModal: React.FC<BoardResultModalProps> = ({
  lastResult,
  contract,
  boardNumber,
  ddsResult,
  ddsLoading,
  onClose,
  onNextBoard,
  onStartNewEight,
  onOpenScores,
}) => {
  const isEightFinished = boardNumber % 8 === 0;

  const renderColoredContract = () => {
    if (!contract || lastResult.contractStr === 'PAS') {
      return <span className="text-slate-300">4x PAS</span>;
    }
    const suitSymbols: Record<string, { sym: string; cls: string; style?: React.CSSProperties }> = {
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
    const s = suitSymbols[contract.suit] || { sym: contract.suit, cls: 'text-white' };
    const dStr = contract.doubled === 'REDOUBLED' ? 'xx' : contract.doubled === 'DOUBLED' ? 'x' : '';

    return (
      <span className="inline-flex items-center justify-center gap-0.5">
        <span className="text-white">{contract.level}</span>
        <span className={s.cls} style={s.style}>{s.sym}</span>
        {dStr && <span className="text-rose-400">{dStr}</span>}
      </span>
    );
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 max-w-lg w-full text-center shadow-2xl space-y-3 my-auto max-h-[95vh] overflow-y-auto">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-400 block">
          Rozdanie #{boardNumber} zakończone
        </span>
        <h3 className="text-4xl sm:text-5xl font-black text-white leading-tight">
          {renderColoredContract()}
        </h3>

        {/* Trick count */}
        <div className="grid grid-cols-2 gap-2.5 py-2 border-y border-slate-800 text-base">
          <div>
            <span className="text-slate-400 block text-xs sm:text-sm font-semibold">Lewy N-S</span>
            <span className="text-2xl font-black text-white">{lastResult.tricksWonNS}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs sm:text-sm font-semibold">Lewy E-W</span>
            <span className="text-2xl font-black text-white">{lastResult.tricksWonEW}</span>
          </div>
        </div>

        {/* Duplicate score */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-2.5 rounded-xl text-base">
          <div>
            <span className="text-slate-400 text-xs sm:text-sm font-semibold block">Zapis N-S</span>
            <span className={`text-xl sm:text-2xl font-black font-mono ${lastResult.scoreNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {lastResult.scoreNS >= 0 ? `+${lastResult.scoreNS}` : lastResult.scoreNS}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-xs sm:text-sm font-semibold block">Zapis E-W</span>
            <span className={`text-xl sm:text-2xl font-black font-mono ${lastResult.scoreEW >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {lastResult.scoreEW >= 0 ? `+${lastResult.scoreEW}` : lastResult.scoreEW}
            </span>
          </div>
        </div>

        {/* Single-line Hand Strength (PC) & IMP without verbose description */}
        {lastResult.hcpNS !== undefined && (
          <div className="p-2.5 px-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm sm:text-base text-slate-200 flex items-center justify-between font-bold">
            <span>
              Siła rąk: <strong className="text-amber-300 font-black">NS {lastResult.hcpNS} PC</strong> : <strong className="text-white font-black">EW {lastResult.hcpEW} PC</strong>
            </span>
            <span className={`font-mono font-black text-base sm:text-lg ${
              (lastResult.impNS ?? 0) > 0 ? 'text-emerald-400' : (lastResult.impNS ?? 0) < 0 ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {(lastResult.impNS ?? 0) > 0 ? `+${lastResult.impNS}` : lastResult.impNS} IMP
            </span>
          </div>
        )}

        {/* Double Dummy Solver (DDS) & Minimax Matrix */}
        <DdsView
          ddsResult={ddsResult}
          loading={ddsLoading}
          contract={contract}
          wonNS={lastResult.tricksWonNS}
          wonEW={lastResult.tricksWonEW}
        />

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] sm:text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-1"
          >
            👁️ Podejrzyj stół
          </button>

          {onOpenScores ? (
            <button
              type="button"
              onClick={onOpenScores}
              className="py-2.5 px-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] sm:text-xs rounded-xl transition border border-amber-500/50 shadow flex items-center justify-center gap-1"
            >
              📊 Wyniki
            </button>
          ) : (
            <div />
          )}

          {isEightFinished && onStartNewEight ? (
            <button
              type="button"
              onClick={onStartNewEight}
              className="py-2.5 px-1 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-black text-[11px] sm:text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              Nowa 8 (#1)
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextBoard}
              className="py-2.5 px-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] sm:text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              Następne (#{boardNumber + 1})
            </button>
          )}
        </div>

        {/* Backup: start new 8 option even if 8 not finished */}
        {!isEightFinished && onStartNewEight && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Czy na pewno chcesz przerwać bieżącą ósemkę i zacząć nową od rozdania #1?')) {
                  onStartNewEight();
                }
              }}
              className="text-[10px] text-slate-400 hover:text-amber-300 underline transition"
            >
              Zacznij nową 8 od #1 (backup)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
