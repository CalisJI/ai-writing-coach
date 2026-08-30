import {z} from 'zod';

const goalSchema = z.enum(['everyday', 'work', 'exam', 'voice']);
const styleSchema = z.enum(['guided', 'examples', 'concise', 'deep']);
const pinyinSchema = z.enum(['auto', 'on', 'off']);
const nativeLanguageSchema = z.enum(['vi', 'en', 'zh']);
const themePresetSchema = z.enum(['editorial', 'sage', 'clay', 'blueprint']);
const taskTypeSchema = z.enum(['opinion', 'email', 'review', 'story', 'toeic', 'hsk']);

export const learnerProfileInputSchema = z.object({
  goal: goalSchema,
  style: styleSchema,
  pinyin: pinyinSchema,
  native_language: nativeLanguageSchema,
  theme_preset: themePresetSchema,
}).strict();

export const learnerProfileSchema = learnerProfileInputSchema.extend({
  exists: z.boolean(),
  language: z.enum(['en', 'zh']),
  updated_at: z.string(),
}).strict();

export type LearnerProfileInput = z.infer<typeof learnerProfileInputSchema>;
export type LearnerProfile = z.infer<typeof learnerProfileSchema>;

export const learningLanguageSchema = z.object({ok: z.literal(true), active: z.enum(['en', 'zh'])}).strict();
export type LearningLanguage = z.infer<typeof learningLanguageSchema>;

const difficultySchema = z.object({
  state: z.enum(['stretch', 'scaffold', 'hold', 'insufficient']),
  word_target: z.number().int().nonnegative(),
  length_delta: z.number().int(),
  provenance: z.object({
    source: z.enum(['practice_outcome', 'revision_win', 'none']),
    evidence_count: z.number().int().nonnegative(),
    status: z.string().optional(),
    focus_family: z.string().optional(),
    revision_no: z.number().int().positive().optional(),
    issue_count: z.number().int().nonnegative().optional(),
    previous_issue_count: z.number().int().nonnegative().nullable().optional(),
    essay_id: z.number().int().positive().optional(),
  }).strict(),
}).strict();

export const practiceRecommendationSchema = z.object({
  language: z.enum(['en', 'zh']),
  intent: z.enum(['baseline', 'repair', 'reinforce', 'transfer']),
  focus_category: z.string().min(1).max(120),
  focus_label: z.string().min(1).max(160),
  focus_family: z.enum(['grammar', 'vocabulary', 'coherence', 'task_achievement', 'naturalness', 'expression']),
  focus_status: z.string().max(80),
  evidence: z.string().max(320),
  goal: goalSchema,
  guidance_style: styleSchema,
  task_type: taskTypeSchema,
  topic: z.string().min(1).max(120),
  target_level: z.string().min(2).max(12),
  word_target: z.number().int().positive(),
  difficulty: difficultySchema,
  reason: z.string().min(1).max(1200),
  focus_instruction: z.string().min(1).max(1200),
  action_label: z.string().min(1).max(160),
}).strict();

export type PracticeRecommendation = z.infer<typeof practiceRecommendationSchema>;

export const practiceTaskSchema = z.object({
  title: z.string().min(1).max(160),
  instruction: z.string().min(1).max(2000),
  checklist: z.array(z.string().min(1).max(320)).min(2).max(5),
  word_target: z.number().int().positive(),
  task_type: taskTypeSchema,
  topic: z.string().min(1).max(120),
  source: z.string().min(1).max(120),
  prompt: z.string().min(1).max(5000),
  target_level: z.string().min(2).max(12),
  personalization: practiceRecommendationSchema,
}).strict();

export type PracticeTask = z.infer<typeof practiceTaskSchema>;
