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

  const isDeclarerVulnerable = (declarer: string, vul: string) => {
    if (vul === 'BOTH') return true;
    if (vul === 'NONE') return false;
    const isNS = declarer === 'N' || declarer === 'S';
    return (isNS && vul === 'NS') || (!isNS && vul === 'EW');
  };

  const renderColoredContractStr = (str: string) => {
    if (!str || str === 'PAS') return <span className="text-slate-300">PAS</span>;
    const blackSpade: React.CSSProperties = {
      color: '#020617',
      textShadow: '-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff',
    };
    return (
      <span className="inline-flex items-center gap-0.5 text-sm sm:text-base font-black">
        {Array.from(str).map((ch, idx) => {
          if (ch === '♣') return <span key={idx} className="text-green-500">♣</span>;
          if (ch === '♦') return <span key={idx} className="text-orange-500">♦</span>;
          if (ch === '♥') return <span key={idx} className="text-red-500">♥</span>;
          if (ch === '♠') return <span key={idx} className="text-slate-950" style={blackSpade}>♠</span>;
          return <span key={idx} className="text-white">{ch}</span>;
        })}
      </span>
    );
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
            <div className="w-full overflow-x-hidden">
              <table className="w-full text-left text-sm sm:text-base table-auto">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-tight text-xs sm:text-sm">
                    <th className="pb-2 pl-2">Rozd.</th>
                    <th className="pb-2 px-2">Kontrakt</th>
                    <th className="pb-2 px-2 text-center">PC (NS:WE)</th>
                    <th className="pb-2 px-2 text-right">Zapis N-S</th>
                    <th className="pb-2 pr-2 text-right">IMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-semibold text-sm sm:text-base">
                  {scores.map((rec) => {
                    const imp = rec.impNS ?? 0;
                    const isVul = isDeclarerVulnerable(rec.declarer, rec.vulnerability);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2.5 pl-2 font-black text-amber-400 font-mono">#{rec.boardNumber}</td>
                        <td className="py-2.5 px-2 font-black text-slate-100 whitespace-nowrap">
                          {renderColoredContractStr(rec.contractStr)}{' '}
                          <span className={`text-sm sm:text-base font-black ml-0.5 ${isVul ? 'text-red-500' : 'text-white'}`}>
                            ({rec.declarer})
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-200 font-mono font-bold whitespace-nowrap">
                          {rec.hcpNS !== undefined ? `${rec.hcpNS}:${rec.hcpEW}` : '—'}
                        </td>
                        <td className={`py-2.5 px-2 text-right font-black font-mono whitespace-nowrap ${rec.scoreNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {rec.scoreNS >= 0 ? `+${rec.scoreNS}` : rec.scoreNS}
                        </td>
                        <td className={`py-2.5 pr-2 text-right font-mono font-black whitespace-nowrap ${
                          imp > 0 ? 'text-emerald-400' : imp < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {imp > 0 ? `+${imp}` : imp}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-amber-400/80 bg-slate-950 font-bold text-sm sm:text-base">
                  <tr>
                    <td className="py-2.5 pl-2 text-amber-400 font-black">RAZEM</td>
                    <td className="py-2.5 px-2 text-slate-300 text-xs sm:text-sm">Bilans ({scores.length})</td>
                    <td className="py-2.5 px-2 text-center text-slate-200 font-mono text-xs sm:text-sm font-bold whitespace-nowrap">
                      {avgHcpNS && avgHcpEW ? `${avgHcpNS}:${avgHcpEW}` : '—'}
                    </td>
                    <td className={`py-2.5 px-2 text-right font-black font-mono whitespace-nowrap ${totalNS >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {totalNS >= 0 ? `+${totalNS}` : totalNS}
                    </td>
                    <td className={`py-2.5 pr-2 text-right font-mono font-black text-base whitespace-nowrap ${
                      totalImpNS > 0 ? 'text-emerald-400' : totalImpNS < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {totalImpNS > 0 ? `+${totalImpNS}` : totalImpNS}
                    </td>
                  </tr>
                </tfoot>
              </table>
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

            {/* Button to start new 8 - ALWAYS available as backup or when 8 is completed */}
            {onStartNewEight && (
              <button
                type="button"
                onClick={() => {
                  if (scores.length % 8 !== 0) {
                    if (window.confirm('Czy na pewno chcesz przerwać bieżącą ósemkę i zacząć nową od rozdania #1?')) {
                      onStartNewEight();
                      onClose();
                    }
                  } else {
                    onStartNewEight();
                    onClose();
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                  scores.length % 8 === 0
                    ? 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50'
                    : 'text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-600/50'
                }`}
                title="Rozpocznij nową ósemkę od rozdania #1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{scores.length % 8 === 0 ? '🏆 Zacznij nową 8 (#1)' : 'Zacznij nową 8 (#1)'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black rounded-lg shadow transition active:scale-95"
          >
            ↩️ Podsumowanie rozdania
          </button>
        </div>
      </div>
    </div>
  );
};
