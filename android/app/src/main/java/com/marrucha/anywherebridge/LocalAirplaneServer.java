package com.marrucha.anywherebridge;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

public class LocalAirplaneServer extends NanoWSD {
    private static final String TAG = "AnywhereBridgeServer";
    public static final int PORT = 8080;
    public static final String DEFAULT_ROOM_ID = "air-737";
    private static final String STATE_FILE_NAME = "airplane_room_state.json";

    private final Context context;
    private final Set<BridgeWebSocket> allSockets = ConcurrentHashMap.newKeySet();

    // Game state
    private String roomId = DEFAULT_ROOM_ID;
    private int boardNumber = 1;
    private String dealer = "N";
    private String vulnerability = "NONE";
    private String phase = "LOBBY"; // LOBBY, BIDDING, PLAYING, BOARD_RESULT

    private final Map<String, JSONObject> seats = new HashMap<>(); // N, E, S, W -> { id, name, connected, isBot }
    private final Map<String, List<String>> hands = new HashMap<>(); // N, E, S, W -> List of card IDs
    private final Map<String, List<String>> dealHands = new HashMap<>(); // N, E, S, W -> Original 13 card IDs
    private final ScheduledExecutorService botExecutor = Executors.newSingleThreadScheduledExecutor();
    private ScheduledFuture<?> pendingBotFuture = null;

    private final List<JSONObject> bids = new ArrayList<>();
    private String currentBidder = null;
    private JSONObject contract = null; // { level, suit, doubled, declarer }
    private String declarerSeat = null;
    private String dummySeat = null;
    private boolean openingLeadMade = false;

    private JSONObject currentTrick = new JSONObject();
    private final List<JSONObject> pastTricks = new ArrayList<>();
    private int tricksWonNS = 0;
    private int tricksWonEW = 0;
    private String currentTurn = null;

    private JSONObject lastResult = null;
    private final List<JSONObject> history = new ArrayList<>();
    private String hostId = null;
    private JSONObject undoRequest = null;
    private String undoNotice = null;

    // Constants
    private static final String[] SEATS = {"N", "E", "S", "W"};
    private static final String[] SUITS = {"S", "H", "D", "C"};
    private static final String[] RANKS = {"2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"};
    private static final Map<String, Integer> RANK_VALUES = new HashMap<>();

    static {
        RANK_VALUES.put("2", 2);
        RANK_VALUES.put("3", 3);
        RANK_VALUES.put("4", 4);
        RANK_VALUES.put("5", 5);
        RANK_VALUES.put("6", 6);
        RANK_VALUES.put("7", 7);
        RANK_VALUES.put("8", 8);
        RANK_VALUES.put("9", 9);
        RANK_VALUES.put("T", 10);
        RANK_VALUES.put("J", 11);
        RANK_VALUES.put("Q", 12);
        RANK_VALUES.put("K", 13);
        RANK_VALUES.put("A", 14);
    }

    private static final String[][] DUPLICATE_BOARDS = {
            {"N", "NONE"}, {"E", "NS"}, {"S", "EW"}, {"W", "BOTH"},
            {"N", "NS"}, {"E", "EW"}, {"S", "BOTH"}, {"W", "NONE"},
            {"N", "EW"}, {"E", "BOTH"}, {"S", "NONE"}, {"W", "NS"},
            {"N", "BOTH"}, {"E", "NONE"}, {"S", "NS"}, {"W", "EW"}
    };

    public LocalAirplaneServer(Context context) {
        super(PORT);
        this.context = context;
        initSeats();
        setupBoard(1);
        loadState();
    }

    private void initSeats() {
        for (String s : SEATS) {
            seats.put(s, null);
            hands.put(s, new ArrayList<>());
            dealHands.put(s, new ArrayList<>());
        }
    }

    private void setupBoard(int boardNum) {
        this.boardNumber = boardNum;
        int idx = (boardNum - 1) % 16;
        if (idx < 0) idx = 0;
        this.dealer = DUPLICATE_BOARDS[idx][0];
        this.vulnerability = DUPLICATE_BOARDS[idx][1];

        dealDeck();
        bids.clear();
        currentBidder = dealer;
        contract = null;
        declarerSeat = null;
        dummySeat = null;
        openingLeadMade = false;

        currentTrick = new JSONObject();
        try {
            currentTrick.put("leadSeat", "N");
            currentTrick.put("cards", new JSONArray());
        } catch (Exception ignored) {}

        pastTricks.clear();
        tricksWonNS = 0;
        tricksWonEW = 0;
        currentTurn = null;
        lastResult = null;
        undoRequest = null;
        undoNotice = null;
    }

    private void dealDeck() {
        List<String> deck = new ArrayList<>();
        for (String s : SUITS) {
            for (String r : RANKS) {
                deck.add(r + s);
            }
        }
        Collections.shuffle(deck);

        hands.get("N").clear();
        hands.get("E").clear();
        hands.get("S").clear();
        hands.get("W").clear();
        dealHands.get("N").clear();
        dealHands.get("E").clear();
        dealHands.get("S").clear();
        dealHands.get("W").clear();

        hands.get("N").addAll(sortHand(deck.subList(0, 13)));
        hands.get("E").addAll(sortHand(deck.subList(13, 26)));
        hands.get("S").addAll(sortHand(deck.subList(26, 39)));
        hands.get("W").addAll(sortHand(deck.subList(39, 52)));

        dealHands.get("N").addAll(hands.get("N"));
        dealHands.get("E").addAll(hands.get("E"));
        dealHands.get("S").addAll(hands.get("S"));
        dealHands.get("W").addAll(hands.get("W"));
    }

    private List<String> sortHand(List<String> cards) {
        List<String> sorted = new ArrayList<>(cards);
        Map<Character, Integer> suitOrder = new HashMap<>();
        suitOrder.put('S', 0);
        suitOrder.put('H', 1);
        suitOrder.put('C', 2);
        suitOrder.put('D', 3);

        sorted.sort((a, b) -> {
            char suitA = a.charAt(1);
            char suitB = b.charAt(1);
            if (suitA != suitB) {
                return suitOrder.get(suitA) - suitOrder.get(suitB);
            }
            String rankA = String.valueOf(a.charAt(0));
            String rankB = String.valueOf(b.charAt(0));
            return RANK_VALUES.get(rankB) - RANK_VALUES.get(rankA);
        });
        return sorted;
    }

    private static String nextSeat(String seat) {
        switch (seat) {
            case "N": return "E";
            case "E": return "S";
            case "S": return "W";
            default: return "N";
        }
    }

    private static String partnerSeat(String seat) {
        switch (seat) {
            case "N": return "S";
            case "S": return "N";
            case "E": return "W";
            default: return "E";
        }
    }

    private static String getPartnership(String seat) {
        return ("N".equals(seat) || "S".equals(seat)) ? "NS" : "EW";
    }

    private static boolean isSideVulnerable(String side, String vul) {
        if ("BOTH".equals(vul)) return true;
        if ("NONE".equals(vul)) return false;
        return side.equals(vul);
    }

    // -------------------------------------------------------------
    // HTTP Handling (Serving assets & APIs)
    // -------------------------------------------------------------
    @Override
    public Response serve(IHTTPSession session) {
        // Delegate WebSocket upgrade requests to NanoWSD
        Map<String, String> headers = session.getHeaders();
        if (isWebsocketRequested(session) || "websocket".equalsIgnoreCase(headers.get("upgrade"))) {
            return super.serve(session);
        }

        // Strip query string
        String uri = session.getUri();
        if (uri.contains("?")) {
            uri = uri.substring(0, uri.indexOf('?'));
        }

        // Handle CORS preflight
        if (Method.OPTIONS.equals(session.getMethod())) {
            Response res = newFixedLengthResponse(Response.Status.OK, "text/plain", "");
            addCorsHeaders(res);
            return res;
        }

        // Reset API
        if ("/api/reset".equals(uri)) {
            resetRoom();
            Response res = newFixedLengthResponse(Response.Status.OK, "application/json", "{\"success\":true}");
            addCorsHeaders(res);
            return res;
        }

        // Info API
        if ("/api/info".equals(uri)) {
            JSONObject info = new JSONObject();
            try {
                info.put("defaultRoom", DEFAULT_ROOM_ID);
                info.put("port", PORT);
                JSONArray ips = new JSONArray();
                for (String ip : getLocalIps()) {
                    ips.put(ip);
                }
                info.put("serverIps", ips);
            } catch (Exception ignored) {}
            Response res = newFixedLengthResponse(Response.Status.OK, "application/json", info.toString());
            addCorsHeaders(res);
            return res;
        }

        // Static Asset Serving from Android Assets (public/ or web/)
        if ("/".equals(uri) || uri.isEmpty()) {
            uri = "/index.html";
        }

        try {
            String assetPath = "public" + uri;
            InputStream is = null;
            try {
                is = context.getAssets().open(assetPath);
            } catch (Exception e) {
                // Fallback to index.html for SPA
                assetPath = "public/index.html";
                is = context.getAssets().open(assetPath);
            }

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[8192];
            int nRead;
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            buffer.flush();
            byte[] fileBytes = buffer.toByteArray();
            is.close();

            String mime = resolveMimeType(assetPath);
            Response res = newFixedLengthResponse(Response.Status.OK, mime, new ByteArrayInputStream(fileBytes), fileBytes.length);
            addCorsHeaders(res);
            res.addHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            return res;
        } catch (Exception e) {
            Log.e(TAG, "Error serving asset: " + uri, e);
            Response res = newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "File not found");
            addCorsHeaders(res);
            return res;
        }
    }

    private void addCorsHeaders(Response response) {
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.addHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    private String resolveMimeType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        return "application/octet-stream";
    }

    // -------------------------------------------------------------
    // WebSocket Handling
    // -------------------------------------------------------------
    @Override
    protected WebSocket openWebSocket(IHTTPSession handshake) {
        return new BridgeWebSocket(handshake);
    }

    private class BridgeWebSocket extends WebSocket {
        private String playerId = null;
        private String playerName = null;
        private String seat = null;

        public BridgeWebSocket(IHTTPSession handshakeRequest) {
            super(handshakeRequest);
        }

        @Override
        protected void onOpen() {
            allSockets.add(this);
            Log.d(TAG, "WebSocket opened. Total sockets: " + allSockets.size());
        }

        @Override
        protected void onClose(NanoWSD.WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
            allSockets.remove(this);
            if (seat != null && seats.get(seat) != null) {
                try {
                    seats.get(seat).put("connected", false);
                } catch (Exception ignored) {}
            }
            broadcastState();
            Log.d(TAG, "WebSocket closed. Total sockets: " + allSockets.size());
        }

        @Override
        protected void onMessage(NanoWSD.WebSocketFrame message) {
            try {
                String payload = message.getTextPayload();
                JSONObject json = new JSONObject(payload);
                handleClientMessage(this, json);
            } catch (Exception e) {
                Log.e(TAG, "Error handling WS message", e);
            }
        }

        @Override
        protected void onPong(NanoWSD.WebSocketFrame pong) {}

        @Override
        protected void onException(java.io.IOException exception) {
            Log.e(TAG, "WebSocket exception", exception);
        }
    }

    private synchronized void handleClientMessage(BridgeWebSocket ws, JSONObject msg) {
        try {
            String type = msg.optString("type");

            if ("join".equals(type)) {
                ws.playerId = msg.optString("playerId");
                ws.playerName = msg.optString("playerName");
                if (hostId == null) hostId = ws.playerId;

                for (String s : SEATS) {
                    JSONObject seatInfo = seats.get(s);
                    if (seatInfo != null && ws.playerId.equals(seatInfo.optString("id"))) {
                        ws.seat = s;
                        seatInfo.put("connected", true);
                        if (ws.playerName != null && !ws.playerName.isEmpty()) {
                            seatInfo.put("name", ws.playerName);
                        }
                        break;
                    }
                }
                broadcastState();
                return;
            }

            if ("take_seat".equals(type)) {
                String targetSeat = msg.optString("seat");
                JSONObject existing = seats.get(targetSeat);
                boolean canTake = existing == null || existing.optBoolean("isBot", false);
                if (Arrays.asList(SEATS).contains(targetSeat) && canTake) {
                    if (ws.seat != null) seats.put(ws.seat, null);
                    JSONObject pObj = new JSONObject();
                    pObj.put("id", ws.playerId);
                    pObj.put("name", ws.playerName);
                    pObj.put("connected", true);
                    pObj.put("isBot", false);
                    seats.put(targetSeat, pObj);
                    ws.seat = targetSeat;
                    broadcastState();
                    scheduleBotActionIfNeeded();
                }
                return;
            }

            if ("leave_seat".equals(type)) {
                if (ws.seat != null && "LOBBY".equals(phase)) {
                    seats.put(ws.seat, null);
                    ws.seat = null;
                    broadcastState();
                }
                return;
            }

            if ("start_game".equals(type)) {
                // Fill any empty seats with Bots so 1, 2, 3, or 4 human players can play together!
                for (String s : SEATS) {
                    if (seats.get(s) == null) {
                        JSONObject botObj = new JSONObject();
                        botObj.put("id", "bot_" + s);
                        botObj.put("name", "🤖 Bot " + s);
                        botObj.put("connected", true);
                        botObj.put("isBot", true);
                        seats.put(s, botObj);
                    }
                }
                setupBoard(boardNumber);
                phase = "BIDDING";
                broadcastState();
                scheduleBotActionIfNeeded();
                return;
            }

            if ("make_bid".equals(type)) {
                if (undoRequest != null) return;
                if (!"BIDDING".equals(phase) || ws.seat == null || !ws.seat.equals(currentBidder)) return;
                JSONObject bidData = msg.optJSONObject("bid");
                if (bidData == null) return;
                undoNotice = null;
                processBidInternal(ws.seat, bidData);
                return;
            }

            if ("play_card".equals(type)) {
                if (undoRequest != null) return;
                if (!"PLAYING".equals(phase) || ws.seat == null) return;
                undoNotice = null;

                // If 4 cards from previous trick are still on table, collect trick immediately first!
                JSONArray existingCards = currentTrick.optJSONArray("cards");
                if (existingCards != null && existingCards.length() == 4) {
                    collectCompletedTrickInternal(false);
                    if (!"PLAYING".equals(phase)) return;
                }

                boolean isMyTurn = ws.seat.equals(currentTurn);
                boolean isDummyTurn = dummySeat != null && dummySeat.equals(currentTurn)
                        && (ws.seat.equals(declarerSeat) || ws.seat.equals(dummySeat));
                if (!isMyTurn && !isDummyTurn) return;

                String activeSeat = isDummyTurn ? dummySeat : ws.seat;
                String cardId = msg.optString("cardId");
                processPlayCardInternal(activeSeat, cardId);
                return;
            }

            if ("collect_trick".equals(type)) {
                if (undoRequest != null) return;
                collectCompletedTrickInternal(true);
                return;
            }

            if ("request_undo".equals(type)) {
                if (ws.seat == null || undoRequest != null) return;
                boolean canUndo = false;
                if ("BIDDING".equals(phase) && !bids.isEmpty()) canUndo = true;
                else if ("PLAYING".equals(phase)) {
                    JSONArray cArr = currentTrick != null ? currentTrick.optJSONArray("cards") : null;
                    if ((cArr != null && cArr.length() > 0) || !pastTricks.isEmpty()) canUndo = true;
                }
                if (!canUndo) return;

                if (pendingBotFuture != null) {
                    pendingBotFuture.cancel(false);
                    pendingBotFuture = null;
                }

                // Check if both opponents of requester are bots
                String opp1 = nextSeat(ws.seat);
                String opp2 = nextSeat(partnerSeat(ws.seat));
                if (isSeatBot(opp1) && isSeatBot(opp2)) {
                    performUndoInternal();
                    undoNotice = "✅ Cofnięto ostatni ruch / kartę.";
                    broadcastState();
                    scheduleBotActionIfNeeded();
                } else {
                    undoRequest = new JSONObject();
                    undoRequest.put("requesterSeat", ws.seat);
                    undoRequest.put("requesterName", ws.playerName != null ? ws.playerName : ws.seat);
                    undoNotice = null;
                    broadcastState();
                }
                return;
            }

            if ("respond_undo".equals(type)) {
                if (ws.seat == null || undoRequest == null) return;
                String reqSeat = undoRequest.optString("requesterSeat");
                if (getPartnership(ws.seat).equals(getPartnership(reqSeat))) return; // Only opponents can decide

                boolean accept = msg.optBoolean("accept", false);
                undoRequest = null;
                if (accept) {
                    performUndoInternal();
                    undoNotice = "✅ Cofnięto ruch (zaakceptowano).";
                } else {
                    undoNotice = "❌ Prośba o cofnięcie została odrzucona.";
                }
                broadcastState();
                scheduleBotActionIfNeeded();
                return;
            }

            if ("next_board".equals(type)) {
                int nextNum = (boardNumber % 8) + 1;
                setupBoard(nextNum);
                phase = "BIDDING";
                broadcastState();
                scheduleBotActionIfNeeded();
                return;
            }

            if ("reset_room".equals(type)) {
                resetRoom();
                return;
            }

            if ("clear_history".equals(type)) {
                history.clear();
                broadcastState();
                return;
            }

            if ("chat".equals(type)) {
                String text = msg.optString("text", "").trim();
                if (!text.isEmpty()) {
                    String senderName = (ws.playerName != null && !ws.playerName.isEmpty()) ? ws.playerName : msg.optString("senderName", "Gracz");
                    String senderSeat = ws.seat != null ? ws.seat : msg.optString("senderSeat", "");
                    JSONObject chatMsg = new JSONObject();
                    chatMsg.put("id", "c_" + System.currentTimeMillis() + "_" + Math.round(Math.random() * 1000));
                    chatMsg.put("senderName", senderName);
                    chatMsg.put("senderSeat", senderSeat);
                    chatMsg.put("text", text);
                    chatMsg.put("timestamp", System.currentTimeMillis());

                    JSONObject broadcastObj = new JSONObject();
                    broadcastObj.put("type", "chat_message");
                    broadcastObj.put("message", chatMsg);

                    for (BridgeWebSocket client : allSockets) {
                        try {
                            client.send(broadcastObj.toString());
                        } catch (Exception ignored) {}
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing client message", e);
        }
    }

    private boolean isSeatBot(String seat) {
        if (seat == null) return false;
        JSONObject sObj = seats.get(seat);
        return sObj != null && sObj.optBoolean("isBot", false);
    }

    private synchronized void processBidInternal(String bidderSeat, JSONObject bidData) {
        try {
            if (!"BIDDING".equals(phase) || !bidderSeat.equals(currentBidder)) return;
            JSONObject bidObj = new JSONObject(bidData.toString());
            bidObj.put("bidder", bidderSeat);
            bids.add(bidObj);

            // Check 4 passes
            if (bids.size() == 4) {
                boolean allPass = true;
                for (JSONObject b : bids) {
                    if (!"PASS".equals(b.optString("type"))) { allPass = false; break; }
                }
                if (allPass) {
                    lastResult = new JSONObject();
                    lastResult.put("id", "b_" + System.currentTimeMillis());
                    lastResult.put("boardNumber", boardNumber);
                    lastResult.put("dealer", dealer);
                    lastResult.put("vulnerability", vulnerability);
                    lastResult.put("contractStr", "PAS");
                    lastResult.put("declarer", dealer);
                    lastResult.put("tricksWonNS", 0);
                    lastResult.put("tricksWonEW", 0);
                    lastResult.put("scoreNS", 0);
                    lastResult.put("scoreEW", 0);
                    enrichResultWithHcpAndImp(lastResult, 0, vulnerability, "4x PAS (0 pkt)");
                    lastResult.put("timestamp", System.currentTimeMillis());
                    history.add(0, lastResult);
                    phase = "BOARD_RESULT";
                    broadcastState();
                    return;
                }
            }

            // Check 3 consecutive passes
            if (bids.size() >= 4) {
                boolean last3Pass = true;
                for (int i = bids.size() - 3; i < bids.size(); i++) {
                    if (!"PASS".equals(bids.get(i).optString("type"))) { last3Pass = false; break; }
                }

                if (last3Pass) {
                    JSONObject lastMeaningful = null;
                    for (int i = bids.size() - 4; i >= 0; i--) {
                        if ("BID".equals(bids.get(i).optString("type"))) {
                            lastMeaningful = bids.get(i);
                            break;
                        }
                    }

                    if (lastMeaningful != null) {
                        String doubled = "NONE";
                        for (int i = bids.size() - 4; i >= 0; i--) {
                            String t = bids.get(i).optString("type");
                            if ("REDOUBLE".equals(t)) { doubled = "REDOUBLED"; break; }
                            if ("DOUBLE".equals(t)) { doubled = "DOUBLED"; break; }
                            if ("BID".equals(t)) break;
                        }

                        String winningSide = getPartnership(lastMeaningful.optString("bidder"));
                        String winningSuit = lastMeaningful.optString("suit");
                        String declarer = lastMeaningful.optString("bidder");

                        for (JSONObject b : bids) {
                            if ("BID".equals(b.optString("type")) && winningSuit.equals(b.optString("suit"))
                                    && getPartnership(b.optString("bidder")).equals(winningSide)) {
                                declarer = b.optString("bidder");
                                break;
                            }
                        }

                        // If declarer is a Bot and their partner is a Human, make the Human declarer
                        // so the human controls both hands and never sits idle!
                        String partnerOfDecl = partnerSeat(declarer);
                        if (isSeatBot(declarer) && !isSeatBot(partnerOfDecl)) {
                            declarer = partnerOfDecl;
                        }

                        contract = new JSONObject();
                        contract.put("level", lastMeaningful.optInt("level"));
                        contract.put("suit", winningSuit);
                        contract.put("doubled", doubled);
                        contract.put("declarer", declarer);

                        declarerSeat = declarer;
                        dummySeat = partnerSeat(declarer);
                        String openingLeader = nextSeat(declarer);
                        currentTurn = openingLeader;
                        currentTrick = new JSONObject();
                        currentTrick.put("leadSeat", openingLeader);
                        currentTrick.put("cards", new JSONArray());
                        phase = "PLAYING";
                        openingLeadMade = false;

                        broadcastState();
                        scheduleBotActionIfNeeded();
                        return;
                    }
                }
            }

            currentBidder = nextSeat(currentBidder);
            broadcastState();
            scheduleBotActionIfNeeded();
        } catch (Exception e) {
            Log.e(TAG, "Error in processBidInternal", e);
        }
    }

    private synchronized void processPlayCardInternal(String activeSeat, String cardId) {
        try {
            if (!"PLAYING".equals(phase) || !activeSeat.equals(currentTurn)) return;
            List<String> activeHand = hands.get(activeSeat);
            if (activeHand == null || !activeHand.contains(cardId)) return;

            JSONArray cardsArr = currentTrick.getJSONArray("cards");
            if (cardsArr.length() >= 4) return;

            // Validate following suit
            if (cardsArr.length() > 0) {
                String leadSuit = cardsArr.getJSONObject(0).getJSONObject("card").getString("suit");
                String playedSuit = String.valueOf(cardId.charAt(1));
                if (!leadSuit.equals(playedSuit)) {
                    for (String c : activeHand) {
                        if (String.valueOf(c.charAt(1)).equals(leadSuit)) {
                            return; // Must follow suit!
                        }
                    }
                }
            }

            activeHand.remove(cardId);

            JSONObject playedCard = new JSONObject();
            JSONObject cObj = new JSONObject();
            cObj.put("id", cardId);
            cObj.put("suit", String.valueOf(cardId.charAt(1)));
            cObj.put("rank", String.valueOf(cardId.charAt(0)));
            playedCard.put("card", cObj);
            playedCard.put("playedBy", activeSeat);

            cardsArr.put(playedCard);
            if (!openingLeadMade) openingLeadMade = true;

            if (cardsArr.length() == 4) {
                String winner = determineWinner(currentTrick, contract.optString("suit"));
                currentTrick.put("winnerSeat", winner);
                currentTurn = winner;
                broadcastState();
                scheduleBotActionIfNeeded();
                return;
            }

            currentTurn = nextSeat(currentTurn);
            broadcastState();
            scheduleBotActionIfNeeded();
        } catch (Exception e) {
            Log.e(TAG, "Error in processPlayCardInternal", e);
        }
    }

    private synchronized void collectCompletedTrickInternal() {
        collectCompletedTrickInternal(true);
    }

    private synchronized void collectCompletedTrickInternal(boolean shouldBroadcast) {
        try {
            if (!"PLAYING".equals(phase) || currentTrick == null) return;
            JSONArray cardsArr = currentTrick.optJSONArray("cards");
            if (cardsArr == null || cardsArr.length() != 4) return;

            if (pendingBotFuture != null) {
                pendingBotFuture.cancel(false);
                pendingBotFuture = null;
            }

            String winner = currentTrick.optString("winnerSeat");
            if (winner == null || winner.isEmpty()) {
                winner = determineWinner(currentTrick, contract.optString("suit"));
                currentTrick.put("winnerSeat", winner);
            }

            pastTricks.add(new JSONObject(currentTrick.toString()));
            if ("N".equals(winner) || "S".equals(winner)) tricksWonNS++;
            else tricksWonEW++;

            if (pastTricks.size() == 13) {
                lastResult = calculateScore(contract, tricksWonNS, tricksWonEW, vulnerability);
                history.add(0, lastResult);
                phase = "BOARD_RESULT";
                currentTurn = null;
                broadcastState();
            } else {
                currentTurn = winner;
                currentTrick = new JSONObject();
                currentTrick.put("leadSeat", winner);
                currentTrick.put("cards", new JSONArray());
                if (shouldBroadcast) {
                    broadcastState();
                    scheduleBotActionIfNeeded();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in collectCompletedTrickInternal", e);
        }
    }

    private synchronized void performUndoInternal() {
        try {
            if ("BIDDING".equals(phase) && !bids.isEmpty()) {
                JSONObject lastBid = bids.remove(bids.size() - 1);
                currentBidder = lastBid.optString("bidder", dealer);
                return;
            }
            if ("PLAYING".equals(phase)) {
                JSONArray cardsArr = currentTrick != null ? currentTrick.optJSONArray("cards") : null;
                if ((cardsArr == null || cardsArr.length() == 0) && !pastTricks.isEmpty()) {
                    JSONObject lastTrick = pastTricks.remove(pastTricks.size() - 1);
                    String w = lastTrick.optString("winnerSeat");
                    if ("N".equals(w) || "S".equals(w)) tricksWonNS = Math.max(0, tricksWonNS - 1);
                    else if ("E".equals(w) || "W".equals(w)) tricksWonEW = Math.max(0, tricksWonEW - 1);
                    currentTrick = new JSONObject();
                    currentTrick.put("leadSeat", lastTrick.optString("leadSeat", "N"));
                    currentTrick.put("cards", lastTrick.getJSONArray("cards"));
                    cardsArr = currentTrick.getJSONArray("cards");
                }
                if (cardsArr != null && cardsArr.length() > 0) {
                    int lastIdx = cardsArr.length() - 1;
                    JSONObject lastPlayed = cardsArr.getJSONObject(lastIdx);
                    cardsArr.remove(lastIdx);
                    currentTrick.remove("winnerSeat");
                    String playedBy = lastPlayed.optString("playedBy");
                    String cId = lastPlayed.getJSONObject("card").optString("id");
                    if (hands.get(playedBy) != null && !cId.isEmpty()) {
                        hands.get(playedBy).add(cId);
                        List<String> sorted = sortHand(hands.get(playedBy));
                        hands.get(playedBy).clear();
                        hands.get(playedBy).addAll(sorted);
                    }
                    currentTurn = playedBy;
                    openingLeadMade = !pastTricks.isEmpty() || cardsArr.length() > 0;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in performUndoInternal", e);
        }
    }

    private synchronized void scheduleBotActionIfNeeded() {
        if (pendingBotFuture != null) {
            pendingBotFuture.cancel(false);
            pendingBotFuture = null;
        }
        if (undoRequest != null) return;

        if ("BIDDING".equals(phase) && currentBidder != null && isSeatBot(currentBidder)) {
            final String botSeat = currentBidder;
            pendingBotFuture = botExecutor.schedule(() -> {
                synchronized (LocalAirplaneServer.this) {
                    if ("BIDDING".equals(phase) && botSeat.equals(currentBidder) && isSeatBot(botSeat)) {
                        JSONObject bid = chooseBotBid(botSeat);
                        processBidInternal(botSeat, bid);
                    }
                }
            }, 900, TimeUnit.MILLISECONDS);
            return;
        }

        if ("PLAYING".equals(phase)) {
            JSONArray cardsArr = currentTrick != null ? currentTrick.optJSONArray("cards") : null;
            if (cardsArr != null && cardsArr.length() == 4) {
                // Auto-hide after 5 seconds if no player taps the table earlier
                pendingBotFuture = botExecutor.schedule(() -> {
                    synchronized (LocalAirplaneServer.this) {
                        collectCompletedTrickInternal();
                    }
                }, 5000, TimeUnit.MILLISECONDS);
                return;
            }

            if (cardsArr != null && cardsArr.length() < 4 && currentTurn != null) {
                String controllerSeat = currentTurn.equals(dummySeat) ? declarerSeat : currentTurn;
                if (isSeatBot(controllerSeat)) {
                    final String turnSeat = currentTurn;
                    pendingBotFuture = botExecutor.schedule(() -> {
                        synchronized (LocalAirplaneServer.this) {
                            if ("PLAYING".equals(phase) && turnSeat.equals(currentTurn)) {
                                String cardId = chooseBotCard(turnSeat);
                                if (cardId != null) {
                                    processPlayCardInternal(turnSeat, cardId);
                                }
                            }
                        }
                    }, 900, TimeUnit.MILLISECONDS);
                }
            }
        }
    }

    private JSONObject chooseBotBid(String seat) {
        JSONObject passBid = new JSONObject();
        try {
            passBid.put("type", "PASS");
            List<String> hand = hands.get(seat);
            if (hand == null || hand.isEmpty()) return passBid;

            int hcp = 0;
            Map<String, Integer> counts = new HashMap<>();
            for (String s : SUITS) counts.put(s, 0);
            for (String cId : hand) {
                String r = String.valueOf(cId.charAt(0));
                String s = String.valueOf(cId.charAt(1));
                if ("A".equals(r)) hcp += 4;
                else if ("K".equals(r)) hcp += 3;
                else if ("Q".equals(r)) hcp += 2;
                else if ("J".equals(r)) hcp += 1;
                counts.put(s, counts.get(s) + 1);
            }

            String longestSuit = "S";
            int maxLen = 0;
            for (String s : SUITS) {
                if (counts.get(s) > maxLen) {
                    maxLen = counts.get(s);
                    longestSuit = s;
                }
            }

            int myBidCount = 0;
            for (JSONObject b : bids) {
                if (seat.equals(b.optString("bidder")) && "BID".equals(b.optString("type"))) {
                    myBidCount++;
                }
            }
            if (myBidCount >= 2 || hcp < 10) return passBid;

            // Find highest bid so far
            int highestLevel = 0;
            int highestSuitRank = -1;
            List<String> suitOrder = Arrays.asList("C", "D", "H", "S", "NT");
            for (JSONObject b : bids) {
                if ("BID".equals(b.optString("type"))) {
                    highestLevel = b.optInt("level");
                    highestSuitRank = suitOrder.indexOf(b.optString("suit"));
                }
            }

            String candSuit = maxLen >= 5 ? longestSuit : "NT";
            int candSuitRank = suitOrder.indexOf(candSuit);
            int targetLevel = highestLevel == 0 ? 1 : (candSuitRank > highestSuitRank ? highestLevel : highestLevel + 1);

            int maxAllowedLevel = hcp >= 16 ? 3 : hcp >= 13 ? 2 : 1;
            if (targetLevel <= maxAllowedLevel && targetLevel <= 7) {
                JSONObject bid = new JSONObject();
                bid.put("type", "BID");
                bid.put("level", targetLevel);
                bid.put("suit", candSuit);
                return bid;
            }
        } catch (Exception ignored) {}
        return passBid;
    }

    private String chooseBotCard(String activeSeat) {
        List<String> hand = hands.get(activeSeat);
        if (hand == null || hand.isEmpty()) return null;
        try {
            JSONArray cardsArr = currentTrick.getJSONArray("cards");
            if (cardsArr.length() == 0) {
                return hand.get(0);
            }
            String leadSuit = cardsArr.getJSONObject(0).getJSONObject("card").getString("suit");
            List<String> legal = new ArrayList<>();
            for (String c : hand) {
                if (String.valueOf(c.charAt(1)).equals(leadSuit)) {
                    legal.add(c);
                }
            }
            if (legal.isEmpty()) legal = new ArrayList<>(hand);
            return legal.get(legal.size() - 1);
        } catch (Exception e) {
            return hand.get(0);
        }
    }

    private String determineWinner(JSONObject trick, String trumpSuit) {
        try {
            JSONArray cards = trick.getJSONArray("cards");
            JSONObject best = cards.getJSONObject(0);
            String leadSuit = best.getJSONObject("card").getString("suit");

            for (int i = 1; i < cards.length(); i++) {
                JSONObject cand = cards.getJSONObject(i);
                String candSuit = cand.getJSONObject("card").getString("suit");
                String bestSuit = best.getJSONObject("card").getString("suit");
                int candVal = RANK_VALUES.get(cand.getJSONObject("card").getString("rank"));
                int bestVal = RANK_VALUES.get(best.getJSONObject("card").getString("rank"));

                if (!"NT".equals(trumpSuit)) {
                    boolean candIsTrump = trumpSuit.equals(candSuit);
                    boolean bestIsTrump = trumpSuit.equals(bestSuit);

                    if (candIsTrump && !bestIsTrump) { best = cand; continue; }
                    if (candIsTrump && bestIsTrump) {
                        if (candVal > bestVal) best = cand;
                        continue;
                    }
                    if (!candIsTrump && bestIsTrump) continue;
                }

                if (candSuit.equals(leadSuit) && bestSuit.equals(leadSuit)) {
                    if (candVal > bestVal) best = cand;
                }
            }
            return best.getString("playedBy");
        } catch (Exception e) {
            return "N";
        }
    }

    private JSONObject calculateScore(JSONObject contract, int wonNS, int wonEW, String vul) {
        JSONObject res = new JSONObject();
        try {
            String declarer = contract.getString("declarer");
            String side = getPartnership(declarer);
            boolean isVul = isSideVulnerable(side, vul);
            int won = "NS".equals(side) ? wonNS : wonEW;
            int level = contract.getInt("level");
            String suit = contract.getString("suit");
            String doubled = contract.getString("doubled");
            int required = 6 + level;
            int diff = won - required;

            boolean isMinor = "C".equals(suit) || "D".equals(suit);
            boolean isNT = "NT".equals(suit);
            int totalScore = 0;

            if (diff >= 0) {
                int trickBase = isMinor ? level * 20 : isNT ? 40 + (level - 1) * 30 : level * 30;
                if ("DOUBLED".equals(doubled)) trickBase *= 2;
                if ("REDOUBLED".equals(doubled)) trickBase *= 4;
                totalScore += trickBase;

                totalScore += trickBase >= 100 ? (isVul ? 500 : 300) : 50;

                if (level == 6) totalScore += isVul ? 750 : 500;
                if (level == 7) totalScore += isVul ? 1500 : 1000;

                if ("DOUBLED".equals(doubled)) totalScore += 50;
                if ("REDOUBLED".equals(doubled)) totalScore += 100;

                int overtricks = diff;
                if (overtricks > 0) {
                    if ("NONE".equals(doubled)) totalScore += overtricks * (isMinor ? 20 : 30);
                    else if ("DOUBLED".equals(doubled)) totalScore += overtricks * (isVul ? 200 : 100);
                    else if ("REDOUBLED".equals(doubled)) totalScore += overtricks * (isVul ? 400 : 200);
                }
            } else {
                int undertricks = Math.abs(diff);
                int penalty = 0;
                if ("NONE".equals(doubled)) {
                    penalty = undertricks * (isVul ? 100 : 50);
                } else if ("DOUBLED".equals(doubled)) {
                    if (!isVul) {
                        if (undertricks >= 1) penalty += 100;
                        if (undertricks >= 2) penalty += 200;
                        if (undertricks >= 3) penalty += 200;
                        if (undertricks > 3) penalty += (undertricks - 3) * 300;
                    } else {
                        if (undertricks >= 1) penalty += 200;
                        if (undertricks > 1) penalty += (undertricks - 1) * 300;
                    }
                } else if ("REDOUBLED".equals(doubled)) {
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

            int scoreNS = "NS".equals(side) ? totalScore : -totalScore;
            int scoreEW = "EW".equals(side) ? totalScore : -totalScore;

            String diffStr = diff == 0 ? "=" : diff > 0 ? ("+" + diff) : String.valueOf(diff);
            String sym = "C".equals(suit) ? "♣" : "D".equals(suit) ? "♦" : "H".equals(suit) ? "♥" : "S".equals(suit) ? "♠" : "BA";
            String dStr = "REDOUBLED".equals(doubled) ? "xx" : "DOUBLED".equals(doubled) ? "x" : "";
            String baseResultDetail = level + sym + dStr + " " + diffStr + " (" + (totalScore >= 0 ? "+" : "") + totalScore + ")";

            res.put("id", "b_" + System.currentTimeMillis());
            res.put("boardNumber", boardNumber);
            res.put("dealer", dealer);
            res.put("vulnerability", vul);
            res.put("contractStr", level + sym + dStr);
            res.put("declarer", declarer);
            res.put("tricksWonNS", wonNS);
            res.put("tricksWonEW", wonEW);
            res.put("scoreNS", scoreNS);
            res.put("scoreEW", scoreEW);
            enrichResultWithHcpAndImp(res, scoreNS, vul, baseResultDetail);
            res.put("timestamp", System.currentTimeMillis());
        } catch (Exception e) {
            Log.e(TAG, "Scoring error", e);
        }
        return res;
    }

    private int calculateHandHcp(List<String> hand) {
        if (hand == null) return 0;
        int sum = 0;
        for (String cId : hand) {
            if (cId == null || cId.isEmpty()) continue;
            char r = cId.charAt(0);
            if (r == 'A') sum += 4;
            else if (r == 'K') sum += 3;
            else if (r == 'Q') sum += 2;
            else if (r == 'J') sum += 1;
        }
        return sum;
    }

    private int convertDiffToImp(int diff) {
        int a = Math.abs(diff);
        int imp;
        if (a <= 10) imp = 0;
        else if (a <= 40) imp = 1;
        else if (a <= 80) imp = 2;
        else if (a <= 120) imp = 3;
        else if (a <= 160) imp = 4;
        else if (a <= 210) imp = 5;
        else if (a <= 260) imp = 6;
        else if (a <= 310) imp = 7;
        else if (a <= 360) imp = 8;
        else if (a <= 420) imp = 9;
        else if (a <= 490) imp = 10;
        else if (a <= 590) imp = 11;
        else if (a <= 740) imp = 12;
        else if (a <= 890) imp = 13;
        else if (a <= 1090) imp = 14;
        else if (a <= 1290) imp = 15;
        else if (a <= 1490) imp = 16;
        else if (a <= 1740) imp = 17;
        else if (a <= 1990) imp = 18;
        else if (a <= 2240) imp = 19;
        else if (a <= 2490) imp = 20;
        else if (a <= 2990) imp = 21;
        else if (a <= 3490) imp = 22;
        else if (a <= 3990) imp = 23;
        else imp = 24;
        return diff >= 0 ? imp : -imp;
    }

    private void enrichResultWithHcpAndImp(JSONObject res, int scoreNS, String vul, String baseDetail) {
        try {
            int hcpNS = calculateHandHcp(dealHands.get("N")) + calculateHandHcp(dealHands.get("S"));
            int hcpEW = 40 - hcpNS;
            boolean isNSVul = isSideVulnerable("NS", vul);
            boolean isEWVul = isSideVulnerable("EW", vul);

            int majorityHcp = Math.max(hcpNS, hcpEW);
            boolean majorityVul = hcpNS >= 20 ? isNSVul : isEWVul;
            int clamped = Math.min(37, Math.max(20, majorityHcp));

            int[] nonVulTable = {0, 50, 70, 110, 200, 300, 350, 400, 430, 460, 490, 600, 700, 900, 1000, 1100, 1200, 1400};
            int[] vulTable    = {0, 50, 70, 110, 290, 440, 520, 600, 630, 660, 690, 800, 1050, 1350, 1500, 1650, 1800, 2100};
            String[] descTable = {
                "Równowaga (częściówka 0)",
                "Częściówka (1-2 w kolor, 50 pkt)",
                "Częściówka (2 w kolor, 70 pkt)",
                "Częściówka (2-3 w kolor, 110 pkt)",
                "Inwit / Częściówka z nadróbkami",
                "Końcówka (3BA / 4 w starszy)",
                "Końcówka (3BA / 4 w starszy)",
                "Pewna końcówka (3BA / 4♠/4♥)",
                "Końcówka z nadróbką (3BA +1)",
                "Końcówka z 2 nadróbkami (3BA +2)",
                "Wysoka końcówka (490/690 pkt)",
                "Inwit szlemowy (600/800 pkt)",
                "Granica szlema (700/1050 pkt)",
                "Mały szlem (6 w starszy / 6BA)",
                "Mały szlem z nadróbką",
                "Inwit do wielkiego szlema",
                "Inwit do wielkiego szlema",
                "Wielki szlem (7 w kolor / 7BA)"
            };

            int idx = clamped - 20;
            int expPts = majorityVul ? vulTable[idx] : nonVulTable[idx];
            String desc = descTable[idx];

            int expectedScoreNS;
            String expectedContractDesc;
            if (hcpNS >= 20) {
                expectedScoreNS = expPts;
                expectedContractDesc = desc + " (" + (expectedScoreNS > 0 ? "+" : "") + expectedScoreNS + " pkt)";
            } else {
                expectedScoreNS = -expPts;
                expectedContractDesc = "Przeciwnicy: " + desc + " (" + expectedScoreNS + " pkt)";
            }

            int impNS = convertDiffToImp(scoreNS - expectedScoreNS);
            int impEW = -impNS;
            String impStr = impNS > 0 ? ("+" + impNS + " IMP") : (impNS + " IMP");
            String fullDetail = baseDetail + " • " + impStr + " (PC: " + hcpNS + "-" + hcpEW + ")";

            res.put("hcpNS", hcpNS);
            res.put("hcpEW", hcpEW);
            res.put("expectedScoreNS", expectedScoreNS);
            res.put("expectedContractDesc", expectedContractDesc);
            res.put("impNS", impNS);
            res.put("impEW", impEW);
            res.put("resultDetail", fullDetail);
        } catch (Exception ignored) {}
    }

    private void broadcastState() {
        saveState();
        for (BridgeWebSocket ws : allSockets) {
            if (!ws.isOpen()) continue;
            try {
                JSONObject root = new JSONObject();
                root.put("type", "state_update");
                root.put("yourSeat", ws.seat);

                JSONObject s = new JSONObject();
                s.put("roomId", roomId);
                s.put("boardNumber", boardNumber);
                s.put("dealer", dealer);
                s.put("vulnerability", vulnerability);
                s.put("phase", phase);

                // Connected players list & count (seated and unseated)
                JSONArray connArr = new JSONArray();
                Map<String, JSONObject> activePlayers = new LinkedHashMap<>();
                int unassignedCount = 0;

                for (BridgeWebSocket wsItem : allSockets) {
                    if (!wsItem.isOpen()) continue;
                    if (wsItem.playerId != null) {
                        if (!activePlayers.containsKey(wsItem.playerId)) {
                            JSONObject pObj = new JSONObject();
                            pObj.put("id", wsItem.playerId);
                            pObj.put("name", wsItem.playerName != null && !wsItem.playerName.isEmpty() ? wsItem.playerName : "Gracz");
                            pObj.put("seat", wsItem.seat != null ? wsItem.seat : JSONObject.NULL);
                            activePlayers.put(wsItem.playerId, pObj);
                        }
                    } else {
                        unassignedCount++;
                    }
                }

                for (JSONObject pObj : activePlayers.values()) {
                    connArr.put(pObj);
                }

                int totalConnected = activePlayers.size() + unassignedCount;
                s.put("connectedCount", totalConnected);
                s.put("connectedPlayers", connArr);

                JSONObject seatsObj = new JSONObject();
                for (String k : SEATS) {
                    seatsObj.put(k, seats.get(k) != null ? seats.get(k) : JSONObject.NULL);
                }
                s.put("seats", seatsObj);

                // My hand
                JSONArray myHandArr = new JSONArray();
                if (ws.seat != null && hands.get(ws.seat) != null) {
                    for (String cId : hands.get(ws.seat)) {
                        JSONObject cObj = new JSONObject();
                        cObj.put("id", cId);
                        cObj.put("suit", String.valueOf(cId.charAt(1)));
                        cObj.put("rank", String.valueOf(cId.charAt(0)));
                        myHandArr.put(cObj);
                    }
                }
                s.put("myHand", myHandArr);

                // Dummy hand (only if exposed)
                if (dummySeat != null && openingLeadMade && hands.get(dummySeat) != null) {
                    JSONArray dHandArr = new JSONArray();
                    for (String cId : hands.get(dummySeat)) {
                        JSONObject cObj = new JSONObject();
                        cObj.put("id", cId);
                        cObj.put("suit", String.valueOf(cId.charAt(1)));
                        cObj.put("rank", String.valueOf(cId.charAt(0)));
                        dHandArr.put(cObj);
                    }
                    s.put("dummyHand", dHandArr);
                } else {
                    s.put("dummyHand", JSONObject.NULL);
                }

                s.put("dummySeat", dummySeat != null ? dummySeat : JSONObject.NULL);
                s.put("declarerSeat", declarerSeat != null ? declarerSeat : JSONObject.NULL);
                s.put("openingLeadMade", openingLeadMade);

                JSONArray bidsArr = new JSONArray();
                for (JSONObject b : bids) bidsArr.put(b);
                s.put("bids", bidsArr);
                s.put("currentBidder", currentBidder != null ? currentBidder : JSONObject.NULL);
                s.put("contract", contract != null ? contract : JSONObject.NULL);

                s.put("currentTrick", currentTrick);
                JSONArray pastArr = new JSONArray();
                for (JSONObject pt : pastTricks) pastArr.put(pt);
                s.put("pastTricks", pastArr);

                s.put("tricksWonNS", tricksWonNS);
                s.put("tricksWonEW", tricksWonEW);
                s.put("currentTurn", currentTurn != null ? currentTurn : JSONObject.NULL);
                s.put("undoRequest", undoRequest != null ? undoRequest : JSONObject.NULL);
                s.put("undoNotice", undoNotice != null ? undoNotice : JSONObject.NULL);
                s.put("lastResult", lastResult != null ? lastResult : JSONObject.NULL);

                if ("BOARD_RESULT".equals(phase)) {
                    JSONObject dealHandsObj = new JSONObject();
                    for (String k : SEATS) {
                        JSONArray hArr = new JSONArray();
                        if (dealHands.get(k) != null) {
                            for (String cId : dealHands.get(k)) {
                                JSONObject cObj = new JSONObject();
                                cObj.put("id", cId);
                                cObj.put("suit", String.valueOf(cId.charAt(1)));
                                cObj.put("rank", String.valueOf(cId.charAt(0)));
                                hArr.put(cObj);
                            }
                        }
                        dealHandsObj.put(k, hArr);
                    }
                    s.put("dealHands", dealHandsObj);
                } else {
                    s.put("dealHands", JSONObject.NULL);
                }

                JSONArray histArr = new JSONArray();
                for (JSONObject h : history) histArr.put(h);
                s.put("history", histArr);
                s.put("hostId", hostId != null ? hostId : JSONObject.NULL);

                root.put("state", s);
                ws.send(root.toString());
            } catch (Exception e) {
                Log.e(TAG, "Error broadcasting to socket", e);
            }
        }
    }

    public synchronized void resetRoom() {
        phase = "LOBBY";
        initSeats();
        setupBoard(1);
        history.clear();
        deleteStateFile();

        for (BridgeWebSocket ws : allSockets) {
            ws.seat = null;
            try {
                ws.send("{\"type\":\"room_reset\"}");
            } catch (Exception ignored) {}
        }
        broadcastState();
    }

    public void fullShutdown() {
        for (BridgeWebSocket ws : allSockets) {
            try {
                ws.close(NanoWSD.WebSocketFrame.CloseCode.NormalClosure, "Server shutdown", false);
            } catch (Exception ignored) {}
        }
        allSockets.clear();
        stop();
    }

    private void saveState() {
        try {
            JSONObject st = new JSONObject();
            st.put("boardNumber", boardNumber);
            st.put("phase", phase);
            st.put("dealer", dealer);
            st.put("vulnerability", vulnerability);
            File f = new File(context.getFilesDir(), STATE_FILE_NAME);
            FileOutputStream fos = new FileOutputStream(f);
            fos.write(st.toString().getBytes(StandardCharsets.UTF_8));
            fos.close();
        } catch (Exception ignored) {}
    }

    private void loadState() {
        try {
            File f = new File(context.getFilesDir(), STATE_FILE_NAME);
            if (!f.exists()) return;
            FileInputStream fis = new FileInputStream(f);
            byte[] data = new byte[(int) f.length()];
            fis.read(data);
            fis.close();
            JSONObject st = new JSONObject(new String(data, StandardCharsets.UTF_8));
            this.boardNumber = st.optInt("boardNumber", 1);
        } catch (Exception ignored) {}
    }

    private void deleteStateFile() {
        try {
            File f = new File(context.getFilesDir(), STATE_FILE_NAME);
            if (f.exists()) f.delete();
        } catch (Exception ignored) {}
    }

    public static List<String> getLocalIps() {
        List<String> list = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (!addr.isLoopbackAddress() && addr.isSiteLocalAddress()) {
                        list.add(addr.getHostAddress());
                    }
                }
            }
        } catch (Exception ignored) {}
        return list;
    }
}
