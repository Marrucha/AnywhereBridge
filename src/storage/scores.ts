import { ScoreRecord, Seat } from '../types/bridge';

const SCORES_STORAGE_KEY = 'anywhere_bridge_history_v2';
const LEGACY_STORAGE_KEY = 'anywhere_bridge_history_v1';
const PLAYER_ID_KEY = 'anywhere_bridge_player_id';
const PLAYER_NAME_KEY = 'anywhere_bridge_player_name';
const PLAYER_SEAT_KEY = 'anywhere_bridge_seat';

// Clean up legacy store once to ensure completely fresh, clean scoreboard
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
} catch {
  // ignore in non-browser env
}

export function getStoredScores(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORES_STORAGE_KEY);
    if (!raw) return [];
    const list: ScoreRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // Deduplicate any duplicates (e.g. from previous StrictMode double invocations)
    const seenIds = new Set<string>();
    const seenBoardBuckets = new Set<string>();
    const deduplicated: ScoreRecord[] = [];

    for (const item of list) {
      if (!item || !item.id) continue;
      const bucket = `${item.boardNumber}_${Math.floor(item.timestamp / 15000)}`;
      if (!seenIds.has(item.id) && !seenBoardBuckets.has(bucket)) {
        seenIds.add(item.id);
        seenBoardBuckets.add(bucket);
        deduplicated.push(item);
      }
    }

    // Re-index consecutive boards within an 8-board cycle in chronological order
    // to fix duplicate #1 entries (newest is at index 0)
    const chronological = [...deduplicated].reverse();
    const corrected = chronological.map((item, idx) => {
      const expectedNum = (idx % 8) + 1;
      if (item.boardNumber !== expectedNum) {
        return { ...item, boardNumber: expectedNum };
      }
      return item;
    });

    return corrected.reverse();
  } catch (e) {
    console.error('Failed to load bridge scores from localStorage:', e);
    return [];
  }
}

export function saveScoreRecord(record: ScoreRecord): ScoreRecord[] {
  try {
    const current = getStoredScores();
    const timeBucket = Math.floor(record.timestamp / 15000);
    // Deduplicate by ID and boardNumber within the same 15-second window
    const updated = [
      record,
      ...current.filter(
        r => r.id !== record.id && !(r.boardNumber === record.boardNumber && Math.floor(r.timestamp / 15000) === timeBucket)
      ),
    ];
    localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save bridge score to localStorage:', e);
    return [];
  }
}

export function clearStoredScores(): void {
  try {
    localStorage.removeItem(SCORES_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear stored bridge scores:', e);
  }
}

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getStoredPlayerName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) || '';
}

export function saveStoredPlayerName(name: string): void {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function getStoredSeat(): Seat | null {
  const seat = localStorage.getItem(PLAYER_SEAT_KEY);
  if (seat === 'N' || seat === 'E' || seat === 'S' || seat === 'W') {
    return seat;
  }
  return null;
}

export function saveStoredSeat(seat: Seat | null): void {
  if (seat) {
    localStorage.setItem(PLAYER_SEAT_KEY, seat);
  } else {
    localStorage.removeItem(PLAYER_SEAT_KEY);
  }
}
