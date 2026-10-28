import React from 'react';
import { Vulnerability } from '../types/bridge';

export const VulBadge: React.FC<{ vulnerability?: Vulnerability }> = ({ vulnerability }) => {
  switch (vulnerability) {
    case 'NONE':
      return (
        <span className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black whitespace-nowrap">
          <span className="hidden sm:inline">Założenia: </span>Obie przed
        </span>
      );
    case 'BOTH':
      return (
        <span className="bg-rose-950/90 border border-rose-500/60 text-rose-300 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black whitespace-nowrap">
          <span className="hidden sm:inline">Założenia: </span>Obie po
        </span>
      );
    case 'NS':
      return (
        <span className="bg-amber-950/90 border border-amber-500/60 text-amber-300 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black whitespace-nowrap">
          <span className="hidden sm:inline">Założenia: </span>WE przed (NS po)
        </span>
      );
    case 'EW':
      return (
        <span className="bg-sky-950/90 border border-sky-500/60 text-sky-300 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black whitespace-nowrap">
          <span className="hidden sm:inline">Założenia: </span>NS przed (EW po)
        </span>
      );
    default:
      return null;
  }
};
