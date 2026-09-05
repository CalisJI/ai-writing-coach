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

/**
 * `serialize_media_translation()`'s outcome block. `status` is what the
 * transcript card reports: a preparing translation is not the same as one that
 * will never arrive, and the screen says so differently.
 */
export const mediaTranslationOutcomeSchema = z.object({
  // MediaTranslationStatus in writing_coach/media_translation.py. All five, not
  // the four the screen has copy for: dropping `transcript_unavailable` here
  // made a valid 200 unparseable, which the screen then reported as a failed
  // translation.
  status: z.enum(['ready', 'not_required', 'transcript_unavailable', 'too_large', 'unavailable']),
  target_language: z.string().min(2).max(32),
  /** `safe_translation_source()`: provenance, already stripped of anything unsafe. */
  source: z.object({
    capability_key: z.string().nullable().optional(),
    provider: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    request_count: z.number().nullable().optional(),
  }).passthrough().nullable().optional(),
  failure_kind: z.string().max(128).nullable().optional(),
}).passthrough();

export const mediaLessonSchema = z.object({
  asset: mediaAssetSchema,
  playback: mediaPlaybackSchema,
  transcript: mediaTranscriptSchema.nullable(),
  translations: z.array(mediaTranslationSchema),
  translation: mediaTranslationOutcomeSchema.optional(),
  import_job: mediaImportJobSchema.optional(),
  catalog: z.object({
    lesson_id: z.string().min(1), media_object_id: z.string().min(1), title: z.string().min(1),
    description: z.string(), language: z.enum(['en', 'zh']), topic: z.string().min(1),
    subtopics: z.array(z.string()), level: z.string().min(1), estimated_level: z.string().min(1), reviewed_level: z.string().nullable(),
    level_source: z.enum(['editorial-review', 'deterministic-estimate']), level_evidence: z.record(z.string()), duration_ms: z.number().int().positive(),
    excerpt_start_ms: z.number().int().nonnegative(), excerpt_end_ms: z.number().int().positive(),
    available_modes: z.array(z.enum(['listen', 'active', 'dictation', 'shadowing'])),
    content_tags: z.array(z.string()), vocabulary: z.array(z.string()).optional(),
    pinyin_by_segment: z.record(z.string()).optional(),
    poster_url: z.string().optional(), playback_kind: z.string().optional(),
    source: z.object({source_media_id: z.string(), provider: z.string(), type: z.string(), title: z.string(), creator: z.string(), source_url: z.string().url(), provenance_url: z.string().url(), license: z.string(), license_url: z.string().url(), allowed_usage_type: z.string(), rights_review_status: z.literal('verified')}).passthrough(),
  }).passthrough().optional(),
}).passthrough();
export type MediaLesson = z.infer<typeof mediaLessonSchema>;

export const listeningLibraryLessonMetadataSchema = z.object({
  lesson_id: z.string().min(1), media_object_id: z.string().min(1), title: z.string().min(1), description: z.string(),
  language: z.enum(['en', 'zh']), topic: z.string().min(1), subtopics: z.array(z.string()), level: z.string().min(1),
  estimated_level: z.string().min(1), reviewed_level: z.string().nullable(), level_source: z.enum(['editorial-review', 'deterministic-estimate']), level_evidence: z.record(z.string()),
  duration_ms: z.number().int().positive(), excerpt_start_ms: z.number().int().nonnegative(), excerpt_end_ms: z.number().int().positive(),
  available_modes: z.array(z.enum(['listen', 'active', 'dictation', 'shadowing'])), content_tags: z.array(z.string()), artwork: z.string(),
  poster_url: z.string().optional(), playback_kind: z.string().optional(),
  source: z.object({source_media_id: z.string(), provider: z.string(), type: z.string(), title: z.string(), creator: z.string(), source_url: z.string().url(), provenance_url: z.string().url(), license: z.string(), license_url: z.string().url(), allowed_usage_type: z.string(), rights_review_status: z.literal('verified')}).passthrough(),
}).passthrough();
export type ListeningLibraryLessonMetadata = z.infer<typeof listeningLibraryLessonMetadataSchema>;

export const listeningLibrarySchema = z.object({
  items: z.array(listeningLibraryLessonMetadataSchema),
  sections: z.array(z.object({id: z.string(), item_ids: z.array(z.string())}).strict()),
  topics: z.array(z.string()),
  tags: z.array(z.string()),
  filters: z.object({language: z.string(), levels: z.array(z.string()), topics: z.array(z.string()), tags: z.array(z.string()), practice_modes: z.array(z.string())}).passthrough(),
  personalization: z.literal('deterministic-curation'),
}).strict();
export type ListeningLibrary = z.infer<typeof listeningLibrarySchema>;

/**
 * POST /api/media-learning/translate. The transcript is sent back rather than
 * re-imported: `MediaTranslationIn` forbids extra fields and the endpoint
 * translates the canonical transcript it is handed, so this mirrors
 * translationRequest() in screens/listening.js field for field.
 */
export const mediaTranslationInputSchema = z.object({
  target_language: z.string().min(2).max(32),
  asset: z.object({
    asset_id: z.string(),
    source_url: z.string(),
    source_provider: z.string(),
    source_type: z.string(),
    title: z.string(),
    source_language: z.string(),
    processing_state: z.string(),
    duration_ms: z.number().nullable().optional(),
    transcript_available: z.boolean(),
  }),
  transcript: z.object({
    asset_id: z.string(),
    source_language: z.string(),
    segments: z.array(z.object({
      segment_id: z.string(),
      order: z.number().int(),
      start_ms: z.number().int(),
      end_ms: z.number().int(),
      original_text: z.string(),
    })),
  }),
}).strict();
export type MediaTranslationInput = z.infer<typeof mediaTranslationInputSchema>;

export const mediaTranslationResultSchema = z.object({
  asset: mediaAssetSchema,
  // `_serialize_transcript()` returns null when the object carries no
  // transcript, so a translation outcome can arrive without one.
  transcript: mediaTranscriptSchema.nullable(),
  translations: z.array(mediaTranslationSchema),
  translation: mediaTranslationOutcomeSchema,
}).passthrough();
export type MediaTranslationResult = z.infer<typeof mediaTranslationResultSchema>;

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

/**
 * Shadowing keeps only how many rounds a segment has been practised.
 * `ShadowingProgressIn` in writing_coach/listening_api.py carries nothing about
 * the recording itself, and nothing that could read as an assessment of it --
 * the takes stay on the device.
 */
export const shadowingProgressSchema = z.object({
  asset_id: z.string().min(1).max(255),
  segment_id: z.string().min(1).max(255),
  completed_rounds: z.number().int().nonnegative(),
  updated_at: z.string().optional(),
}).passthrough();
export type ShadowingProgress = z.infer<typeof shadowingProgressSchema>;

export const shadowingProgressListSchema = z.object({items: z.array(shadowingProgressSchema)}).strict();
export const shadowingProgressResponseSchema = z.object({item: shadowingProgressSchema}).strict();
export const shadowingProgressInputSchema = z.object({
  asset_id: z.string().min(1).max(255),
  segment_id: z.string().min(1).max(255),
  completed_rounds: z.number().int().min(0).max(1000),
}).strict();
export type ShadowingProgressInput = z.infer<typeof shadowingProgressInputSchema>;

export const listeningProgressListSchema = z.object({items: z.array(listeningProgressSchema)}).strict();
export const listeningProgressResponseSchema = z.object({item: listeningProgressSchema}).strict();
export type ListeningProgressInput = Omit<ListeningProgress, 'updated_at' | 'asset_id' | 'segment_id'> & {asset_id: string; segment_id: string};
