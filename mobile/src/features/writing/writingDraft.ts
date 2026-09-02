import * as SecureStore from 'expo-secure-store';
import {z} from 'zod';
import type {KeyValueStorage} from '../../storage/boundedCache';

/**
 * The web keeps the draft in `state.draft` and writes it through `saveDraft`
 * (static/becoming/store.js), so a learner who leaves Writing mid-sentence comes
 * back to their own text, their audience note and their support switches. Native
 * had no draft persistence at all -- leaving the screen lost the draft -- so this
 * ports that store, minus the HTML field the rich-text editor is not reproducing.
 */

const DRAFT_KEY = 'orena.writing.draft.v1';

export const writingDraftSchema = z.object({
  text: z.string().max(20000).default(''),
  savedAt: z.number().int().positive().nullable().default(null),
  audience: z.string().max(80).default(''),
  support: z.object({
    grammar: z.boolean(), vocabulary: z.boolean(), expressions: z.boolean(), roles: z.boolean(),
  }).default({grammar: true, vocabulary: true, expressions: true, roles: true}),
  mode: z.string().max(24).default('free'),
  level: z.string().max(12).default(''),
  topic: z.string().max(120).default('random'),
  length: z.number().int().positive().nullable().default(null),
  prompt: z.string().max(5000).default(''),
  parentEssayId: z.number().int().positive().nullable().default(null),
}).strict();

export type WritingDraft = z.infer<typeof writingDraftSchema>;

export const emptyWritingDraft: WritingDraft = {
  text: '', savedAt: null, audience: '',
  support: {grammar: true, vocabulary: true, expressions: true, roles: true},
  mode: 'free', level: '', topic: 'random', length: null, prompt: '', parentEssayId: null,
};

export const secureWritingDraftStorage: KeyValueStorage = {
  getItem: (key) => key === DRAFT_KEY ? SecureStore.getItemAsync(key) : Promise.resolve(null),
  setItem: (key, value) => key === DRAFT_KEY ? SecureStore.setItemAsync(key, value) : Promise.resolve(),
  removeItem: (key) => key === DRAFT_KEY ? SecureStore.deleteItemAsync(key) : Promise.resolve(),
};

/** A malformed or superseded draft is discarded rather than partially trusted. */
export async function readWritingDraft(storage: KeyValueStorage = secureWritingDraftStorage): Promise<WritingDraft | null> {
  try {
    const raw = await storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return writingDraftSchema.parse(JSON.parse(raw));
  } catch { return null; }
}

export async function writeWritingDraft(draft: WritingDraft, storage: KeyValueStorage = secureWritingDraftStorage): Promise<void> {
  try { await storage.setItem(DRAFT_KEY, JSON.stringify(writingDraftSchema.parse(draft))); } catch { /* a draft that cannot be stored must not break typing */ }
}

export async function clearWritingDraft(storage: KeyValueStorage = secureWritingDraftStorage): Promise<void> {
  try { await storage.removeItem(DRAFT_KEY); } catch { /* nothing to recover */ }
}
