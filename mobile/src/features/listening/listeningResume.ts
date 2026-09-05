import * as SecureStore from 'expo-secure-store';
import {z} from 'zod';
import type {KeyValueStorage} from '../../storage/boundedCache';

export const listeningResumeSchema = z.object({
  assetId: z.string().min(1).max(128),
  segmentId: z.string().min(1).max(128),
  mode: z.enum(['follow', 'active', 'dictation', 'shadowing']),
  sourceUrl: z.string().min(1).max(2048),
  lessonId: z.string().min(1).max(128).optional(),
}).strict();
export type ListeningResume = z.infer<typeof listeningResumeSchema>;

const RESUME_KEY = 'orena.listening.resume.v1';
const PENDING_KEY = 'orena.listening.pending.v1';

export const listeningPendingSchema = z.object({
  assetId: z.string().min(1).max(128),
  mode: z.enum(['follow', 'active', 'dictation', 'shadowing']),
  sourceUrl: z.string().min(1).max(2048),
}).strict();
export type ListeningPending = z.infer<typeof listeningPendingSchema>;

export const secureListeningResumeStorage: KeyValueStorage = {
  getItem: (key) => key === RESUME_KEY || key === PENDING_KEY ? SecureStore.getItemAsync(key) : Promise.resolve(null),
  setItem: (key, value) => key === RESUME_KEY || key === PENDING_KEY ? SecureStore.setItemAsync(key, value) : Promise.resolve(),
  removeItem: (key) => key === RESUME_KEY || key === PENDING_KEY ? SecureStore.deleteItemAsync(key) : Promise.resolve(),
};
export const secureMediaResumeStorage = secureListeningResumeStorage;

export async function readListeningResume(storage: KeyValueStorage = secureListeningResumeStorage): Promise<ListeningResume | null> {
  const raw = await storage.getItem(RESUME_KEY);
  if (!raw) return null;
  try { return listeningResumeSchema.parse(JSON.parse(raw)); }
  catch { await storage.removeItem(RESUME_KEY); return null; }
}

export async function writeListeningResume(value: ListeningResume, storage: KeyValueStorage = secureListeningResumeStorage): Promise<void> {
  await storage.setItem(RESUME_KEY, JSON.stringify(listeningResumeSchema.parse(value)));
}

export async function clearListeningResume(storage: KeyValueStorage = secureListeningResumeStorage): Promise<void> {
  await storage.removeItem(RESUME_KEY);
}

export async function readListeningPending(storage: KeyValueStorage = secureListeningResumeStorage): Promise<ListeningPending | null> {
  const raw = await storage.getItem(PENDING_KEY);
  if (!raw) return null;
  try { return listeningPendingSchema.parse(JSON.parse(raw)); }
  catch { await storage.removeItem(PENDING_KEY); return null; }
}

export async function writeListeningPending(value: ListeningPending, storage: KeyValueStorage = secureListeningResumeStorage): Promise<void> {
  await storage.setItem(PENDING_KEY, JSON.stringify(listeningPendingSchema.parse(value)));
}

export async function clearListeningPending(storage: KeyValueStorage = secureListeningResumeStorage): Promise<void> {
  await storage.removeItem(PENDING_KEY);
}
