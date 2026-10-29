import React from 'react';
import { DdsTableResult } from '../logic/dds';
import { Contract, Seat, TrumpSuit } from '../types/bridge';
import { Calculator, Award } from 'lucide-react';

interface DdsViewProps {
  ddsResult: DdsTableResult | null;
  loading?: boolean;
  contract?: Contract | null;
  wonNS?: number;
  wonEW?: number;
}

const SUITS_ORDER: TrumpSuit[] = ['C', 'D', 'H', 'S', 'NT'];
const SEATS_ORDER: Seat[] = ['N', 'S', 'E', 'W'];

const BLACK_SPADE_STYLE: React.CSSProperties = {
  color: '#020617',
  textShadow: '-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff',
};

const SUIT_ICONS: Record<TrumpSuit, { label: string; symbol: string; color: string; style?: React.CSSProperties }> = {
  C: { label: 'Trefl', symbol: '♣', color: 'text-green-500' },
  D: { label: 'Karo', symbol: '♦', color: 'text-orange-500' },
  H: { label: 'Kier', symbol: '♥', color: 'text-red-500' },
  S: { label: 'Pik', symbol: '♠', color: 'text-slate-950', style: BLACK_SPADE_STYLE },
  NT: { label: 'BA', symbol: 'BA', color: 'text-sky-300' },
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
}) => {
  if (loading) {
    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-400">
          <Calculator className="w-4 h-4 animate-spin" />
          <span>Obliczanie analizy Double Dummy (DDS)...</span>
        </div>
      </div>
    );
  }

  if (!ddsResult) {
    return null;
  }

  const { tricks, parScore, parContracts } = ddsResult;

  const parContractStr = parContracts && parContracts.length > 0 ? parContracts.join(', ') : '';
  const parScoreStr = parScore > 0 ? `+${parScore}` : `${parScore}`;

  return (
    <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 space-y-2.5 text-left">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-400">
          <Calculator className="w-4 h-4" />
          <span>Analiza Double Dummy (DDS)</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/30">
          <Award className="w-3.5 h-3.5" />
          <span>Minimax: {parContractStr || `${parScoreStr} pkt`}</span>
        </div>
      </div>

      {/* DDS Matrix Table - Larger font, no redundant bottom explanation text */}
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm sm:text-base border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold">
              <th className="py-1.5 px-2 text-left text-xs sm:text-sm">Linia</th>
              {SUITS_ORDER.map(suit => (
                <th key={suit} className="py-1.5 px-2">
                  <span
                    className={`text-base sm:text-lg font-black ${SUIT_ICONS[suit].color}`}
                    style={SUIT_ICONS[suit].style}
                  >
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
                  <td className="py-1.5 px-2 text-left font-black text-slate-200 text-sm sm:text-base">
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
                        className={`py-1.5 px-2 font-mono font-black text-sm sm:text-base transition-all ${
                          isContractCell
                            ? 'bg-amber-500/25 text-amber-300 ring-2 ring-amber-400 rounded-lg scale-105'
                            : typeof count === 'number' && count >= 9
                            ? 'text-emerald-400'
                            : typeof count === 'number' && count >= 7
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
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
    </div>
  );
};
