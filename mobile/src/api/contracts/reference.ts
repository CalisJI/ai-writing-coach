import {z} from 'zod';

const strokeCharacterSchema = z.object({
  character: z.string().length(1),
  stroke_count: z.number().int().nonnegative(),
  stroke_paths: z.array(z.string().min(1)).max(64),
  medians: z.array(z.array(z.number().finite()).min(1)).max(64),
  radical_strokes: z.array(z.number().int().nonnegative()).max(64),
}).strict();

export const strokeOrderSchema = z.object({
  word: z.string().min(1).max(20),
  glyph_size: z.number().int().positive(),
  characters: z.array(strokeCharacterSchema).max(20),
  unavailable: z.array(z.string().length(1)).max(20),
  source: z.literal('make-me-a-hanzi'),
  source_version: z.string().min(1).max(128),
}).strict();

export type StrokeOrder = z.infer<typeof strokeOrderSchema>;

export const compactMediaStatusSchema = z.object({
  status: z.enum(['processing', 'ready', 'failed']),
  asset: z.object({
    asset_id: z.string().min(1).max(128),
    processing_state: z.enum(['processing', 'ready', 'failed']),
  }).strict(),
  import_job: z.object({
    resume_handle: z.string().min(20).max(200),
    state: z.string().min(1).max(64),
    source: z.string().min(1).max(64),
    failure_kind: z.string().min(1).max(128).nullable(),
    resumable: z.boolean(),
  }).strict(),
}).strict();

export type CompactMediaStatus = z.infer<typeof compactMediaStatusSchema>;
