import React from 'react';
import { ScoreRecord } from '../types/bridge';
import { Trophy, Trash2, X, RotateCcw, Award, Play } from 'lucide-react';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRecord[];
  onClearHistory: () => void;
  onStartNewEight?: () => void;
  onNextBoard?: () => void;
}

export const ScoreModal: React.FC<ScoreModalProps> = ({
  isOpen,
  onClose,
  scores,
  onClearHistory,
  onStartNewEight,
  onNextBoard,
}) => {
  if (!isOpen) return null;

  const totalNS = scores.reduce((acc, curr) => acc + curr.scoreNS, 0);
  const totalEW = scores.reduce((acc, curr) => acc + curr.scoreEW, 0);

  const totalImpNS = scores.reduce((acc, curr) => acc + (curr.impNS ?? 0), 0);
  const totalImpEW = scores.reduce((acc, curr) => acc + (curr.impEW ?? 0), 0);

  const avgHcpNS = scores.length > 0
    ? (scores.reduce((acc, c) => acc + (c.hcpNS ?? 0), 0) / scores.length).toFixed(1)
    : null;
  const avgHcpEW = scores.length > 0
    ? (scores.reduce((acc, c) => acc + (c.hcpEW ?? 0), 0) / scores.length).toFixed(1)
    : null;

  const getVulLabel = (vul: string) => {
    switch (vul) {
      case 'NONE': return 'Obie przed';
      case 'BOTH': return 'Obie po';
      case 'NS': return 'NS po (WE przed)';
      case 'EW': return 'EW po (NS przed)';
      default: return vul;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Protokół Wyników (Zapis IMP & Sportowy)</h2>
              <p className="text-[11px] sm:text-xs text-slate-400">Tabela Miltona (PC) + Oficjalna skala IMP Światowej Federacji Brydża (WBF)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Totals Banner (Podkreślony bilans IMP) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-800/40 border-b border-slate-800 text-center">
          <div className={`p-2.5 sm:p-3 rounded-xl border ${totalImpNS >= 0 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 block uppercase tracking-wider">Para N - S (My)</span>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-xl sm:text-3xl font-black font-mono ${totalImpNS >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalImpNS >= 0 ? `+${totalImpNS}` : totalImpNS} <span className="text-xs sm:text-sm">IMP</span>
              </span>
              <span className="text-slate-400 text-xs">({totalNS >= 0 ? `+${totalNS}` : totalNS} pkt)</span>
            </div>
          </div>

          <div className={`p-2.5 sm:p-3 rounded-xl border ${totalImpEW > 0 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 block uppercase tracking-wider">Para E - W (Przeciwnicy)</span>
            <div className="flex items-center justify-center gap-2">
              <span className={`text-xl sm:text-3xl font-black font-mono ${totalImpEW >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {totalImpEW >= 0 ? `+${totalImpEW}` : totalImpEW} <span className="text-xs sm:text-sm">IMP</span>
              </span>
              <span className="text-slate-400 text-xs">({totalEW >= 0 ? `+${totalEW}` : totalEW} pkt)</span>
            </div>
          </div>
        </div>

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
          {scores.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">Brak zakończonych rozdań w historii.</p>
              <p className="text-xs text-slate-600 mt-1">Po zakończeniu każdego rozdania wynik pojawi się tutaj automatycznie.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">
                    <th className="pb-2 pl-2">Rozd.</th>
                    <th className="pb-2">Założenia</th>
                    <th className="pb-2">Kontrakt</th>
                    <th className="pb-2">PC (NS : EW)</th>
                    <th className="pb-2">Oczekiwany zapis</th>
                    <th className="pb-2 text-right">Zapis N-S</th>
                    <th className="pb-2 text-right pr-2">IMP (N-S)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {scores.map((rec) => {
                    const imp = rec.impNS ?? 0;
                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 pl-2 font-bold text-amber-400 font-mono">#{rec.boardNumber}</td>
                        <td className="py-2 text-slate-300 text-[11px]">{getVulLabel(rec.vulnerability)}</td>
                        <td className="py-2 font-bold text-slate-100">
                          {rec.contractStr} <span className="text-[11px] text-slate-400 font-normal">({rec.declarer})</span>
                        </td>
                        <td className="py-2 text-slate-300 font-mono">
                          {rec.hcpNS !== undefined ? `${rec.hcpNS} : ${rec.hcpEW}` : '—'}
                        </td>
                        <td className="py-2 text-slate-400 text-[11px] truncate max-w-[170px]" title={rec.expectedContractDesc || ''}>
                          {rec.expectedContractDesc || '—'}
                        </td>
                        <td className={`py-2 text-right font-bold font-mono ${rec.scoreNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {rec.scoreNS >= 0 ? `+${rec.scoreNS}` : rec.scoreNS}
                        </td>
                        <td className={`py-2 text-right pr-2 font-mono font-black ${
                          imp > 0 ? 'text-emerald-400' : imp < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {imp > 0 ? `+${imp}` : imp}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-amber-400/80 bg-slate-950 font-bold">
                  <tr>
                    <td className="py-2.5 pl-2 text-amber-400 font-black">RAZEM</td>
                    <td className="py-2.5 text-slate-400 text-[11px]">{scores.length} rozdań</td>
                    <td className="py-2.5 text-slate-300 text-xs">Bilans</td>
                    <td className="py-2.5 text-slate-300 font-mono text-xs">
                      {avgHcpNS && avgHcpEW ? `${avgHcpNS} : ${avgHcpEW}` : '—'}
                    </td>
                    <td className="py-2.5 text-slate-400 text-[11px]">Suma punktów</td>
                    <td className={`py-2.5 text-right font-black font-mono ${totalNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {totalNS >= 0 ? `+${totalNS}` : totalNS}
                    </td>
                    <td className={`py-2.5 text-right pr-2 font-mono font-black text-sm ${
                      totalImpNS > 0 ? 'text-emerald-400' : totalImpNS < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {totalImpNS > 0 ? `+${totalImpNS}` : totalImpNS}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Podsumowanie końcowe na dole tabeli wyników */}
              <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-400/90 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-white">
                        Podsumowanie Końcowe ({scores.length} {scores.length === 1 ? 'rozdanie' : scores.length < 5 ? 'rozdania' : 'rozdań'})
                      </h4>
                      <p className="text-[11px] text-slate-400">Oficjalny protokół zapisu brydżowego (Milton PC & WBF IMP)</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                    totalImpNS > 0 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60' 
                      : totalImpNS < 0 
                      ? 'bg-rose-950 text-rose-300 border-rose-500/60' 
                      : 'bg-slate-800 text-slate-300 border-slate-600'
                  }`}>
                    {totalImpNS > 0 ? `🏆 Prowadzenie N-S: +${totalImpNS} IMP` : totalImpNS < 0 ? `🏆 Prowadzenie E-W: +${Math.abs(totalImpNS)} IMP` : '🤝 REMIS'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bilans IMP (N-S)</span>
                    <span className={`text-base sm:text-lg font-black font-mono ${totalImpNS >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalImpNS >= 0 ? `+${totalImpNS}` : totalImpNS} <span className="text-xs">IMP</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bilans IMP (E-W)</span>
                    <span className={`text-base sm:text-lg font-black font-mono ${totalImpEW >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {totalImpEW >= 0 ? `+${totalImpEW}` : totalImpEW} <span className="text-xs">IMP</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Zapis łączny (N-S)</span>
                    <span className={`text-base sm:text-lg font-black font-mono ${totalNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {totalNS >= 0 ? `+${totalNS}` : totalNS} <span className="text-xs">pkt</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Zapis łączny (E-W)</span>
                    <span className={`text-base sm:text-lg font-black font-mono ${totalEW >= 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {totalEW >= 0 ? `+${totalEW}` : totalEW} <span className="text-xs">pkt</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {scores.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Czy na pewno chcesz wyczyścić historię zapisów?')) {
                    onClearHistory();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Wyczyść historię</span>
              </button>
            )}

            {/* Button to continue next board if 8 is in progress */}
            {scores.length % 8 !== 0 && onNextBoard && (
              <button
                type="button"
                onClick={() => {
                  onNextBoard();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 shadow transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Graj rozdanie #{(scores.length % 8) + 1}</span>
              </button>
            )}

            {/* Button to start new 8 if 8 is complete */}
            {scores.length > 0 && scores.length % 8 === 0 && onStartNewEight && (
              <button
                type="button"
                onClick={() => {
                  onStartNewEight();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 transition active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>🏆 Zacznij nową 8 (#1)</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
