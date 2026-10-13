import React, { useEffect, useState, useRef } from 'react';
import { RoomState, Seat, ClientMessage, ServerMessage, ScoreRecord } from './types/bridge';
import { BridgeTable } from './components/BridgeTable';
import { ScoreModal } from './components/ScoreModal';
import { QRModal } from './components/QRModal';
import {
  getStoredScores,
  saveScoreRecord,
  clearStoredScores,
  getOrCreatePlayerId,
  getStoredPlayerName,
  saveStoredPlayerName,
  getStoredSeat,
  saveStoredSeat,
} from './storage/scores';
import { Plane, Trophy, QrCode, RotateCcw, Wifi, WifiOff } from 'lucide-react';

const DEFAULT_ROOM_ID = 'air-737';

export const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || DEFAULT_ROOM_ID;
  });

  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [playerName, setPlayerName] = useState<string>(() => {
    const saved = getStoredPlayerName();
    if (saved) return saved;
    const defaultName = 'Gracz_' + Math.floor(Math.random() * 900 + 100);
    saveStoredPlayerName(defaultName);
    return defaultName;
  });

  const [serverAddress, setServerAddress] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const qServer = params.get('server');
    if (qServer) return qServer;
    const stored = localStorage.getItem('anywhere_bridge_server_addr');
    if (stored) return stored;
    if (window.location.hostname.includes('github.io')) {
      return '192.168.43.1:8080';
    }
    return '';
  });

  const [mySeat, setMySeat] = useState<Seat | null>(() => getStoredSeat());
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Modals
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [localScores, setLocalScores] = useState<ScoreRecord[]>(() => getStoredScores());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const connectWs = () => {
      const loc = window.location;
      let targetHost = serverAddress;
      if (!targetHost) {
        if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
          targetHost = `${loc.hostname}:8080`;
        } else {
          targetHost = loc.port === '3000' ? `${loc.hostname}:8080` : loc.host;
        }
      }
      const protocol = loc.protocol === 'https:' && !targetHost.startsWith('192.168.') && !targetHost.startsWith('10.') && !targetHost.startsWith('localhost') ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${targetHost}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
        // Send join message
        const joinMsg: ClientMessage = {
          type: 'join',
          roomId,
          playerId,
          playerName,
        };
        ws.send(JSON.stringify(joinMsg));

        // Auto-resume seat if previously held
        const prevSeat = getStoredSeat();
        if (prevSeat) {
          ws.send(JSON.stringify({ type: 'take_seat', seat: prevSeat }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          if (msg.type === 'state_update') {
            setRoomState(msg.state);
            setMySeat(msg.yourSeat);
            saveStoredSeat(msg.yourSeat);

            // Sync score record to localStorage if fresh result
            if (msg.state.lastResult) {
              const updated = saveScoreRecord(msg.state.lastResult);
              setLocalScores(updated);
            }
          } else if (msg.type === 'room_reset') {
            setMySeat(null);
            saveStoredSeat(null);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect attempt after 2s
        reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, playerId, playerName, serverAddress]);

  const sendMessage = (msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const handleTakeSeat = (seat: Seat) => {
    sendMessage({ type: 'take_seat', seat });
  };

  const handleLeaveSeat = () => {
    sendMessage({ type: 'leave_seat' });
    setMySeat(null);
    saveStoredSeat(null);
  };

  const handleStartGame = () => {
    sendMessage({ type: 'start_game' });
  };

  const handleMakeBid = (bid: any) => {
    sendMessage({ type: 'make_bid', bid });
  };

  const handlePlayCard = (cardId: string) => {
    sendMessage({ type: 'play_card', cardId });
  };

  const handleNextBoard = () => {
    sendMessage({ type: 'next_board' });
  };

  const handleResetRoom = () => {
    if (window.confirm('Czy na pewno chcesz zresetować stan pokoju do poczekalni?')) {
      sendMessage({ type: 'reset_room' });
    }
  };

  const handleClearHistory = () => {
    clearStoredScores();
    setLocalScores([]);
    sendMessage({ type: 'clear_history' });
  };

  const getVulBadge = (vul?: string) => {
    switch (vul) {
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

  const serverUrl = window.location.origin;

  return (
    <div className="flex flex-col h-screen w-screen bg-felt-dark text-slate-100 overflow-hidden font-sans">
      {/* TOP HUD BAR */}
      <header className="h-14 bg-slate-950/90 border-b border-slate-800/80 px-3 sm:px-5 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center">
            <Plane className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-tight text-white">anywhereBridge</span>
              <span className="bg-slate-800 text-amber-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700">
                {roomId}
              </span>
            </div>
            {roomState && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>Rozdanie #{roomState.boardNumber}</span>
                <span>•</span>
                <span>Rozdający: <strong className="text-slate-200">{roomState.dealer}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Center Vulnerability Status */}
        <div className="hidden md:flex items-center gap-2">
          {roomState && getVulBadge(roomState.vulnerability)}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Connection status indicator */}
          <div className="flex items-center text-xs mr-1" title={connected ? 'Połączono z serwerem pokładowym' : 'Rozłączono'}>
            {connected ? (
              <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-500" />
            )}
          </div>

          {/* Scorepad button */}
          <button
            type="button"
            onClick={() => setIsScoreOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 rounded-lg text-xs font-bold transition shadow"
            title="Otwórz protokół wyników w pamięci lokalnej"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Wyniki</span>
            {localScores.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] px-1 rounded-full font-black">
                {localScores.length}
              </span>
            )}
          </button>

          {/* QR Code button */}
          <button
            type="button"
            onClick={() => setIsQROpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-700 rounded-lg text-xs font-bold transition shadow"
            title="Kod QR dla współgraczy w samolocie"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Połącz</span>
          </button>

          {/* Kill-switch / Reset button */}
          <button
            type="button"
            onClick={handleResetRoom}
            className="p-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-lg transition"
            title="🛑 Zresetuj pokój do poczekalni"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN GAME TABLE VIEW */}
      <main className="flex-1 relative overflow-hidden">
        {roomState ? (
          <BridgeTable
            state={roomState}
            mySeat={mySeat}
            onTakeSeat={handleTakeSeat}
            onLeaveSeat={handleLeaveSeat}
            onStartGame={handleStartGame}
            onMakeBid={handleMakeBid}
            onPlayCard={handlePlayCard}
            onNextBoard={handleNextBoard}
            onResetRoom={handleResetRoom}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Łączenie z serwerem pokładowym anywhereBridge...</p>
            <p className="text-xs text-slate-500 font-mono">Pokój: {roomId}</p>
          </div>
        )}
      </main>

      {/* MODALS */}
      <ScoreModal
        isOpen={isScoreOpen}
        onClose={() => setIsScoreOpen(false)}
        scores={localScores}
        onClearHistory={handleClearHistory}
      />

      <QRModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        serverUrl={serverUrl}
        roomId={roomId}
      />
    </div>
  );
};
