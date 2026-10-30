import React, { useEffect, useState, useRef } from 'react';
import { RoomState, Seat, ClientMessage, ServerMessage, ScoreRecord, ChatMessage } from './types/bridge';
import { BridgeTable } from './components/BridgeTable';
import { ScoreModal } from './components/ScoreModal';
import { QRModal } from './components/QRModal';
import { ConnectionModal } from './components/ConnectionModal';
import { PlayersModal } from './components/PlayersModal';
import { TableChatModal } from './components/TableChatModal';
import { AppHeader } from './components/AppHeader';
import { ConnectingScreen } from './components/ConnectingScreen';
import { EightBoardSummary } from './components/EightBoardSummary';
import { useLocalBotGame } from './hooks/useLocalBotGame';
import { calculateDealHcp, calculateBoardImp } from './logic/impScoring';
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

const DEFAULT_ROOM_ID = 'air-737';

export const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || DEFAULT_ROOM_ID;
  });

  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [playerName, setPlayerName] = useState<string>(() => {
    const saved = getStoredPlayerName();
    const isScannedJoin = new URLSearchParams(window.location.search).has('room');
    if (saved && !saved.startsWith('Gracz_')) return saved;
    if (!isScannedJoin) {
      saveStoredPlayerName('Hey Ho Maro');
      return 'Hey Ho Maro';
    }
    if (saved) return saved;
    const defaultName = 'Gracz_' + Math.floor(Math.random() * 900 + 100);
    saveStoredPlayerName(defaultName);
    return defaultName;
  });
  const playerNameRef = useRef<string>(playerName);
  playerNameRef.current = playerName;

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(false);
  isChatOpenRef.current = isChatOpen;
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [latestChatMessage, setLatestChatMessage] = useState<ChatMessage | null>(null);
  const chatBubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerChatPopup = (msg: ChatMessage) => {
    setLatestChatMessage(msg);
    if (chatBubbleTimeoutRef.current) clearTimeout(chatBubbleTimeoutRef.current);
    chatBubbleTimeoutRef.current = setTimeout(() => {
      setLatestChatMessage(null);
      if (!isChatOpenRef.current) {
        setUnreadChatCount((prev) => prev + 1);
      }
    }, 2000);
  };
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
    undoBotGameMove,
    nextBotGameBoard,
  } = useLocalBotGame(mySeat, playerName, (record) => {
    const updated = saveScoreRecord(record);
    setLocalScores(updated);
  });

  const isBotGameRef = useRef(isBotGame);
  useEffect(() => {
    isBotGameRef.current = isBotGame;
    if (isBotGame) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (_) {}
        wsRef.current = null;
      }
      setConnected(false);
    }
  }, [isBotGame]);

  const effectiveState = isBotGame && localSession ? localSession.state : roomState;
  const effectiveMySeat = isBotGame ? (mySeat || 'S') : mySeat;

  // Auto-detect server info (IPs) for QR code
  useEffect(() => {
    ['/api/info', 'http://127.0.0.1:8080/api/info', 'http://192.168.43.1:8080/api/info'].forEach(ep => {
      fetch(ep).then(r => r.ok && r.json()).then(d => d?.serverIps && setDetectedIps(d.serverIps)).catch(() => {});
    });
  }, []);

  // Connect to WebSocket (only when in multiplayer mode)
  useEffect(() => {
    const connectWs = () => {
      if (isBotGameRef.current) return;
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
          // Send join message (server automatically restores seat by playerId or assigns first free seat N/E/S/W)
          const joinMsg: ClientMessage = {
            type: 'join',
            roomId,
            playerId,
            playerName: playerNameRef.current,
          };
          ws.send(JSON.stringify(joinMsg));
        };

        ws.onmessage = (event) => {
          try {
            const msg: ServerMessage = JSON.parse(event.data);
            if (msg.type === 'state_update') {
              if (msg.state.lastResult && msg.state.lastResult.hcpNS === undefined && msg.state.dealHands) {
                const { hcpNS, hcpEW } = calculateDealHcp(msg.state.dealHands);
                const impRes = calculateBoardImp(msg.state.lastResult.scoreNS, hcpNS, msg.state.vulnerability);
                msg.state.lastResult = {
                  ...msg.state.lastResult,
                  hcpNS, hcpEW,
                  expectedScoreNS: impRes.expectedScoreNS,
                  expectedContractDesc: impRes.expectedContractDesc,
                  impNS: impRes.impNS,
                  impEW: impRes.impEW,
                };
              }
              setRoomState(msg.state);
              setMySeat(msg.yourSeat);
              saveStoredSeat(msg.yourSeat);

              // Sync score record to localStorage if fresh result
              if (msg.state.lastResult) {
                const updated = saveScoreRecord(msg.state.lastResult);
                setLocalScores(updated);
              }
              if (msg.state.chatMessages && Array.isArray(msg.state.chatMessages)) {
                setChatMessages((prev) => {
                  const map = new Map<string, ChatMessage>();
                  prev.forEach((m) => map.set(m.id, m));
                  msg.state.chatMessages!.forEach((m) => map.set(m.id, m));
                  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
                });
              }
            } else if (msg.type === 'room_reset') {
              setMySeat(null);
              saveStoredSeat(null);
            } else if (msg.type === 'chat_message') {
              setChatMessages((prev) => (prev.some((m) => m.id === msg.message.id) ? prev : [...prev, msg.message]));
              triggerChatPopup(msg.message);
            }
          } catch (e) {
            console.error('Error handling WS message:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          wsRef.current = null;
          // Reconnect attempt after 4s (only if still in multiplayer mode)
          if (!isBotGameRef.current) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 4000);
          }
        };

        ws.onerror = () => {
          // Quietly close without alarming console spam when multiplayer host is offline
          try { ws.close(); } catch (_) {}
        };
      } catch (_) {
        if (!isBotGameRef.current) {
          reconnectTimeoutRef.current = setTimeout(connectWs, 4000);
        }
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, playerId, serverAddress]);

  const sendMessage = (msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const handleChangePlayerName = (newName: string) => {
    setPlayerName(newName);
    saveStoredPlayerName(newName);
    if (!isBotGame) {
      sendMessage({ type: 'join', roomId, playerId, playerName: newName });
    }
  };

  const handleTakeSeat = (seat: Seat) => {
    setMySeat(seat);
    saveStoredSeat(seat);
    if (!isBotGame) sendMessage({ type: 'take_seat', seat });
  };

  const handleLeaveSeat = () => {
    if (isBotGame) stopBotGame();
    else sendMessage({ type: 'leave_seat' });
    setMySeat(null);
    saveStoredSeat(null);
  };

  const handleStartGame = () => {
    if (isBotGame) {
      startBotGame(mySeat || 'S', (localScores.length % 8) + 1);
    } else {
      sendMessage({ type: 'start_game' });
    }
  };

  const handleMakeBid = (bid: any) => {
    if (isBotGame) makeBotGameBid(bid);
    else sendMessage({ type: 'make_bid', bid });
  };

  const handlePlayCard = (cardId: string) => {
    if (isBotGame) playBotGameCard(cardId);
    else sendMessage({ type: 'play_card', cardId });
  };

  const handleCollectTrick = () => {
    if (isBotGame) collectCompletedTrick();
    else sendMessage({ type: 'collect_trick' });
  };

  const handleRequestUndo = () => {
    if (isBotGame) undoBotGameMove();
    else sendMessage({ type: 'request_undo' });
  };

  const handleRespondUndo = (accept: boolean) => {
    sendMessage({ type: 'respond_undo', accept });
  };

  const handleNextBoard = () => {
    const nextBoardNum = (localScores.length % 8) + 1;
    if (isBotGame || !wsRef.current) nextBotGameBoard(nextBoardNum);
    else sendMessage({ type: 'next_board' });
  };

  const handleStartNewEight = () => {
    if (isBotGame) startBotGame(mySeat || 'S', 1);
    else sendMessage({ type: 'start_game' });
  };

  const handleResetRoom = () => {
    if (isBotGame) stopBotGame();
    else if (window.confirm('Czy na pewno chcesz zresetować stan pokoju do poczekalni?')) {
      sendMessage({ type: 'reset_room' });
    }
  };

  const handleClearHistory = () => {
    clearStoredScores();
    setLocalScores([]);
    sendMessage({ type: 'clear_history' });
  };

  const handleSendChatMessage = (text: string) => {
    const msg: ChatMessage = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderName: playerName || 'Gracz',
      senderSeat: mySeat || 'S',
      text,
      timestamp: Date.now(),
    };

    if (connected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({
        type: 'chat',
        text,
        senderName: playerName || 'Gracz',
        senderSeat: mySeat || 'S',
      });
    } else {
      setChatMessages((prev) => [...prev, msg]);
      triggerChatPopup(msg);

      if (isBotGame) {
        setTimeout(() => {
          const botReplies = [
            { seat: 'N' as Seat, name: 'Bot N', text: 'Gramy dalej! 👍' },
            { seat: 'W' as Seat, name: 'Bot W', text: 'Powodzenia przy stole! 🍀' },
            { seat: 'E' as Seat, name: 'Bot E', text: 'Dobra partia! 👏' },
          ];
          const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
          const botMsg: ChatMessage = {
            id: `c_bot_${Date.now()}`,
            senderName: reply.name,
            senderSeat: reply.seat,
            text: reply.text,
            timestamp: Date.now(),
          };
          setChatMessages((prev) => [...prev, botMsg]);
          triggerChatPopup(botMsg);
        }, 1100);
      }
    }
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
      {/* TOP HUD BAR (Hidden in Landscape during active game so play area is 100% fullscreen) */}
      <div className={effectiveState && effectiveState.phase !== 'LOBBY' ? 'landscape:hidden shrink-0' : 'shrink-0'}>
        <AppHeader
          roomId={roomId} isBotGame={isBotGame} onStopBotGame={stopBotGame}
          effectiveState={effectiveState} connected={connected} activeWsUrl={activeWsUrl}
          onOpenConnection={() => setIsConnectionOpen(true)}
          onOpenPlayers={() => setIsPlayersOpen(true)}
          onOpenScores={() => setIsScoreOpen(true)}
          localScoresCount={localScores.length}
          onOpenQR={() => setIsQROpen(true)}
          onOpenChat={() => { setIsChatOpen(true); setUnreadChatCount(0); }}
          unreadChatCount={unreadChatCount}
          onResetRoom={handleResetRoom}
        />
      </div>

      {/* MAIN GAME TABLE VIEW */}
      <main className="flex-1 relative overflow-hidden">
        {effectiveState ? (
          <BridgeTable
            state={effectiveState} mySeat={effectiveMySeat} playerName={playerName}
            onChangePlayerName={handleChangePlayerName} onTakeSeat={handleTakeSeat}
            onLeaveSeat={handleLeaveSeat} onStartGame={handleStartGame}
            onMakeBid={handleMakeBid} onPlayCard={handlePlayCard}
            onCollectTrick={handleCollectTrick} onNextBoard={handleNextBoard}
            onResetRoom={handleResetRoom} onOpenQR={() => setIsQROpen(true)}
            onOpenScores={() => setIsScoreOpen(true)}
            onOpenChat={() => { setIsChatOpen(true); setUnreadChatCount(0); setLatestChatMessage(null); }}
            unreadChatCount={unreadChatCount}
            latestChatMessage={latestChatMessage}
            onRequestUndo={handleRequestUndo} onRespondUndo={handleRespondUndo}
            onStartBotGame={() => startBotGame(mySeat || 'S', (localScores.length % 8) + 1)}
            onStartNewEight={handleStartNewEight} isBotGame={isBotGame}
            ddsResult={ddsResult} ddsLoading={ddsLoading}
          />
        ) : (
          <ConnectingScreen
            roomId={roomId}
            activeWsUrl={activeWsUrl}
            onStartBotGame={() => startBotGame(mySeat || 'S', (localScores.length % 8) + 1)}
            onUpdateConnection={handleUpdateConnection}
            onOpenConnectionModal={() => setIsConnectionOpen(true)}
          />
        )}
      </main>

      {/* MODALS */}
      <TableChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setUnreadChatCount(0);
        }}
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        mySeat={effectiveMySeat}
        myName={playerName}
      />

      <ScoreModal
        isOpen={isScoreOpen}
        onClose={() => setIsScoreOpen(false)}
        scores={localScores}
        onClearHistory={handleClearHistory}
        onStartNewEight={handleStartNewEight}
        onNextBoard={handleNextBoard}
      />

      {effectiveState?.phase === 'BOARD_RESULT' && effectiveState?.boardNumber % 8 === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <EightBoardSummary scores={localScores} onStartNewEight={handleStartNewEight} />
        </div>
      )}

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
