import {z} from 'zod';

export const speechTranscriptionSchema = z.object({
  provider: z.string(), model: z.string().nullable().optional(), language: z.string(), text: z.string(),
  segments: z.array(z.object({start_ms: z.number(), end_ms: z.number(), text: z.string()}).passthrough()),
  words: z.array(z.object({start_ms: z.number(), end_ms: z.number(), word: z.string()}).passthrough()),
}).passthrough();
export type SpeechTranscription = z.infer<typeof speechTranscriptionSchema>;

export const speechEvaluationSchema = z.object({
  schema_version: z.number(), language: z.enum(['en', 'zh']), locale: z.string(),
  dimensions: z.object({transcription_confidence: z.number().nullable(), content_match: z.number().nullable(), pronunciation: z.number().nullable(), fluency: z.number().nullable(), proficiency: z.null()}),
  provenance: z.record(z.string().nullable()), evidence: z.record(z.unknown()),
  highlights: z.array(z.string()), next_steps: z.array(z.object({kind: z.string(), words: z.array(z.string())}).passthrough()),
}).passthrough();
export type SpeechEvaluation = z.infer<typeof speechEvaluationSchema>;

/**
 * The pronunciation provider's own measurement of one take.
 *
 * `score_kind` is the field that matters most: `synthetic_demo` means the
 * numbers were generated, not measured from this learner's voice, and the
 * screen has to say so rather than presenting them as an assessment. Every
 * score is optional because a provider can return a partial result, and a
 * missing number must read as "not measured", never as zero.
 */
export const pronunciationPhonemeSchema = z.object({
  phoneme: z.string(),
  accuracy_score: z.number().nullable().optional(),
}).passthrough();

export const pronunciationWordSchema = z.object({
  word: z.string(),
  accuracy_score: z.number().nullable().optional(),
  error_type: z.string().nullable().optional(),
  phonemes: z.array(pronunciationPhonemeSchema).optional(),
}).passthrough();

export const pronunciationAssessmentSchema = z.object({
  provider: z.string().optional(),
  score_kind: z.string().optional(),
  locale: z.string().optional(),
  pron_score: z.number().nullable().optional(),
  accuracy_score: z.number().nullable().optional(),
  fluency_score: z.number().nullable().optional(),
  completeness_score: z.number().nullable().optional(),
  prosody_score: z.number().nullable().optional(),
  words: z.array(pronunciationWordSchema).optional(),
}).passthrough();
export type PronunciationAssessment = z.infer<typeof pronunciationAssessmentSchema>;
export type PronunciationWord = z.infer<typeof pronunciationWordSchema>;

export const speechAttemptResponseSchema = z.object({item: z.record(z.unknown()), progress: z.record(z.unknown()).optional()}).passthrough();
export type SpeechAttemptResponse = z.infer<typeof speechAttemptResponseSchema>;
