import React, { useEffect, useState, useRef } from 'react';
import { RoomState, Seat, ClientMessage, ServerMessage, ScoreRecord } from './types/bridge';
import { BridgeTable } from './components/BridgeTable';
import { ScoreModal } from './components/ScoreModal';
import { QRModal } from './components/QRModal';
import { ConnectionModal } from './components/ConnectionModal';
import { PlayersModal } from './components/PlayersModal';
import { VulBadge } from './components/VulBadge';
import { ConnectingScreen } from './components/ConnectingScreen';
import { useLocalBotGame } from './hooks/useLocalBotGame';
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
import { Plane, Trophy, QrCode, RotateCcw, Wifi, WifiOff, Settings, Users, Bot } from 'lucide-react';

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
    const h = window.location.hostname;
    if (h.includes('web.app') || h.includes('firebaseapp') || h.includes('github.io')) {
      return '192.168.43.1:8080';
    }
    if (h === 'localhost' || h === '127.0.0.1') {
      return '127.0.0.1:8080';
    }
    return '';
  });

  const [mySeat, setMySeat] = useState<Seat | null>(() => getStoredSeat());
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeWsUrl, setActiveWsUrl] = useState<string>('');
  const [detectedIps, setDetectedIps] = useState<string[]>([]);

  // Modals
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isConnectionOpen, setIsConnectionOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const [localScores, setLocalScores] = useState<ScoreRecord[]>(() => getStoredScores());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Local Bot game integration
  const {
    localSession,
    isBotGame,
    ddsResult,
    ddsLoading,
    startBotGame,
    stopBotGame,
    makeBotGameBid,
    playBotGameCard,
    collectCompletedTrick,
    nextBotGameBoard,
  } = useLocalBotGame(mySeat, playerName, (record) => {
    const updated = saveScoreRecord(record);
    setLocalScores(updated);
  });

  const effectiveState = isBotGame && localSession ? localSession.state : roomState;
  const effectiveMySeat = isBotGame ? (mySeat || 'S') : mySeat;

  // Auto-detect server info (IPs) for QR code
  useEffect(() => {
    const fetchInfo = async () => {
      const endpoints = ['/api/info', 'http://127.0.0.1:8080/api/info', 'http://192.168.43.1:8080/api/info'];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep);
          if (res.ok) {
            const data = await res.json();
            if (data.serverIps && Array.isArray(data.serverIps)) {
              setDetectedIps(data.serverIps);
              break;
            }
          }
        } catch (ignored) {}
      }
    };
    fetchInfo();
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    const connectWs = () => {
      const loc = window.location;
      let targetHost = serverAddress;
      if (!targetHost) {
        if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
          targetHost = '127.0.0.1:8080';
        } else if (loc.port === '3000') {
          targetHost = `${loc.hostname}:8080`;
        } else if (loc.port) {
          targetHost = loc.host;
        } else {
          targetHost = '192.168.43.1:8080';
        }
      }
      const protocol = loc.protocol === 'https:' && !targetHost.startsWith('192.168.') && !targetHost.startsWith('10.') && !targetHost.startsWith('localhost') && !targetHost.startsWith('127.0.0.1') ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${targetHost}`;
      setActiveWsUrl(wsUrl);

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
    setMySeat(seat);
    saveStoredSeat(seat);
    if (!isBotGame) {
      sendMessage({ type: 'take_seat', seat });
    }
  };

  const handleLeaveSeat = () => {
    if (isBotGame) {
      stopBotGame();
    } else {
      sendMessage({ type: 'leave_seat' });
    }
    setMySeat(null);
    saveStoredSeat(null);
  };

  const handleStartGame = () => {
    if (isBotGame) {
      startBotGame(mySeat || 'S', 1);
    } else {
      sendMessage({ type: 'start_game' });
    }
  };

  const handleMakeBid = (bid: any) => {
    if (isBotGame) {
      makeBotGameBid(bid);
    } else {
      sendMessage({ type: 'make_bid', bid });
    }
  };

  const handlePlayCard = (cardId: string) => {
    if (isBotGame) {
      playBotGameCard(cardId);
    } else {
      sendMessage({ type: 'play_card', cardId });
    }
  };

  const handleCollectTrick = () => {
    if (isBotGame) {
      collectCompletedTrick();
    } else {
      sendMessage({ type: 'collect_trick' });
    }
  };

  const handleNextBoard = () => {
    if (isBotGame) {
      nextBotGameBoard();
    } else {
      sendMessage({ type: 'next_board' });
    }
  };

  const handleResetRoom = () => {
    if (isBotGame) {
      stopBotGame();
    } else if (window.confirm('Czy na pewno chcesz zresetować stan pokoju do poczekalni?')) {
      sendMessage({ type: 'reset_room' });
    }
  };

  const handleClearHistory = () => {
    clearStoredScores();
    setLocalScores([]);
    sendMessage({ type: 'clear_history' });
  };

  const handleUpdateConnection = (newServer: string, newRoom: string) => {
    localStorage.setItem('anywhere_bridge_server_addr', newServer);
    setServerAddress(newServer);
    if (newRoom && newRoom !== roomId) {
      setRoomId(newRoom);
      const url = new URL(window.location.href);
      url.searchParams.set('room', newRoom);
      url.searchParams.set('server', newServer);
      window.history.replaceState({}, '', url.toString());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

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
              {isBotGame && (
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="bg-indigo-950/90 border border-indigo-500/50 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <Bot className="w-3 h-3 text-indigo-400" />
                    <span>Boty (Test)</span>
                  </span>
                  <button
                    type="button"
                    onClick={stopBotGame}
                    className="text-[10px] text-slate-400 hover:text-white underline transition"
                    title="Wyjdź z gry z botami"
                  >
                    Wyjdź
                  </button>
                </div>
              )}
            </div>
            {effectiveState && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>Rozdanie #{effectiveState.boardNumber}</span>
                <span>•</span>
                <span>Rozdający: <strong className="text-slate-200">{effectiveState.dealer}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Center Vulnerability Status */}
        <div className="flex items-center gap-1 sm:gap-2">
          {effectiveState && <VulBadge vulnerability={effectiveState.vulnerability} />}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Connection status indicator / Settings */}
          <button
            type="button"
            onClick={() => setIsConnectionOpen(true)}
            className="flex items-center text-xs mr-1 p-1.5 rounded-lg hover:bg-slate-800 transition border border-slate-800"
            title={connected ? `Połączono: ${activeWsUrl} (Kliknij by zmienić)` : `Rozłączono (${activeWsUrl}) - Kliknij by skonfigurować`}
          >
            {connected ? (
              <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-500" />
            )}
          </button>

          {/* Players in room counter button */}
          {effectiveState && (
            <button
              type="button"
              onClick={() => setIsPlayersOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 rounded-lg text-xs font-bold transition shadow"
              title="Zobacz listę graczy w pokoju"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>
                {effectiveState.connectedCount !== undefined
                  ? effectiveState.connectedCount
                  : Math.max((effectiveState.connectedPlayers || []).length, Object.values(effectiveState.seats).filter(Boolean).length)}
              </span>
              <span className="hidden md:inline text-slate-400 font-normal">w pokoju</span>
            </button>
          )}

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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 rounded-lg text-xs font-bold transition shadow"
            title="Pokaż kod QR dla współgraczy w samolocie"
          >
            <QrCode className="w-4 h-4" />
            <span>Kod QR</span>
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
        {effectiveState ? (
          <BridgeTable
            state={effectiveState}
            mySeat={effectiveMySeat}
            onTakeSeat={handleTakeSeat}
            onLeaveSeat={handleLeaveSeat}
            onStartGame={handleStartGame}
            onMakeBid={handleMakeBid}
            onPlayCard={handlePlayCard}
            onCollectTrick={handleCollectTrick}
            onNextBoard={handleNextBoard}
            onResetRoom={handleResetRoom}
            onOpenQR={() => setIsQROpen(true)}
            onStartBotGame={() => startBotGame(mySeat || 'S', 1)}
            isBotGame={isBotGame}
            ddsResult={ddsResult}
            ddsLoading={ddsLoading}
          />
        ) : (
          <ConnectingScreen
            roomId={roomId}
            activeWsUrl={activeWsUrl}
            onStartBotGame={() => startBotGame(mySeat || 'S', 1)}
            onUpdateConnection={handleUpdateConnection}
            onOpenConnectionModal={() => setIsConnectionOpen(true)}
          />
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
        detectedIps={detectedIps}
        roomId={roomId}
      />

      <ConnectionModal
        isOpen={isConnectionOpen}
        onClose={() => setIsConnectionOpen(false)}
        currentServer={serverAddress}
        currentRoom={roomId}
        onSave={handleUpdateConnection}
      />

      <PlayersModal
        isOpen={isPlayersOpen}
        onClose={() => setIsPlayersOpen(false)}
        state={effectiveState}
        onOpenQR={() => setIsQROpen(true)}
      />
    </div>
  );
};
