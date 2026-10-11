import { ScoreRecord, Seat } from '../types/bridge';

const SCORES_STORAGE_KEY = 'anywhere_bridge_history_v1';
const PLAYER_ID_KEY = 'anywhere_bridge_player_id';
const PLAYER_NAME_KEY = 'anywhere_bridge_player_name';
const PLAYER_SEAT_KEY = 'anywhere_bridge_seat';

export function getStoredScores(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load bridge scores from localStorage:', e);
    return [];
  }
}

export function saveScoreRecord(record: ScoreRecord): ScoreRecord[] {
  try {
    const current = getStoredScores();
    // Avoid duplicate board ID
    const updated = [record, ...current.filter(r => r.id !== record.id)];
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
