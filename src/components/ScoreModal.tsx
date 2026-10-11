import React from 'react';
import { ScoreRecord } from '../types/bridge';
import { Trophy, Trash2, X, ShieldAlert } from 'lucide-react';

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: ScoreRecord[];
  onClearHistory: () => void;
}

export const ScoreModal: React.FC<ScoreModalProps> = ({
  isOpen,
  onClose,
  scores,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const totalNS = scores.reduce((acc, curr) => acc + curr.scoreNS, 0);
  const totalEW = scores.reduce((acc, curr) => acc + curr.scoreEW, 0);

  const getVulLabel = (vul: string) => {
    switch (vul) {
      case 'NONE': return 'Żadne (Przed)';
      case 'BOTH': return 'Obie (Po)';
      case 'NS': return 'NS po partii';
      case 'EW': return 'EW po partii';
      default: return vul;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Protokół Wyników (Zapis Sportowy)</h2>
              <p className="text-xs text-slate-400">Zapisano w pamięci lokalnej (Local Storage) telefonu</p>
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

        {/* Totals Banner */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/40 border-b border-slate-800 text-center">
          <div className={`p-3 rounded-xl border ${totalNS >= totalEW ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Para N - S</span>
            <span className="text-2xl font-black text-emerald-400">{totalNS >= 0 ? `+${totalNS}` : totalNS}</span>
          </div>
          <div className={`p-3 rounded-xl border ${totalEW > totalNS ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Para E - W</span>
            <span className="text-2xl font-black text-amber-400">{totalEW >= 0 ? `+${totalEW}` : totalEW}</span>
          </div>
        </div>

        {/* Boards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {scores.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">Brak zakończonych rozdań w historii.</p>
              <p className="text-xs text-slate-600 mt-1">Po zakończeniu każdego rozdania wynik pojawi się tutaj automatycznie.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-2 pl-2">Rozd.</th>
                    <th className="pb-2">Rozd./Partia</th>
                    <th className="pb-2">Kontrakt</th>
                    <th className="pb-2">Lewy</th>
                    <th className="pb-2 text-right">Zapis N-S</th>
                    <th className="pb-2 text-right pr-2">Zapis E-W</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {scores.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 pl-2 font-bold text-amber-400">#{rec.boardNumber}</td>
                      <td className="py-2.5 text-slate-300">
                        <span className="font-semibold">{rec.dealer}</span> / {getVulLabel(rec.vulnerability)}
                      </td>
                      <td className="py-2.5 font-bold text-slate-100">
                        {rec.contractStr} <span className="text-xs text-slate-400 font-normal">({rec.declarer})</span>
                      </td>
                      <td className="py-2.5 text-slate-300">
                        NS: <span className="font-semibold text-white">{rec.tricksWonNS}</span> | EW: <span className="font-semibold text-white">{rec.tricksWonEW}</span>
                      </td>
                      <td className={`py-2.5 text-right font-bold ${rec.scoreNS >= 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {rec.scoreNS >= 0 ? `+${rec.scoreNS}` : rec.scoreNS}
                      </td>
                      <td className={`py-2.5 text-right pr-2 font-bold ${rec.scoreEW >= 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {rec.scoreEW >= 0 ? `+${rec.scoreEW}` : rec.scoreEW}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          {scores.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Czy na pewno chcesz wyczyścić całą historię zapisów?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition"
            >
              <Trash2 className="w-4 h-4" />
              Wyczyść historię
            </button>
          ) : (
            <div />
          )}

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
