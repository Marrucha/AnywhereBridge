import React from 'react';
import { Vulnerability } from '../types/bridge';

export const VulBadge: React.FC<{ vulnerability?: Vulnerability }> = ({ vulnerability }) => {
  switch (vulnerability) {
    case 'NONE':
      return <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded text-[11px] font-bold">Przed partią (Żadna)</span>;
    case 'BOTH':
      return <span className="bg-rose-950/80 border border-rose-500/40 text-rose-400 px-2 py-0.5 rounded text-[11px] font-bold">Po partii (Obie)</span>;
    case 'NS':
      return <span className="bg-amber-950/80 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded text-[11px] font-bold">NS po partii</span>;
    case 'EW':
      return <span className="bg-sky-950/80 border border-sky-500/40 text-sky-400 px-2 py-0.5 rounded text-[11px] font-bold">EW po partii</span>;
    default:
      return null;
  }
};
