import React from 'react';
import { Rank, Suit } from '../types/bridge';

interface CardFigureArtProps {
  rank: Rank;
  suit: Suit;
}

const SUIT_UNICODE: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

const SUIT_FILL: Record<Suit, string> = {
  S: '#0f172a', // Slate 900
  H: '#dc2626', // Red 600
  D: '#ea580c', // Orange 600
  C: '#047857', // Emerald 700
};

export const CardFigureArt: React.FC<CardFigureArtProps> = ({ rank, suit }) => {
  const suitColor = SUIT_FILL[suit];
  const suitSymbol = SUIT_UNICODE[suit];

  if (rank === 'K') {
    // KING (Król) - Regal monarch with golden crown, beard, robes, and sceptre
    return (
      <svg viewBox="0 0 60 70" className="w-full h-full max-h-[82%] select-none pointer-events-none">
        {/* Robe backdrop */}
        <path d="M12 40 L16 30 L44 30 L48 40 L52 68 L8 68 Z" fill={suitColor} />
        <path d="M18 34 L30 46 L42 34 L38 68 L22 68 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.8" />
        
        {/* Ermine spots on white collar */}
        <circle cx="26" cy="40" r="1" fill="#0f172a" />
        <circle cx="34" cy="40" r="1" fill="#0f172a" />
        <circle cx="30" cy="52" r="1" fill="#0f172a" />
        <circle cx="26" cy="62" r="1" fill="#0f172a" />
        <circle cx="34" cy="62" r="1" fill="#0f172a" />

        {/* King's Head */}
        <path d="M22 22 Q30 22 38 22 L38 32 Q30 38 22 32 Z" fill="#fed7aa" stroke="#78350f" strokeWidth="0.8" />
        
        {/* Crown */}
        <path d="M17 22 L20 12 L26 17 L30 10 L34 17 L40 12 L43 22 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
        <circle cx="20" cy="12" r="1.3" fill="#dc2626" />
        <circle cx="30" cy="10" r="1.5" fill="#2563eb" />
        <circle cx="40" cy="12" r="1.3" fill="#dc2626" />
        <rect x="18" y="20" width="24" height="2.5" fill="#d97706" />

        {/* Face details: Eyes, mustache, beard */}
        <circle cx="26" cy="26" r="0.8" fill="#1e293b" />
        <circle cx="34" cy="26" r="0.8" fill="#1e293b" />
        {/* Mustache */}
        <path d="M24 29 Q30 31 36 29 Q30 33 24 29 Z" fill="#78350f" />
        {/* Beard */}
        <path d="M23 31 Q30 39 37 31 L34 35 Q30 40 26 35 Z" fill="#78350f" />

        {/* Golden Royal Sceptre */}
        <line x1="47" y1="26" x2="47" y2="64" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="47" cy="24" r="3" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
        <circle cx="47" cy="24" r="1" fill="#dc2626" />

        {/* Suit Emblem on shield */}
        <circle cx="30" cy="44" r="5" fill="#ffffff" stroke={suitColor} strokeWidth="1" />
        <text x="30" y="47.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={suitColor}>
          {suitSymbol}
        </text>
      </svg>
    );
  }

  if (rank === 'Q') {
    // QUEEN (Dama) - Elegant queen with golden tiara, royal curls, gown and rose
    return (
      <svg viewBox="0 0 60 70" className="w-full h-full max-h-[82%] select-none pointer-events-none">
        {/* Robe backdrop */}
        <path d="M14 42 L18 32 L42 32 L46 42 L50 68 L10 68 Z" fill={suitColor} />
        <path d="M20 36 L30 46 L40 36 L36 68 L24 68 Z" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />

        {/* Queen's Hair */}
        <path d="M19 22 Q18 34 22 36 L24 24 Q30 19 36 24 L38 36 Q42 34 41 22 Z" fill="#b45309" />

        {/* Queen's Face */}
        <path d="M23 23 Q30 23 37 23 L37 32 Q30 37 23 32 Z" fill="#ffedd5" stroke="#9a3412" strokeWidth="0.8" />

        {/* Tiara / Crown */}
        <path d="M21 21 Q30 13 39 21 L38 23 L22 23 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />
        <circle cx="24" cy="18" r="1.2" fill="#ffffff" stroke="#b45309" strokeWidth="0.5" />
        <circle cx="30" cy="15" r="1.5" fill="#dc2626" />
        <circle cx="36" cy="18" r="1.2" fill="#ffffff" stroke="#b45309" strokeWidth="0.5" />

        {/* Eyes & smile */}
        <circle cx="27" cy="27" r="0.8" fill="#1e293b" />
        <circle cx="33" cy="27" r="0.8" fill="#1e293b" />
        <path d="M28 31 Q30 32.5 32 31" fill="none" stroke="#dc2626" strokeWidth="0.8" strokeLinecap="round" />

        {/* Pearl Necklace */}
        <path d="M26 34 Q30 37 34 34" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="1.5,1" />

        {/* Holding Golden Rose / Blossom */}
        <circle cx="15" cy="52" r="3" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
        <circle cx="15" cy="52" r="1.2" fill="#dc2626" />
        <path d="M15 55 Q16 62 18 66" fill="none" stroke="#047857" strokeWidth="1.5" />

        {/* Suit Emblem Medallion */}
        <circle cx="30" cy="45" r="5" fill="#ffffff" stroke={suitColor} strokeWidth="1" />
        <text x="30" y="48.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={suitColor}>
          {suitSymbol}
        </text>
      </svg>
    );
  }

  if (rank === 'J') {
    // JACK (Walet) - Gallant young knight with feathered beret & halberd
    return (
      <svg viewBox="0 0 60 70" className="w-full h-full max-h-[82%] select-none pointer-events-none">
        {/* Doublet / Tunic */}
        <path d="M13 38 L18 30 L42 30 L47 38 L50 68 L10 68 Z" fill={suitColor} />
        
        {/* Knightly diagonal sash */}
        <path d="M18 30 L45 68 L37 68 L14 34 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.8" />

        {/* Face */}
        <path d="M23 23 Q30 23 37 23 L37 33 Q30 37 23 33 Z" fill="#fed7aa" stroke="#9a3412" strokeWidth="0.8" />

        {/* Youthful wavy hair */}
        <path d="M20 25 Q18 34 22 35 L23 26 Z" fill="#78350f" />
        <path d="M40 25 Q42 34 38 35 L37 26 Z" fill="#78350f" />

        {/* Renaissance Velvet Cap */}
        <path d="M20 23 Q30 18 40 23 L42 19 Q30 14 18 19 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
        
        {/* Sweeping Knight Feather Plume */}
        <path d="M19 19 Q12 10 24 8 Q34 8 36 14 Q26 12 19 19 Z" fill="#dc2626" stroke="#b91c1c" strokeWidth="0.8" />

        {/* Eyes & determined expression */}
        <circle cx="27" cy="27" r="0.8" fill="#1e293b" />
        <circle cx="33" cy="27" r="0.8" fill="#1e293b" />
        <line x1="28" y1="31" x2="32" y2="31" stroke="#9a3412" strokeWidth="0.8" strokeLinecap="round" />

        {/* Halberd / Spear shaft */}
        <line x1="12" y1="12" x2="12" y2="68" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8 L15 15 L12 13 L9 15 Z" fill="#94a3b8" stroke="#475569" strokeWidth="0.8" />
        <path d="M12 14 Q18 16 16 22 L12 18 Z" fill="#fbbf24" />

        {/* Suit Emblem on shield */}
        <circle cx="30" cy="46" r="5" fill="#ffffff" stroke={suitColor} strokeWidth="1" />
        <text x="30" y="49.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill={suitColor}>
          {suitSymbol}
        </text>
      </svg>
    );
  }

  if (rank === 'A') {
    // ACE (As) - Heraldic ornate centerpiece with laurels and bold insignia
    return (
      <svg viewBox="0 0 60 70" className="w-full h-full max-h-[82%] select-none pointer-events-none">
        {/* Classical Laurel Wreath */}
        <path
          d="M16 48 Q10 35 18 22 Q23 15 30 14 Q37 15 42 22 Q50 35 44 48 Q37 58 30 58 Q23 58 16 48 Z"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="2.5,2"
        />
        {/* Small laurel leaves */}
        <circle cx="16" cy="35" r="1.5" fill="#d97706" />
        <circle cx="44" cy="35" r="1.5" fill="#d97706" />
        <circle cx="21" cy="22" r="1.5" fill="#d97706" />
        <circle cx="39" cy="22" r="1.5" fill="#d97706" />

        {/* Heraldic Ribbon top & bottom */}
        <path d="M22 12 Q30 9 38 12" fill="none" stroke="#d97706" strokeWidth="1" />
        <path d="M22 60 Q30 63 38 60" fill="none" stroke="#d97706" strokeWidth="1" />

        {/* Large Crisp Center Suit Pip */}
        <text
          x="30"
          y="43"
          textAnchor="middle"
          fontSize="26"
          fontWeight="bold"
          fill={suitColor}
        >
          {suitSymbol}
        </text>
      </svg>
    );
  }

  // Number cards (2 to 10) - Crisp, authentic suit pips
  return <NumberCardPips rank={rank} suitSymbol={suitSymbol} suitColor={suitColor} />;
};

const NumberCardPips: React.FC<{ rank: Rank; suitSymbol: string; suitColor: string }> = ({
  rank,
  suitSymbol,
  suitColor,
}) => {
  const count = rank === 'T' ? 10 : parseInt(rank, 10) || 2;

  // Grid coordinates for 60x70 viewBox
  const coordsMap: Record<number, Array<{ x: number; y: number }>> = {
    2: [{ x: 30, y: 24 }, { x: 30, y: 52 }],
    3: [{ x: 30, y: 22 }, { x: 30, y: 38 }, { x: 30, y: 54 }],
    4: [{ x: 22, y: 24 }, { x: 38, y: 24 }, { x: 22, y: 52 }, { x: 38, y: 52 }],
    5: [{ x: 22, y: 24 }, { x: 38, y: 24 }, { x: 30, y: 38 }, { x: 22, y: 52 }, { x: 38, y: 52 }],
    6: [
      { x: 22, y: 22 }, { x: 38, y: 22 },
      { x: 22, y: 38 }, { x: 38, y: 38 },
      { x: 22, y: 54 }, { x: 38, y: 54 },
    ],
    7: [
      { x: 22, y: 22 }, { x: 38, y: 22 },
      { x: 30, y: 30 },
      { x: 22, y: 38 }, { x: 38, y: 38 },
      { x: 22, y: 54 }, { x: 38, y: 54 },
    ],
    8: [
      { x: 22, y: 22 }, { x: 38, y: 22 },
      { x: 30, y: 30 },
      { x: 22, y: 38 }, { x: 38, y: 38 },
      { x: 30, y: 46 },
      { x: 22, y: 54 }, { x: 38, y: 54 },
    ],
    9: [
      { x: 22, y: 20 }, { x: 38, y: 20 },
      { x: 22, y: 32 }, { x: 38, y: 32 },
      { x: 30, y: 38 },
      { x: 22, y: 44 }, { x: 38, y: 44 },
      { x: 22, y: 56 }, { x: 38, y: 56 },
    ],
    10: [
      { x: 22, y: 19 }, { x: 38, y: 19 },
      { x: 30, y: 25 },
      { x: 22, y: 32 }, { x: 38, y: 32 },
      { x: 22, y: 44 }, { x: 38, y: 44 },
      { x: 30, y: 50 },
      { x: 22, y: 57 }, { x: 38, y: 57 },
    ],
  };

  const points = coordsMap[count] || coordsMap[2];
  const pipFontSize = count >= 8 ? 10 : 12;

  return (
    <svg viewBox="0 0 60 70" className="w-full h-full max-h-[85%] select-none pointer-events-none">
      {points.map((pt, idx) => (
        <text
          key={idx}
          x={pt.x}
          y={pt.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={pipFontSize}
          fontWeight="bold"
          fill={suitColor}
        >
          {suitSymbol}
        </text>
      ))}
    </svg>
  );
};
