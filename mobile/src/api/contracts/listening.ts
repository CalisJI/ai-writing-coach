import {z} from 'zod';

export const mediaImportInputSchema = z.object({
  source_url: z.string().min(1).max(2048),
  target_language: z.string().min(2).max(32),
  include_word_timing: z.boolean(),
  include_translation: z.boolean(),
}).strict();
export type MediaImportInput = z.infer<typeof mediaImportInputSchema>;

const mediaAssetSchema = z.object({
  asset_id: z.string().min(1).max(128),
  source_url: z.string().min(1).max(2048),
  source_provider: z.string().min(1).max(128),
  source_type: z.string().min(1).max(128),
  title: z.string().min(1).max(2048),
  source_language: z.string().min(2).max(32),
  processing_state: z.enum(['processing', 'ready', 'failed']),
  duration_ms: z.number().int().positive().nullable().optional(),
  transcript_available: z.boolean(),
  translation_available: z.boolean().optional(),
}).passthrough();

const mediaPlaybackSchema = z.object({
  provider: z.string().min(1).max(128),
  kind: z.string().min(1).max(64),
  url: z.string().min(1).max(4096),
}).passthrough();

const transcriptSegmentSchema = z.object({
  segment_id: z.string().min(1).max(128),
  order: z.number().int().nonnegative(),
  start_ms: z.number().int().nonnegative(),
  end_ms: z.number().int().positive(),
  original_text: z.string().min(1).max(20000),
  words: z.array(z.object({text: z.string().min(1), start_ms: z.number().int().nonnegative(), end_ms: z.number().int().positive()}).passthrough()).optional(),
}).passthrough();

const mediaTranscriptSchema = z.object({
  asset_id: z.string().min(1).max(128),
  source_language: z.string().min(2).max(32),
  segments: z.array(transcriptSegmentSchema).min(1),
}).passthrough();

const mediaTranslationSchema = z.object({
  segment_id: z.string().min(1).max(128),
  target_language: z.string().min(2).max(32),
  translated_meaning: z.string().min(1).max(20000),
}).passthrough();

const mediaImportJobSchema = z.object({
  job_id: z.string().min(1).max(200),
  state: z.string().min(1).max(64),
  source: z.string().min(1).max(64),
  failure_kind: z.string().min(1).max(128).nullable().optional(),
  resumable: z.boolean().optional(),
}).passthrough();

export const mediaLessonSchema = z.object({
  asset: mediaAssetSchema,
  playback: mediaPlaybackSchema,
  transcript: mediaTranscriptSchema.nullable(),
  translations: z.array(mediaTranslationSchema),
  import_job: mediaImportJobSchema.optional(),
}).passthrough();
export type MediaLesson = z.infer<typeof mediaLessonSchema>;

export const listeningProgressSchema = z.object({
  asset_id: z.string().min(1).max(255),
  segment_id: z.string().min(1).max(255),
  presentation: z.enum(['prompt', 'checked', 'revealed']),
  revealed: z.boolean(),
  checked_attempt_count: z.number().int().nonnegative(),
  best_accuracy_percent: z.number().int().min(0).max(100).nullable().optional(),
  best_exact: z.boolean(),
  last_answer: z.string().max(2000),
  updated_at: z.string().optional(),
}).passthrough();
export type ListeningProgress = z.infer<typeof listeningProgressSchema>;

export const listeningProgressListSchema = z.object({items: z.array(listeningProgressSchema)}).strict();
export const listeningProgressResponseSchema = z.object({item: listeningProgressSchema}).strict();
export type ListeningProgressInput = Omit<ListeningProgress, 'updated_at' | 'asset_id' | 'segment_id'> & {asset_id: string; segment_id: string};
