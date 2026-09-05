import * as SecureStore from 'expo-secure-store';
import type {KeyValueStorage} from '../../storage/boundedCache';

/**
 * The learner's daily recall goal, ported from library.js's `readGoal()` /
 * `writeSettings()` pair.
 *
 * It is a per-device preference on the web too (localStorage, `GOAL_KEY`), not
 * a server field, so it stays per-device here rather than inventing a profile
 * column for it.
 */

const GOAL_KEY = 'orena.library.daily-goal.v1';
const DEFAULT_GOAL = 10;
const MAX_GOAL = 500;

export const secureLibraryGoalStorage: KeyValueStorage = {
  getItem: (key) => key === GOAL_KEY ? SecureStore.getItemAsync(key) : Promise.resolve(null),
  setItem: (key, value) => key === GOAL_KEY ? SecureStore.setItemAsync(key, value) : Promise.resolve(),
  removeItem: (key) => key === GOAL_KEY ? SecureStore.deleteItemAsync(key) : Promise.resolve(),
};

export async function readLibraryGoal(storage: KeyValueStorage = secureLibraryGoalStorage): Promise<number> {
  try {
    const raw = await storage.getItem(GOAL_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), MAX_GOAL) : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

/** A goal of zero or less is not a goal, so it is refused rather than stored. */
export async function writeLibraryGoal(value: number, storage: KeyValueStorage = secureLibraryGoalStorage): Promise<boolean> {
  if (!Number.isFinite(value) || value <= 0) return false;
  try {
    await storage.setItem(GOAL_KEY, String(Math.min(Math.round(value), MAX_GOAL)));
    return true;
  } catch {
    return false;
  }
}
