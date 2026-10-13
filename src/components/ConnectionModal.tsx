import React, { useState } from 'react';
import { Wifi, X, Check, Server, Smartphone, Plane } from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentServer: string;
  currentRoom: string;
  onSave: (server: string, room: string) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  currentServer,
  currentRoom,
  onSave,
}) => {
  const [serverInput, setServerInput] = useState(currentServer || '127.0.0.1:8080');
  const [roomInput, setRoomInput] = useState(currentRoom || 'air-737');

  if (!isOpen) return null;

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSave(serverInput.trim(), roomInput.trim() || 'air-737');
    onClose();
  };

  const setPreset = (server: string) => {
    setServerInput(server);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 flex flex-col shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Ustawienia połączenia serwera</h2>
            <p className="text-xs text-slate-400">Skonfiguruj adres serwera pokładowego</p>
          </div>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          {/* Szybkie presety */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
              Szybki wybór roli:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreset('127.0.0.1:8080')}
                className={`p-2.5 rounded-xl border text-left transition text-xs flex flex-col gap-1 ${
                  serverInput === '127.0.0.1:8080'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Host (Ten telefon)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">127.0.0.1:8080</span>
              </button>

              <button
                type="button"
                onClick={() => setPreset('192.168.43.1:8080')}
                className={`p-2.5 rounded-xl border text-left transition text-xs flex flex-col gap-1 ${
                  serverInput === '192.168.43.1:8080'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <Plane className="w-3.5 h-3.5" />
                  <span>Gracz (Wi-Fi Hotspot)</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">192.168.43.1:8080</span>
              </button>
            </div>
          </div>

          {/* Adres IP i port */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Adres IP i Port serwera:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={serverInput}
                onChange={e => setServerInput(e.target.value)}
                placeholder="np. 127.0.0.1:8080 lub 192.168.43.1:8080"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Pokój */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Identyfikator pokoju:
            </label>
            <input
              type="text"
              value={roomInput}
              onChange={e => setRoomInput(e.target.value)}
              placeholder="air-737"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-2.5 text-[11px] text-slate-400 space-y-1">
            <p>💡 <strong>Wskazówka:</strong> W samolocie telefon gospodarza uruchamia serwer na porcie 8080. Pozostali gracze łączą się z adresem IP hotspotu gospodarza (najczęściej <code className="text-amber-300 font-mono">192.168.43.1:8080</code>).</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition shadow flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Zapisz i Połącz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
