import React from 'react';
import { DdsTableResult } from '../logic/dds';
import { Contract, Seat, TrumpSuit } from '../types/bridge';
import { Calculator, Award, Info } from 'lucide-react';

interface DdsViewProps {
  ddsResult: DdsTableResult | null;
  loading?: boolean;
  contract?: Contract | null;
  wonNS?: number;
  wonEW?: number;
}

const SUITS_ORDER: TrumpSuit[] = ['C', 'D', 'H', 'S', 'NT'];
const SEATS_ORDER: Seat[] = ['N', 'S', 'E', 'W'];

const SUIT_ICONS: Record<TrumpSuit, { label: string; symbol: string; color: string }> = {
  C: { label: 'Trefl', symbol: '♣', color: 'text-emerald-400' },
  D: { label: 'Karo', symbol: '♦', color: 'text-amber-400' },
  H: { label: 'Kier', symbol: '♥', color: 'text-rose-400' },
  S: { label: 'Pik', symbol: '♠', color: 'text-sky-300' },
  NT: { label: 'BA', symbol: 'BA', color: 'text-purple-300' },
};

const SEAT_LABELS: Record<Seat, string> = {
  N: 'N (Północ)',
  S: 'S (Południe)',
  E: 'E (Wschód)',
  W: 'W (Zachód)',
};

export const DdsView: React.FC<DdsViewProps> = ({
  ddsResult,
  loading = false,
  contract,
  wonNS,
  wonEW,
}) => {
  if (loading) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400">
          <Calculator className="w-4 h-4 animate-spin" />
          <span>Obliczanie analizy Double Dummy (DDS)...</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Analizowanie optymalnych linii rozgrywki (minimax) za pomocą biblioteki DDS.
        </p>
      </div>
    );
  }

  if (!ddsResult) {
    return null;
  }

  const { tricks, parScore, parContracts } = ddsResult;

  // Format minimax text
  const parContractStr = parContracts && parContracts.length > 0 ? parContracts.join(', ') : '';
  const parScoreStr = parScore > 0 ? `+${parScore}` : `${parScore}`;

  return (
    <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 space-y-3 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
          <Calculator className="w-4 h-4" />
          <span>Analiza Double Dummy (DDS)</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
          <Award className="w-3.5 h-3.5" />
          <span>Minimax: {parContractStr || `${parScoreStr} pkt`}</span>
        </div>
      </div>

      {/* DDS Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold">
              <th className="py-1 px-1.5 text-left text-[11px]">Linia</th>
              {SUITS_ORDER.map(suit => (
                <th key={suit} className="py-1 px-2">
                  <span className={`text-sm font-bold ${SUIT_ICONS[suit].color}`}>
                    {SUIT_ICONS[suit].symbol}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEATS_ORDER.map(seat => {
              const isNS = seat === 'N' || seat === 'S';
              return (
                <tr
                  key={seat}
                  className={`border-b border-slate-800/40 hover:bg-slate-900/60 ${
                    isNS ? 'bg-slate-900/20' : ''
                  }`}
                >
                  <td className="py-1 px-1.5 text-left font-bold text-slate-300 text-[11px]">
                    {SEAT_LABELS[seat].split(' ')[0]}
                  </td>
                  {SUITS_ORDER.map(suit => {
                    const count = tricks[seat]?.[suit] ?? '-';
                    const isContractCell =
                      contract &&
                      contract.declarer === seat &&
                      contract.suit === suit;

                    return (
                      <td
                        key={suit}
                        className={`py-1 px-2 font-mono font-bold transition-all ${
                          isContractCell
                            ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400 rounded'
                            : typeof count === 'number' && count >= 9
                            ? 'text-emerald-400 font-black'
                            : typeof count === 'number' && count >= 7
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                        title={`${SEAT_LABELS[seat]} w ${SUIT_ICONS[suit].label}: maks. ${count} lew`}
                      >
                        {count}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanatory notes */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400 space-y-1">
        <div className="flex items-start gap-1">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Tabela pokazuje ile lew może wziąć dany gracz (N, S, E, W) jako rozgrywający przy optymalnej grze w otwarte karty (Double Dummy).
          </span>
        </div>
        {contract && (
          <div className="text-slate-300 pt-0.5 border-t border-slate-800/60 flex items-center justify-between">
            <span>
              Rozgrywany kontrakt: <strong className="text-amber-400">{contract.level}{SUIT_ICONS[contract.suit].symbol}</strong> przez {contract.declarer}
            </span>
            <span>
              Maks. możliwe lewy (DDS): <strong className="text-emerald-400">{tricks[contract.declarer]?.[contract.suit] ?? '-'}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
