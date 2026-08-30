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

export const speechAttemptResponseSchema = z.object({item: z.record(z.unknown()), progress: z.record(z.unknown()).optional()}).passthrough();
export type SpeechAttemptResponse = z.infer<typeof speechAttemptResponseSchema>;
