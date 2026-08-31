import * as SecureStore from 'expo-secure-store';
import type {KeyValueStorage} from '../../storage/boundedCache';

/**
 * Device-local Listening habit state, ported from
 * static/becoming/domain/listening-habit.js. The web keeps this in
 * localStorage rather than syncing it to the server -- it is a per-device
 * habit counter, not learning evidence -- so native mirrors that with the
 * same day-bucketed-seconds shape in secure storage.
 */

const TIME_KEY = 'orena.listening.habit.minutes.v1';
const GOAL_KEY = 'orena.listening.habit.goal.v1';

export const listeningHabitStorage: KeyValueStorage = {
  getItem: (key) => key === TIME_KEY || key === GOAL_KEY ? SecureStore.getItemAsync(key) : Promise.resolve(null),
  setItem: (key, value) => key === TIME_KEY || key === GOAL_KEY ? SecureStore.setItemAsync(key, value) : Promise.resolve(),
  removeItem: (key) => key === TIME_KEY || key === GOAL_KEY ? SecureStore.deleteItemAsync(key) : Promise.resolve(),
};

export type ListeningHabitSnapshot = {
  status: 'ok' | 'unavailable' | 'malformed';
  todaySeconds: number;
  weekSeconds: number;
  dailyGoalMinutes: number;
};

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const finiteSeconds = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

async function readRecord(storage: KeyValueStorage, key: string): Promise<{value: Record<string, unknown>; status: 'ok' | 'unavailable' | 'malformed'}> {
  let raw: string | null;
  try { raw = await storage.getItem(key); } catch { return {value: {}, status: 'unavailable'}; }
  if (!raw) return {value: {}, status: 'ok'};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {value: {}, status: 'malformed'};
    return {value: parsed as Record<string, unknown>, status: 'ok'};
  } catch { return {value: {}, status: 'malformed'}; }
}

export async function listeningHabitSnapshot(now = new Date(), storage: KeyValueStorage = listeningHabitStorage): Promise<ListeningHabitSnapshot> {
  const time = await readRecord(storage, TIME_KEY);
  const goal = await readRecord(storage, GOAL_KEY);
  const status = time.status === 'unavailable' || goal.status === 'unavailable' ? 'unavailable' : time.status === 'malformed' || goal.status === 'malformed' ? 'malformed' : 'ok';
  let week = 0;
  for (let back = 0; back < 7; back += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - back);
    week += finiteSeconds(time.value[dayKey(day)]);
  }
  const storedGoal = goal.value.daily;
  const dailyGoalMinutes = typeof storedGoal === 'number' && Number.isFinite(storedGoal) && storedGoal > 0 ? Math.min(600, Math.round(storedGoal)) : 40;
  return {status, todaySeconds: finiteSeconds(time.value[dayKey(now)]), weekSeconds: week, dailyGoalMinutes};
}

export async function addListenedSeconds(seconds: number, storage: KeyValueStorage = listeningHabitStorage): Promise<void> {
  if (!(seconds > 0) || seconds > 30) return;
  const record = await readRecord(storage, TIME_KEY);
  if (record.status === 'unavailable') return;
  const key = dayKey(new Date());
  record.value[key] = finiteSeconds(record.value[key]) + seconds;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffKey = dayKey(cutoff);
  for (const day of Object.keys(record.value)) if (day < cutoffKey) delete record.value[day];
  await storage.setItem(TIME_KEY, JSON.stringify(record.value));
}

export async function saveListeningGoal(minutes: number, storage: KeyValueStorage = listeningHabitStorage): Promise<void> {
  if (!(Number.isFinite(minutes) && minutes > 0)) return;
  await storage.setItem(GOAL_KEY, JSON.stringify({daily: Math.min(600, Math.round(minutes))}));
}
