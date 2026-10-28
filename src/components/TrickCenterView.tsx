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
  onNextBoard?: () => void;
  onStartNewEight?: () => void;
}

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
  onNextBoard,
  onStartNewEight,
}) => {
  const getPlayedCardForSeat = (seat: Seat): PlayedCard | undefined => {
    return currentTrick.cards.find(c => c.playedBy === seat);
  };

  if (phase === 'BOARD_RESULT' && lastResult) {
    return (
      <div className="z-20 bg-slate-950/95 border-2 border-emerald-400 p-2 sm:p-3 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-center max-w-[200px] sm:max-w-xs animate-scaleUp">
        <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">
          Rozdanie #{boardNumber} • Zakończone
        </span>
        <span className="text-white text-sm sm:text-base font-black my-0.5">
          {contract ? formatContractString(contract) : 'PAS'} {declarerSeat ? `(${declarerSeat})` : ''}
        </span>
        <span className="text-emerald-300 font-mono text-xs font-bold">
          {lastResult.resultDetail}
        </span>
        {lastResult.hcpNS !== undefined && (
          <span className="text-slate-400 font-mono text-[10px] mt-0.5">
            PC: NS {lastResult.hcpNS} : EW {lastResult.hcpEW}
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenResultModal();
            }}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow"
          >
            📊 Protokół
          </button>
          {boardNumber % 8 === 0 && onStartNewEight ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartNewEight();
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-black shadow"
            >
              Nowa 8
            </button>
          ) : onNextBoard ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNextBoard();
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shadow"
            >
              Następne (#{boardNumber + 1})
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === 'PLAYING') {
    return (
      <div className="relative w-full h-full min-w-[210px] max-w-[340px] desk:max-w-[420px] min-h-[190px] land:min-h-[150px] desk:min-h-[240px] flex items-center justify-center">
        {/* Top (Partner) Card - exact same size="player" as player's hand */}
        {getPlayedCardForSeat(topSeat) && (
          <div className="absolute top-0.5 animate-scaleUp z-10 pointer-events-none">
            <CardView card={getPlayedCardForSeat(topSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}
        {/* Bottom (My) Card - exact same size="player" as player's hand */}
        {getPlayedCardForSeat(bottomSeat) && (
          <div className="absolute bottom-0.5 animate-scaleUp z-20 pointer-events-none">
            <CardView card={getPlayedCardForSeat(bottomSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}
        {/* Left Card - exact same size="player" as player's hand */}
        {getPlayedCardForSeat(leftSeat) && (
          <div className="absolute left-1 sm:left-3 animate-scaleUp z-10 pointer-events-none">
            <CardView card={getPlayedCardForSeat(leftSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}
        {/* Right Card - exact same size="player" as player's hand */}
        {getPlayedCardForSeat(rightSeat) && (
          <div className="absolute right-1 sm:right-3 animate-scaleUp z-10 pointer-events-none">
            <CardView card={getPlayedCardForSeat(rightSeat)!.card} size="player" isPlayable={false} />
          </div>
        )}

        {/* Center Trick Resolution or Contract */}
        {currentTrick.cards.length === 4 && currentTrick.winnerSeat ? (
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
        ) : (
          contract && (
            <div className="z-10 bg-slate-950/95 border-2 border-amber-400 text-amber-300 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl shadow-2xl font-black flex items-center gap-1.5 pointer-events-none">
              <span className="text-white text-base sm:text-2xl font-black">{formatContractString(contract)}</span>
              <span className="text-amber-400 text-xs sm:text-sm font-bold">({contract.declarer})</span>
            </div>
          )
        )}
      </div>
    );
  }

  return null;
};
