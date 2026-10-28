import React from 'react';
import { ScoreRecord } from '../types/bridge';
import { Trophy, RotateCcw, Award, CheckCircle2 } from 'lucide-react';
import { formatVulnerabilityPl } from '../logic/vulnerability';

interface EightBoardSummaryProps {
  scores: ScoreRecord[];
  onStartNewEight: () => void;
  onClose?: () => void;
}

export const EightBoardSummary: React.FC<EightBoardSummaryProps> = ({
  scores,
  onStartNewEight,
  onClose,
}) => {
  // Grab the last 8 boards (current octet)
  const eightScores = scores.slice(0, 8);
  const totalImpNS = eightScores.reduce((acc, s) => acc + (s.impNS !== undefined ? s.impNS : 0), 0);
  const totalImpEW = eightScores.reduce((acc, s) => acc + (s.impEW !== undefined ? s.impEW : 0), 0);

  const winnerSide = totalImpNS > totalImpEW ? 'NS' : totalImpEW > totalImpNS ? 'EW' : 'REMIS';
  const diffImp = Math.abs(totalImpNS);

  return (
    <div className="bg-slate-900/98 border-2 border-amber-400 rounded-2xl p-3 sm:p-5 shadow-2xl max-w-2xl w-full mx-auto animate-scaleUp">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-black text-white tracking-wide">
              🏁 Podsumowanie Ósemki Rozdań (#1 – #8)
            </h3>
            <p className="text-[11px] sm:text-xs text-amber-300 font-semibold">
              Oficjalny zapis impowy (Milton HCP & WBF IMP Scale)
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 text-xs rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* PODKREŚLONY WYNIK KOŃCOWY ÓSEMKI */}
      <div className="my-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-400/90 shadow-xl text-center relative overflow-hidden">
        <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-1">
          Podkreślony wynik końcowy meczu
        </div>

        <div className="flex items-center justify-center gap-6 sm:gap-10 my-1">
          {/* NS Score */}
          <div className="flex flex-col items-center">
            <span className="text-xs sm:text-sm font-bold text-slate-300">Para N-S (My)</span>
            <span className={`text-2xl sm:text-4xl font-black font-mono tracking-tight ${
              totalImpNS >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {totalImpNS >= 0 ? `+${totalImpNS}` : totalImpNS} <span className="text-sm sm:text-lg">IMP</span>
            </span>
          </div>

          <div className="text-xl sm:text-2xl font-black text-slate-500">:</div>

          {/* EW Score */}
          <div className="flex flex-col items-center">
            <span className="text-xs sm:text-sm font-bold text-slate-300">Para E-W (Przeciwnicy)</span>
            <span className={`text-2xl sm:text-4xl font-black font-mono tracking-tight ${
              totalImpEW >= 0 ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {totalImpEW >= 0 ? `+${totalImpEW}` : totalImpEW} <span className="text-sm sm:text-lg">IMP</span>
            </span>
          </div>
        </div>

        {/* Highlight Banner with underline */}
        <div className="mt-2 pt-2 border-t-2 border-dashed border-amber-400/40 flex items-center justify-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-xs sm:text-sm font-black text-amber-300 underline decoration-amber-400 decoration-2 underline-offset-4">
            {winnerSide === 'NS' ? `🏆 Zwycięstwo pary N-S przewagą +${diffImp} IMP!` :
             winnerSide === 'EW' ? `🏆 Zwycięstwo pary E-W przewagą +${diffImp} IMP!` :
             '🤝 Remis w meczu 8 rozdań!'}
          </span>
        </div>
      </div>

      {/* Tabela rozdań 1-8 */}
      <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 my-2">
        {eightScores.map((rec) => {
          const imp = rec.impNS !== undefined ? rec.impNS : 0;
          return (
            <div
              key={rec.id}
              className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-400 min-w-[28px]">#{rec.boardNumber}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 font-semibold text-slate-300">
                  {formatVulnerabilityPl(rec.vulnerability)}
                </span>
                <span className="font-bold text-white">{rec.contractStr} ({rec.declarer})</span>
                <span className="text-slate-400 font-mono text-[11px]">{rec.scoreNS >= 0 ? `+${rec.scoreNS}` : rec.scoreNS} pkt</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] justify-between sm:justify-end">
                <span className="text-slate-400">
                  PC: <strong className="text-slate-200">{rec.hcpNS ?? '—'}:{rec.hcpEW ?? '—'}</strong>
                </span>
                {rec.expectedContractDesc && (
                  <span className="text-slate-400 hidden md:inline text-[10px] truncate max-w-[150px]" title={rec.expectedContractDesc}>
                    Oczek: {rec.expectedContractDesc.split('(')[0]}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded font-black font-mono text-xs ${
                  imp > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' :
                  imp < 0 ? 'bg-rose-950 text-rose-300 border border-rose-500/50' :
                  'bg-slate-900 text-slate-300 border border-slate-700'
                }`}>
                  {imp > 0 ? `+${imp} IMP` : imp < 0 ? `${imp} IMP` : '0 IMP'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* PRZYCISK: ZACZNIJ NOWĄ 8 */}
      <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onStartNewEight}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 border border-emerald-400/60 active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Zacznij nową 8 (Rozdanie #1)</span>
        </button>
      </div>
    </div>
  );
};
