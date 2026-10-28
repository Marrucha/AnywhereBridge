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
}) => {
  const isEightFinished = boardNumber % 8 === 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 sm:p-5 max-w-lg w-full text-center shadow-2xl space-y-3.5 my-auto max-h-[95vh] overflow-y-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
          Rozdanie #{boardNumber} zakończone
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-white">{lastResult.resultDetail}</h3>

        {/* Tricky trick count */}
        <div className="grid grid-cols-2 gap-2.5 py-2 border-y border-slate-800 text-sm">
          <div>
            <span className="text-slate-400 block text-xs">Lewy N-S</span>
            <span className="text-xl font-black text-white">{lastResult.tricksWonNS}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-xs">Lewy E-W</span>
            <span className="text-xl font-black text-white">{lastResult.tricksWonEW}</span>
          </div>
        </div>

        {/* Duplicate score & HCP Info */}
        <div className="grid grid-cols-2 gap-2.5 bg-slate-950/60 p-2.5 rounded-xl text-sm">
          <div>
            <span className="text-slate-400 text-xs block">Zapis N-S</span>
            <span className={`text-base sm:text-lg font-bold font-mono ${lastResult.scoreNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {lastResult.scoreNS >= 0 ? `+${lastResult.scoreNS}` : lastResult.scoreNS}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Zapis E-W</span>
            <span className={`text-base sm:text-lg font-bold font-mono ${lastResult.scoreEW >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {lastResult.scoreEW >= 0 ? `+${lastResult.scoreEW}` : lastResult.scoreEW}
            </span>
          </div>
        </div>

        {/* PC and Expected contract details if available */}
        {lastResult.hcpNS !== undefined && (
          <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1 text-slate-300">
            <div className="flex items-center justify-between font-semibold">
              <span>Siła rąk: <strong className="text-amber-300">NS {lastResult.hcpNS} PC</strong> : <strong className="text-slate-200">EW {lastResult.hcpEW} PC</strong></span>
              <span className={`font-mono font-black ${
                (lastResult.impNS ?? 0) > 0 ? 'text-emerald-400' : (lastResult.impNS ?? 0) < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}>
                {(lastResult.impNS ?? 0) > 0 ? `+${lastResult.impNS}` : lastResult.impNS} IMP
              </span>
            </div>
            {lastResult.expectedContractDesc && (
              <div className="text-[11px] text-slate-400 text-left">
                Powinno się grać: <span className="text-slate-200 font-medium">{lastResult.expectedContractDesc}</span>
              </div>
            )}
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

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition border border-slate-700"
          >
            👁️ Podejrzyj stół
          </button>
          {isEightFinished && onStartNewEight ? (
            <button
              type="button"
              onClick={onStartNewEight}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Zacznij nową 8 (#1)
            </button>
          ) : (
            <button
              type="button"
              onClick={onNextBoard}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Następne (#{boardNumber + 1})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
