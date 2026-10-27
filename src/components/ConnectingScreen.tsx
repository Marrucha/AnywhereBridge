import React from 'react';
import { Bot, Settings } from 'lucide-react';
import { Seat } from '../types/bridge';

interface ConnectingScreenProps {
  roomId: string;
  activeWsUrl: string;
  onStartBotGame: () => void;
  onUpdateConnection: (server: string, room: string) => void;
  onOpenConnectionModal: () => void;
}

export const ConnectingScreen: React.FC<ConnectingScreenProps> = ({
  roomId,
  activeWsUrl,
  onStartBotGame,
  onUpdateConnection,
  onOpenConnectionModal,
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-4 max-w-sm mx-auto">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <div>
        <p className="text-base font-bold text-slate-100">Łączenie z serwerem pokładowym anywhereBridge...</p>
        <p className="text-xs text-slate-400 mt-1">
          Pokój: <span className="font-mono text-amber-400 font-bold">{roomId}</span>
        </p>
        <p className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">Adres: {activeWsUrl}</p>
      </div>

      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 w-full text-xs text-slate-300 space-y-2 shadow-xl">
        <p className="text-slate-400 text-[11px] font-medium">Brak połączenia? Opcje gry:</p>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onStartBotGame}
            className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 text-xs shadow-lg border border-indigo-400/40"
          >
            <Bot className="w-4 h-4 text-indigo-200" />
            <span>🤖 Zagraj testowo lokalnie z botami</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateConnection('127.0.0.1:8080', roomId)}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-amber-300 border border-slate-700 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs"
          >
            📱 Jestem Hostem (127.0.0.1:8080)
          </button>
          <button
            type="button"
            onClick={() => onUpdateConnection('192.168.43.1:8080', roomId)}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 active:scale-98 text-emerald-300 border border-slate-700 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs"
          >
            ✈️ Łączę się z Hotspotem (192.168.43.1:8080)
          </button>
          <button
            type="button"
            onClick={onOpenConnectionModal}
            className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-400 rounded-lg transition flex items-center justify-center gap-1 text-[11px]"
          >
            <Settings className="w-3.5 h-3.5" />
            Wpisz inny adres IP
          </button>
        </div>
      </div>
    </div>
  );
};
