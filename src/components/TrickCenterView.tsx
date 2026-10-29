import React from 'react';
import { Contract, PlayedCard, ScoreRecord, Seat, Trick } from '../types/bridge';
import { CardView } from './CardView';
import { formatContractString } from '../logic/scoring';

interface TrickCenterViewProps {
  phase: string;
  lastResult: ScoreRecord | null;
  boardNumber: number;
  contract: Contract | null;
  declarerSeat: Seat | null;
  currentTrick: Trick;
  seatNames: Record<Seat, string>;
  topSeat?: Seat;
  bottomSeat?: Seat;
  leftSeat?: Seat;
  rightSeat?: Seat;
  onCollectTrick?: () => void;
  onOpenResultModal: () => void;
  onOpenBiddingReview?: () => void;
  onHideCenterBox?: () => void;
  onNextBoard?: () => void;
  onStartNewEight?: () => void;
}

const BLACK_SPADE_STYLE: React.CSSProperties = {
  color: '#020617',
  textShadow: '-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff',
};

const renderColoredContractBadge = (contract: Contract) => {
  const suitMap: Record<string, { sym: string; cls: string; style?: React.CSSProperties }> = {
    C: { sym: '♣', cls: 'text-green-500' },
    D: { sym: '♦', cls: 'text-orange-500' },
    H: { sym: '♥', cls: 'text-red-500' },
    S: { sym: '♠', cls: 'text-slate-950', style: BLACK_SPADE_STYLE },
    NT: { sym: 'BA', cls: 'text-sky-400' },
  };
  const s = suitMap[contract.suit] || { sym: contract.suit, cls: 'text-white' };
  const dStr = contract.doubled === 'REDOUBLED' ? 'xx' : contract.doubled === 'DOUBLED' ? 'x' : '';
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-white">{contract.level}</span>
      <span className={s.cls} style={s.style}>{s.sym}</span>
      {dStr && <span className="text-rose-400">{dStr}</span>}
    </span>
  );
};

export const TrickCenterView: React.FC<TrickCenterViewProps> = ({
  phase,
  lastResult,
  boardNumber,
  contract,
  declarerSeat,
  currentTrick,
  seatNames,
  topSeat = 'N',
  bottomSeat = 'S',
  leftSeat = 'W',
  rightSeat = 'E',
  onCollectTrick,
  onOpenResultModal,
  onOpenBiddingReview,
  onHideCenterBox,
  onNextBoard,
  onStartNewEight,
}) => {
  const getPlayedCardForSeat = (seat: Seat): PlayedCard | undefined => {
    return currentTrick.cards.find(c => c.playedBy === seat);
  };

  if (phase === 'BOARD_RESULT' && lastResult) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[230px] sm:max-w-[280px] bg-slate-950/95 border-2 border-emerald-400/80 rounded-2xl p-2.5 sm:p-3 text-center shadow-2xl flex flex-col items-center gap-1.5 z-30"
      >
        <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400 leading-tight">
          Rozdanie #{boardNumber} • Zakończone
        </div>

        {contract ? (
          <div className="text-lg sm:text-xl font-black text-white leading-tight flex items-center justify-center gap-1">
            {renderColoredContractBadge(contract)}
            <span className="text-amber-300 text-sm sm:text-base">({lastResult.declarer})</span>
          </div>
        ) : (
          <div className="text-base sm:text-lg font-black text-amber-300 leading-tight">
            {lastResult.contractStr}
          </div>
        )}

        <div className="text-xs sm:text-sm font-bold text-emerald-300 leading-snug">
          {lastResult.resultDetail}
        </div>

        <div className="w-full grid grid-cols-2 gap-1.5 mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenResultModal();
            }}
            className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs shadow transition cursor-pointer flex items-center justify-center gap-1"
          >
            <span>📊</span>
            <span>Protokół</span>
          </button>

          {boardNumber >= 8 && onStartNewEight ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartNewEight();
              }}
              className="py-1.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow transition cursor-pointer"
            >
              Nowa 8-ka
            </button>
          ) : (
            onNextBoard && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNextBoard();
                }}
                className="py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs shadow transition cursor-pointer"
              >
                Następne (#{(boardNumber % 8) + 1})
              </button>
            )
          )}
        </div>

        {onHideCenterBox && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHideCenterBox();
            }}
            className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-600 text-amber-300 font-black text-xs shadow transition cursor-pointer"
          >
            Ukryj
          </button>
        )}
      </div>
    );
  }

  if (phase === 'PLAYING') {
    return (
      <div className="relative flex-1 w-full h-full min-w-[200px] max-w-[360px] desk:max-w-[440px] flex items-center justify-center">
        {/* Top-left compact Contract badge in Portrait - click to open Bidding Review popup! */}
        {contract && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenBiddingReview) onOpenBiddingReview();
            }}
            title="Kliknij, aby przypomnieć przebieg licytacji"
            className="landscape:hidden absolute top-1 left-1 z-30 bg-slate-950/90 hover:bg-slate-900 active:scale-95 border border-amber-400/80 text-amber-300 px-2.5 py-0.5 rounded-lg shadow font-black flex items-center gap-1 cursor-pointer transition"
          >
            <span className="text-sm sm:text-base font-black">{renderColoredContractBadge(contract)}</span>
            <span className="text-amber-400 text-[10px] font-bold">({contract.declarer})</span>
          </button>
        )}

        {/* Top (Partner) Card */}
        {getPlayedCardForSeat(topSeat) && (
          <div className="absolute top-1 animate-scaleUp z-10 pointer-events-none">
            <CardView card={getPlayedCardForSeat(topSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}
        {/* Bottom (My) Card */}
        {getPlayedCardForSeat(bottomSeat) && (
          <div className="absolute bottom-1 animate-scaleUp z-20 pointer-events-none">
            <CardView card={getPlayedCardForSeat(bottomSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}
        {/* Left Card */}
        {getPlayedCardForSeat(leftSeat) && (
          <div className="absolute left-2 sm:left-4 animate-scaleUp z-10 pointer-events-none">
            <CardView card={getPlayedCardForSeat(leftSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}
        {/* Right Card */}
        {getPlayedCardForSeat(rightSeat) && (
          <div className="absolute right-2 sm:right-4 animate-scaleUp z-10 pointer-events-none">
            <CardView card={getPlayedCardForSeat(rightSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}

        {/* Center Trick Resolution */}
        {currentTrick.cards.length === 4 && currentTrick.winnerSeat && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onCollectTrick) onCollectTrick();
            }}
            className="z-30 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-xl shadow-2xl border-2 border-amber-100 animate-pulse cursor-pointer flex flex-col items-center justify-center text-center leading-tight"
          >
            <span className="text-[11px] font-black">
              🎉 {seatNames[currentTrick.winnerSeat]?.split(' ')[0]} ({currentTrick.winnerSeat})
            </span>
            <span className="text-[9px] bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded font-bold mt-0.5">
              Dotknij 👉
            </span>
          </div>
        )}
      </div>
    );
  }

  return null;
};
