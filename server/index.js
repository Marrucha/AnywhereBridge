import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 8080;
const DEFAULT_ROOM_ID = 'air-737';

// -------------------------------------------------------------
// Bridge Helper Logic on Server
// -------------------------------------------------------------
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};
const SEAT_ORDER = ['N', 'E', 'S', 'W'];

const DUPLICATE_BOARDS = [
  { dealer: 'N', vulnerability: 'NONE' },
  { dealer: 'E', vulnerability: 'NS' },
  { dealer: 'S', vulnerability: 'EW' },
  { dealer: 'W', vulnerability: 'BOTH' },
  { dealer: 'N', vulnerability: 'NS' },
  { dealer: 'E', vulnerability: 'EW' },
  { dealer: 'S', vulnerability: 'BOTH' },
  { dealer: 'W', vulnerability: 'NONE' },
  { dealer: 'N', vulnerability: 'EW' },
  { dealer: 'E', vulnerability: 'BOTH' },
  { dealer: 'S', vulnerability: 'NONE' },
  { dealer: 'W', vulnerability: 'NS' },
  { dealer: 'N', vulnerability: 'BOTH' },
  { dealer: 'E', vulnerability: 'NONE' },
  { dealer: 'S', vulnerability: 'NS' },
  { dealer: 'W', vulnerability: 'EW' },
];

function nextSeat(seat) {
  const idx = SEAT_ORDER.indexOf(seat);
  return SEAT_ORDER[(idx + 1) % 4];
}

function partnerSeat(seat) {
  switch (seat) {
    case 'N': return 'S';
    case 'S': return 'N';
    case 'E': return 'W';
    case 'W': return 'E';
  }
}

function getPartnership(seat) {
  return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
}

function isSamePartnership(s1, s2) {
  return s1 === s2 || partnerSeat(s1) === s2;
}

function isSideVulnerable(side, vul) {
  if (vul === 'BOTH') return true;
  if (vul === 'NONE') return false;
  return vul === side;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortHand(cards) {
  const suitOrder = { S: 0, H: 1, D: 2, C: 3 };
  return [...cards].sort((a, b) => {
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });
}

function createAndDealDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ id: `${r}${s}`, suit: s, rank: r });
    }
  }
  const shuffled = shuffle(deck);
  return {
    N: sortHand(shuffled.slice(0, 13)),
    E: sortHand(shuffled.slice(13, 26)),
    S: sortHand(shuffled.slice(26, 39)),
    W: sortHand(shuffled.slice(39, 52)),
  };
}

function formatContract(contract) {
  const sym = { C: '♣', D: '♦', H: '♥', S: '♠', NT: 'BA' };
  const dStr = contract.doubled === 'REDOUBLED' ? 'xx' : contract.doubled === 'DOUBLED' ? 'x' : '';
  return `${contract.level}${sym[contract.suit] || contract.suit}${dStr}`;
}

function calculateScore(contract, tricksWonNS, tricksWonEW, vulnerability) {
  const side = getPartnership(contract.declarer);
  const isVul = isSideVulnerable(side, vulnerability);
  const tricksWon = side === 'NS' ? tricksWonNS : tricksWonEW;
  const required = 6 + contract.level;
  const diff = tricksWon - required;

  const isMinor = contract.suit === 'C' || contract.suit === 'D';
  const isNT = contract.suit === 'NT';
  let totalScore = 0;

  if (diff >= 0) {
    let trickBase = isMinor ? contract.level * 20 : isNT ? 40 + (contract.level - 1) * 30 : contract.level * 30;
    if (contract.doubled === 'DOUBLED') trickBase *= 2;
    if (contract.doubled === 'REDOUBLED') trickBase *= 4;
    totalScore += trickBase;

    totalScore += trickBase >= 100 ? (isVul ? 500 : 300) : 50;

    if (contract.level === 6) totalScore += isVul ? 750 : 500;
    if (contract.level === 7) totalScore += isVul ? 1500 : 1000;

    if (contract.doubled === 'DOUBLED') totalScore += 50;
    if (contract.doubled === 'REDOUBLED') totalScore += 100;

    const overtricks = diff;
    if (overtricks > 0) {
      if (contract.doubled === 'NONE') totalScore += overtricks * (isMinor ? 20 : 30);
      else if (contract.doubled === 'DOUBLED') totalScore += overtricks * (isVul ? 200 : 100);
      else if (contract.doubled === 'REDOUBLED') totalScore += overtricks * (isVul ? 400 : 200);
    }
  } else {
    const undertricks = Math.abs(diff);
    let penalty = 0;
    if (contract.doubled === 'NONE') {
      penalty = undertricks * (isVul ? 100 : 50);
    } else if (contract.doubled === 'DOUBLED') {
      if (!isVul) {
        if (undertricks >= 1) penalty += 100;
        if (undertricks >= 2) penalty += 200;
        if (undertricks >= 3) penalty += 200;
        if (undertricks > 3) penalty += (undertricks - 3) * 300;
      } else {
        if (undertricks >= 1) penalty += 200;
        if (undertricks > 1) penalty += (undertricks - 1) * 300;
      }
    } else if (contract.doubled === 'REDOUBLED') {
      if (!isVul) {
        if (undertricks >= 1) penalty += 200;
        if (undertricks >= 2) penalty += 400;
        if (undertricks >= 3) penalty += 400;
        if (undertricks > 3) penalty += (undertricks - 3) * 600;
      } else {
        if (undertricks >= 1) penalty += 400;
        if (undertricks > 1) penalty += (undertricks - 1) * 600;
      }
    }
    totalScore = -penalty;
  }

  const scoreNS = side === 'NS' ? totalScore : -totalScore;
  const scoreEW = side === 'EW' ? totalScore : -totalScore;
  const diffStr = diff === 0 ? '=' : diff > 0 ? `+${diff}` : `${diff}`;
  const cStr = formatContract(contract);
  const resultDetail = `${cStr} ${diffStr} by ${contract.declarer} (${totalScore >= 0 ? '+' : ''}${totalScore})`;

  return { totalScore, scoreNS, scoreEW, resultDetail };
}

function determineWinner(trick, trumpSuit) {
  const leadSuit = trick.cards[0].card.suit;
  let winner = trick.cards[0];

  for (let i = 1; i < trick.cards.length; i++) {
    const candidate = trick.cards[i];
    const currBest = winner.card;

    if (trumpSuit !== 'NT') {
      const cIsTrump = candidate.card.suit === trumpSuit;
      const bIsTrump = currBest.suit === trumpSuit;

      if (cIsTrump && !bIsTrump) {
        winner = candidate;
        continue;
      }
      if (cIsTrump && bIsTrump) {
        if (RANK_VALUES[candidate.card.rank] > RANK_VALUES[currBest.rank]) winner = candidate;
        continue;
      }
      if (!cIsTrump && bIsTrump) continue;
    }

    if (candidate.card.suit === leadSuit && currBest.suit === leadSuit) {
      if (RANK_VALUES[candidate.card.rank] > RANK_VALUES[currBest.rank]) winner = candidate;
    }
  }
  return winner.playedBy;
}

// -------------------------------------------------------------
// Room State Class
// -------------------------------------------------------------
class BridgeRoom {
  constructor(roomId = DEFAULT_ROOM_ID) {
    this.roomId = roomId;
    this.reset();
  }

  reset() {
    this.boardNumber = 1;
    this.setupBoard(1);
    this.phase = 'LOBBY';
    this.seats = { N: null, E: null, S: null, W: null };
    this.bids = [];
    this.currentBidder = null;
    this.contract = null;
    this.declarerSeat = null;
    this.dummySeat = null;
    this.openingLeadMade = false;
    this.currentTrick = { leadSeat: 'N', cards: [] };
    this.pastTricks = [];
    this.tricksWonNS = 0;
    this.tricksWonEW = 0;
    this.currentTurn = null;
    this.lastResult = null;
    this.history = [];
    this.hostId = null;
    this.hands = { N: [], E: [], S: [], W: [] };
  }

  setupBoard(boardNumber) {
    this.boardNumber = boardNumber;
    const idx = (boardNumber - 1) % 16;
    const setup = DUPLICATE_BOARDS[idx >= 0 ? idx : 0];
    this.dealer = setup.dealer;
    this.vulnerability = setup.vulnerability;
    this.hands = createAndDealDeck();
    this.bids = [];
    this.currentBidder = this.dealer;
    this.contract = null;
    this.declarerSeat = null;
    this.dummySeat = null;
    this.openingLeadMade = false;
    this.currentTrick = { leadSeat: 'N', cards: [] };
    this.pastTricks = [];
    this.tricksWonNS = 0;
    this.tricksWonEW = 0;
    this.currentTurn = null;
    this.lastResult = null;
  }

  startBoard() {
    this.phase = 'BIDDING';
    this.setupBoard(this.boardNumber);
  }

  nextBoard() {
    this.boardNumber += 1;
    this.setupBoard(this.boardNumber);
    this.phase = 'BIDDING';
  }
}

const rooms = new Map();
function getOrCreateRoom(roomId = DEFAULT_ROOM_ID) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new BridgeRoom(roomId));
  }
  return rooms.get(roomId);
}

// -------------------------------------------------------------
// HTTP Server (Serving singlefile & API)
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Reset API endpoint
  if (pathname === '/api/reset') {
    const roomId = url.searchParams.get('room') || DEFAULT_ROOM_ID;
    const room = getOrCreateRoom(roomId);
    room.reset();
    broadcastRoom(roomId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Room reset successfully' }));
    return;
  }

  // Network Info API
  if (pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      defaultRoom: DEFAULT_ROOM_ID,
      serverIps: getLocalIps(),
      port: PORT,
    }));
    return;
  }

  // Serve static files from dist
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(content);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h2>anywhereBridge Server running</h2><p>Build the frontend (<code>npm run build</code>) to view the client.</p>`);
  }
});

// -------------------------------------------------------------
// WebSocket Server
// -------------------------------------------------------------
const wss = new WebSocketServer({ server });
const clientSockets = new Map(); // ws -> { playerId, roomId, seat }

function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;

  // Collect connected players for this room (seated and unseated)
  const connectedPlayersMap = new Map();
  let unassignedCount = 0;
  for (const [sWs, sInfo] of clientSockets.entries()) {
    if (sInfo.roomId === roomId && sWs.readyState === WebSocket.OPEN) {
      if (sInfo.playerId) {
        if (!connectedPlayersMap.has(sInfo.playerId)) {
          connectedPlayersMap.set(sInfo.playerId, {
            id: sInfo.playerId,
            name: sInfo.playerName || 'Gracz',
            seat: sInfo.seat || null,
          });
        }
      } else {
        unassignedCount++;
      }
    }
  }
  const connectedPlayers = Array.from(connectedPlayersMap.values());
  const connectedCount = connectedPlayers.length + unassignedCount;

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clientSockets.get(client);
      if (clientInfo && clientInfo.roomId === roomId) {
        const seat = clientInfo.seat;
        // Mask hands for integrity:
        // Client receives:
        // - their own hand
        // - dummy hand ONLY if dummy is exposed (opening lead made)
        const myHand = seat && room.hands[seat] ? room.hands[seat] : [];
        const dummyHand = room.dummySeat && room.openingLeadMade ? room.hands[room.dummySeat] : null;

        const maskedState = {
          roomId: room.roomId,
          boardNumber: room.boardNumber,
          dealer: room.dealer,
          vulnerability: room.vulnerability,
          phase: room.phase,
          connectedCount,
          connectedPlayers,
          seats: room.seats,
          myHand,
          dummyHand,
          dummySeat: room.dummySeat,
          declarerSeat: room.declarerSeat,
          openingLeadMade: room.openingLeadMade,
          bids: room.bids,
          currentBidder: room.currentBidder,
          contract: room.contract,
          currentTrick: room.currentTrick,
          pastTricks: room.pastTricks,
          tricksWonNS: room.tricksWonNS,
          tricksWonEW: room.tricksWonEW,
          currentTurn: room.currentTurn,
          lastResult: room.lastResult,
          history: room.history,
          hostId: room.hostId,
        };

        client.send(JSON.stringify({
          type: 'state_update',
          state: maskedState,
          yourSeat: seat,
        }));
      }
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (msgStr) => {
    try {
      const msg = JSON.parse(msgStr);
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Invalid message received:', e);
    }
  });

  ws.on('close', () => {
    const info = clientSockets.get(ws);
    if (info) {
      clientSockets.delete(ws);
      const room = rooms.get(info.roomId);
      if (room && info.seat && room.seats[info.seat]?.id === info.playerId) {
        room.seats[info.seat].connected = false;
      }
      broadcastRoom(info.roomId);
    }
  });
});

function handleMessage(ws, msg) {
  let info = clientSockets.get(ws);
  if (msg.type === '__bot_bid') {
    info = { roomId: msg.roomId, seat: msg.seat };
    msg = { type: 'make_bid', bid: msg.bid };
  }

  if (msg.type === 'join') {
    const roomId = msg.roomId || DEFAULT_ROOM_ID;
    const room = getOrCreateRoom(roomId);
    if (!room.hostId) room.hostId = msg.playerId;

    // Check if player had a seat
    let seat = null;
    for (const s of SEAT_ORDER) {
      if (room.seats[s]?.id === msg.playerId) {
        seat = s;
        room.seats[s].connected = true;
        if (msg.playerName) room.seats[s].name = msg.playerName;
        break;
      }
    }

    clientSockets.set(ws, { playerId: msg.playerId, playerName: msg.playerName, roomId, seat });
    broadcastRoom(roomId);
    return;
  }

  if (!info) return;
  const room = rooms.get(info.roomId);
  if (!room) return;

  if (msg.type === 'take_seat') {
    const targetSeat = msg.seat;
    if (SEAT_ORDER.includes(targetSeat) && !room.seats[targetSeat]) {
      // Clear previous seat if any
      if (info.seat) room.seats[info.seat] = null;
      room.seats[targetSeat] = { id: info.playerId, name: info.playerName, connected: true };
      info.seat = targetSeat;
      clientSockets.set(ws, info);
      broadcastRoom(info.roomId);
    }
    return;
  }

  if (msg.type === 'leave_seat') {
    if (info.seat && room.phase === 'LOBBY') {
      room.seats[info.seat] = null;
      info.seat = null;
      clientSockets.set(ws, info);
      broadcastRoom(info.roomId);
    }
    return;
  }

  if (msg.type === 'start_game') {
    const seatedCount = SEAT_ORDER.filter(s => room.seats[s] !== null).length;
    if (seatedCount >= 1) {
      for (const s of SEAT_ORDER) {
        if (!room.seats[s]) {
          room.seats[s] = { id: `bot_${s}`, name: `Bot ${s}`, connected: true, isBot: true };
        }
      }
      room.startBoard();
      broadcastRoom(info.roomId);
      scheduleBotTurn(info.roomId);
    }
    return;
  }

  if (msg.type === 'chat') {
    const chatMsg = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderName: msg.senderName || info.playerName || 'Gracz',
      senderSeat: msg.senderSeat || info.seat || 'S',
      text: msg.text || '',
      timestamp: Date.now(),
    };
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        const cInfo = clientSockets.get(client);
        if (cInfo && cInfo.roomId === info.roomId) {
          client.send(JSON.stringify({ type: 'chat_message', message: chatMsg }));
        }
      }
    });
    return;
  }

  if (msg.type === 'make_bid') {
    if (room.phase !== 'BIDDING' || room.currentBidder !== info.seat) return;
    const bid = { ...msg.bid, bidder: info.seat };
    room.bids.push(bid);

    // Check auction completion
    if (room.bids.length === 4 && room.bids.every(b => b.type === 'PASS')) {
      // All pass!
      room.lastResult = {
        id: `b_${Date.now()}`,
        boardNumber: room.boardNumber,
        dealer: room.dealer,
        vulnerability: room.vulnerability,
        contractStr: 'PAS',
        declarer: room.dealer,
        tricksWonNS: 0,
        tricksWonEW: 0,
        scoreNS: 0,
        scoreEW: 0,
        resultDetail: '4x PAS (Rozdanie pasowe, 0 pkt)',
        timestamp: Date.now(),
      };
      room.history.unshift(room.lastResult);
      room.phase = 'BOARD_RESULT';
      broadcastRoom(info.roomId);
      return;
    }

    if (room.bids.length >= 4) {
      const last3 = room.bids.slice(-3);
      if (last3.every(b => b.type === 'PASS')) {
        // Auction completed! Determine contract
        let lastMeaningful = null;
        for (let i = room.bids.length - 4; i >= 0; i--) {
          if (room.bids[i].type === 'BID') {
            lastMeaningful = room.bids[i];
            break;
          }
        }

        if (lastMeaningful) {
          let doubled = 'NONE';
          for (let i = room.bids.length - 4; i >= 0; i--) {
            if (room.bids[i].type === 'REDOUBLE') { doubled = 'REDOUBLED'; break; }
            if (room.bids[i].type === 'DOUBLE') { doubled = 'DOUBLED'; break; }
            if (room.bids[i].type === 'BID') break;
          }

          const winningSide = getPartnership(lastMeaningful.bidder);
          const winningSuit = lastMeaningful.suit;

          let declarer = lastMeaningful.bidder;
          for (const b of room.bids) {
            if (b.type === 'BID' && b.suit === winningSuit && getPartnership(b.bidder) === winningSide) {
              declarer = b.bidder;
              break;
            }
          }

          // Human Declarer Priority: if declarer is a bot and dummy is a human, swap so human plays both hands
          const decInfo = room.seats[declarer];
          const dumSeat = partnerSeat(declarer);
          const dumInfo = room.seats[dumSeat];
          if (decInfo?.isBot && dumInfo && !dumInfo.isBot) {
            declarer = dumSeat;
          }

          room.contract = {
            level: lastMeaningful.level,
            suit: winningSuit,
            doubled,
            declarer,
          };
          room.declarerSeat = declarer;
          room.dummySeat = partnerSeat(declarer);
          const openingLeader = nextSeat(declarer);
          room.currentTurn = openingLeader;
          room.currentTrick = { leadSeat: openingLeader, cards: [] };
          room.phase = 'PLAYING';
          room.openingLeadMade = false;

          broadcastRoom(info.roomId);
          scheduleBotTurn(info.roomId);
          return;
        }
      }
    }

    // Next bidder
    room.currentBidder = nextSeat(room.currentBidder);
    broadcastRoom(info.roomId);
    scheduleBotTurn(info.roomId);
    return;
  }

  if (msg.type === 'play_card') {
    if (room.phase !== 'PLAYING') return;

    // If a 4-card trick is waiting to be collected, collect it first
    if (room.currentTrick && room.currentTrick.cards.length === 4) {
      collectRoomTrick(room);
      if (room.phase !== 'PLAYING') {
        broadcastRoom(info.roomId);
        return;
      }
    }

    // Check if player is allowed to play:
    // It's their own turn, OR they are declarer playing dummy's card on dummy's turn!
    const isMyTurn = room.currentTurn === info.seat;
    const isDummyTurn = room.currentTurn === room.dummySeat && room.declarerSeat === info.seat;

    if (!isMyTurn && !isDummyTurn) return;

    const activeSeat = isDummyTurn ? room.dummySeat : info.seat;
    const activeHand = room.hands[activeSeat];
    const cardIndex = activeHand.findIndex(c => c.id === msg.cardId);

    if (cardIndex === -1) return;
    const playedCard = activeHand[cardIndex];

    // Remove card from hand
    activeHand.splice(cardIndex, 1);
    room.currentTrick.cards.push({ card: playedCard, playedBy: activeSeat });

    // If opening lead was played, dummy's hand is exposed!
    if (!room.openingLeadMade) {
      room.openingLeadMade = true;
    }

    // Check if trick completed (4 cards)
    if (room.currentTrick.cards.length === 4) {
      const winnerSeat = determineWinner(room.currentTrick, room.contract.suit);
      room.currentTrick.winnerSeat = winnerSeat;
      room.pastTricks.push({ ...room.currentTrick });

      if (winnerSeat === 'N' || winnerSeat === 'S') room.tricksWonNS += 1;
      else room.tricksWonEW += 1;

      // Broadcast trick completed with 4 cards visible
      broadcastRoom(info.roomId);
      scheduleBotTurn(info.roomId);
      return;
    }

    // Advance to next player
    room.currentTurn = nextSeat(room.currentTurn);
    broadcastRoom(info.roomId);
    scheduleBotTurn(info.roomId);
    return;
  }

  if (msg.type === 'collect_trick') {
    if (room.phase === 'PLAYING' && room.currentTrick && room.currentTrick.cards.length === 4) {
      collectRoomTrick(room);
      broadcastRoom(info.roomId);
      scheduleBotTurn(info.roomId);
    }
    return;
  }

  if (msg.type === 'next_board') {
    room.nextBoard();
    broadcastRoom(info.roomId);
    scheduleBotTurn(info.roomId);
    return;
  }

  if (msg.type === 'reset_room') {
    room.reset();
    broadcastRoom(info.roomId);
    return;
  }

  if (msg.type === 'clear_history') {
    room.history = [];
    broadcastRoom(info.roomId);
    return;
  }
}

function collectRoomTrick(room) {
  if (room.phase !== 'PLAYING' || !room.currentTrick || room.currentTrick.cards.length !== 4) return;
  const winnerSeat = room.currentTrick.winnerSeat || determineWinner(room.currentTrick, room.contract.suit);
  if (room.pastTricks.length === 13) {
    const score = calculateScore(room.contract, room.tricksWonNS, room.tricksWonEW, room.vulnerability);
    room.lastResult = {
      id: `b_${Date.now()}`,
      boardNumber: room.boardNumber,
      dealer: room.dealer,
      vulnerability: room.vulnerability,
      contractStr: formatContract(room.contract),
      declarer: room.contract.declarer,
      tricksWonNS: room.tricksWonNS,
      tricksWonEW: room.tricksWonEW,
      scoreNS: score.scoreNS,
      scoreEW: score.scoreEW,
      resultDetail: score.resultDetail,
      timestamp: Date.now(),
    };
    room.history.unshift(room.lastResult);
    room.phase = 'BOARD_RESULT';
  } else {
    room.currentTurn = winnerSeat;
    room.currentTrick = { leadSeat: winnerSeat, cards: [] };
  }
}

function scheduleBotTurn(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.botTimeout) clearTimeout(room.botTimeout);

  if (room.phase === 'PLAYING' && room.currentTrick && room.currentTrick.cards.length === 4) {
    room.botTimeout = setTimeout(() => {
      if (room.phase === 'PLAYING' && room.currentTrick && room.currentTrick.cards.length === 4) {
        collectRoomTrick(room);
        broadcastRoom(roomId);
        scheduleBotTurn(roomId);
      }
    }, 1150);
    return;
  }

  if (room.phase === 'BIDDING' && room.currentBidder) {
    const seatInfo = room.seats[room.currentBidder];
    if (seatInfo?.isBot) {
      room.botTimeout = setTimeout(() => {
        if (room.phase !== 'BIDDING' || !room.seats[room.currentBidder]?.isBot) return;
        const bidder = room.currentBidder;
        const hand = room.hands[bidder] || [];
        let hcp = 0;
        const counts = { S: 0, H: 0, D: 0, C: 0 };
        for (const c of hand) {
          counts[c.suit] = (counts[c.suit] || 0) + 1;
          if (c.rank === 'A') hcp += 4;
          else if (c.rank === 'K') hcp += 3;
          else if (c.rank === 'Q') hcp += 2;
          else if (c.rank === 'J') hcp += 1;
        }
        let bid = { type: 'PASS' };
        const hasBid = room.bids.some(b => b.type === 'BID');
        if (!hasBid && hcp >= 12) {
          let bestSuit = 'C', bestCount = 0;
          for (const st of ['S', 'H', 'D', 'C']) {
            if (counts[st] > bestCount) { bestCount = counts[st]; bestSuit = st; }
          }
          if (hcp >= 15 && hcp <= 17 && bestCount <= 5) bid = { type: 'BID', level: 1, suit: 'NT' };
          else bid = { type: 'BID', level: 1, suit: bestCount >= 5 ? bestSuit : 'C' };
        }
        handleMessage({ readyState: WebSocket.OPEN }, { type: '__bot_bid', roomId, seat: bidder, bid });
      }, 650);
    }
    return;
  }

  if (room.phase === 'PLAYING' && room.currentTurn) {
    const activeSeat = room.currentTurn;
    const controllerSeat = activeSeat === room.dummySeat ? room.declarerSeat : activeSeat;
    if (room.seats[controllerSeat]?.isBot) {
      room.botTimeout = setTimeout(() => {
        if (room.phase !== 'PLAYING' || room.currentTrick.cards.length >= 4) return;
        const hand = room.hands[activeSeat] || [];
        if (hand.length === 0) return;
        const leadSuit = room.currentTrick.cards.length > 0 ? room.currentTrick.cards[0].card.suit : null;
        const inSuit = leadSuit ? hand.filter(c => c.suit === leadSuit) : [];
        const chosen = inSuit.length > 0 ? inSuit[inSuit.length - 1] : hand[hand.length - 1];
        // Directly play card for bot
        const idx = hand.findIndex(c => c.id === chosen.id);
        if (idx === -1) return;
        const playedCard = hand.splice(idx, 1)[0];
        room.currentTrick.cards.push({ card: playedCard, playedBy: activeSeat });
        if (!room.openingLeadMade) room.openingLeadMade = true;
        if (room.currentTrick.cards.length === 4) {
          const winnerSeat = determineWinner(room.currentTrick, room.contract.suit);
          room.currentTrick.winnerSeat = winnerSeat;
          room.pastTricks.push({ ...room.currentTrick });
          if (winnerSeat === 'N' || winnerSeat === 'S') room.tricksWonNS += 1;
          else room.tricksWonEW += 1;
        } else {
          room.currentTurn = nextSeat(room.currentTurn);
        }
        broadcastRoom(roomId);
        scheduleBotTurn(roomId);
      }, 650);
    }
  }
}

function getLocalIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIps();
  console.log(`=======================================================`);
  console.log(`✈️  anywhereBridge Offline Server Started on Port ${PORT}`);
  console.log(`   Default Room: ${DEFAULT_ROOM_ID}`);
  console.log(`   Local URL:    http://localhost:${PORT}?room=${DEFAULT_ROOM_ID}`);
  ips.forEach(ip => {
    console.log(`   Hotspot URL:  http://${ip}:${PORT}?room=${DEFAULT_ROOM_ID}`);
  });
  console.log(`=======================================================`);
});
