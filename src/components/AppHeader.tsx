import React from 'react';
import { RoomState } from '../types/bridge';
import { VulBadge } from './VulBadge';
import { Plane, Bot, Wifi, WifiOff, Users, Trophy, QrCode, RotateCcw, MessageSquare } from 'lucide-react';

interface AppHeaderProps {
  roomId: string;
  isBotGame: boolean;
  onStopBotGame: () => void;
  effectiveState: RoomState | null;
  connected: boolean;
  activeWsUrl: string;
  onOpenConnection: () => void;
  onOpenPlayers: () => void;
  onOpenScores: () => void;
  localScoresCount: number;
  onOpenQR: () => void;
  onOpenChat: () => void;
  unreadChatCount: number;
  onResetRoom: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  roomId,
  isBotGame,
  onStopBotGame,
  effectiveState,
  connected,
  activeWsUrl,
  onOpenConnection,
  onOpenPlayers,
  onOpenScores,
  localScoresCount,
  onOpenQR,
  onOpenChat,
  unreadChatCount,
  onResetRoom,
}) => {
  return (
    <header className="h-12 sm:h-14 bg-slate-950/95 border-b border-slate-800/80 px-1.5 sm:px-4 flex items-center justify-between shrink-0 shadow-lg z-20 gap-1">
      {/* Left: Brand & Room */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <div className="p-1 sm:p-1.5 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center shrink-0">
          <Plane className="w-4 h-4 sm:w-5 sm:h-5 -rotate-45" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="font-black text-xs sm:text-base tracking-tight text-white truncate">anywhereBridge</span>
            <span className="bg-slate-800 text-amber-400 font-mono text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
              {roomId}
            </span>
            {isBotGame && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5">
                  <Bot className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="hidden sm:inline">Boty</span>
                </span>
                <button
                  type="button"
                  onClick={onStopBotGame}
                  className="text-[9px] text-slate-400 hover:text-white underline transition"
                  title="Wyjdź z gry z botami"
                >
                  Wyjdź
                </button>
              </div>
            )}
          </div>
          {effectiveState && (
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 truncate">
              <span>Rozd. #{effectiveState.boardNumber}</span>
              <span>•</span>
              <span>Rozd: <strong className="text-slate-200">{effectiveState.dealer}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Vulnerability Status (Desktop / Tablet) */}
      <div className="hidden md:flex items-center gap-1 sm:gap-2">
        {effectiveState && <VulBadge vulnerability={effectiveState.vulnerability} />}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Connection status indicator */}
        <button
          type="button"
          onClick={onOpenConnection}
          className="flex items-center text-xs p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 transition border border-slate-800"
          title={connected ? `Połączono: ${activeWsUrl}` : `Rozłączono (${activeWsUrl})`}
        >
          {connected ? (
            <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
          )}
        </button>

        {/* Players count button */}
        {effectiveState && (
          <button
            type="button"
            onClick={onOpenPlayers}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-[11px] sm:text-xs font-bold transition shadow"
            title="Zobacz listę graczy w pokoju"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {effectiveState.connectedCount !== undefined
                ? effectiveState.connectedCount
                : Math.max((effectiveState.connectedPlayers || []).length, Object.values(effectiveState.seats).filter(Boolean).length)}
            </span>
          </button>
        )}

        {/* Chat button */}
        <button
          type="button"
          onClick={onOpenChat}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-[11px] sm:text-xs font-bold transition shadow relative"
          title="Napisz do wszystkich przy stole"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Czat</span>
          {unreadChatCount > 0 && (
            <span className="bg-emerald-500 text-slate-950 text-[9px] px-1 rounded-full font-black animate-pulse">
              {unreadChatCount}
            </span>
          )}
        </button>

        {/* Scores button */}
        <button
          type="button"
          onClick={onOpenScores}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 rounded-lg text-[11px] sm:text-xs font-bold transition shadow"
          title="Otwórz protokół wyników"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Wyniki</span>
          {localScoresCount > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[9px] px-1 rounded-full font-black">
              {localScoresCount}
            </span>
          )}
        </button>

        {/* QR Code button */}
        <button
          type="button"
          onClick={onOpenQR}
          className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 rounded-lg text-[11px] sm:text-xs font-bold transition shadow"
          title="Pokaż kod QR"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kod QR</span>
        </button>

        {/* Reset button */}
        <button
          type="button"
          onClick={onResetRoom}
          className="p-1 sm:p-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-lg transition"
          title="Zresetuj pokój do poczekalni"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
