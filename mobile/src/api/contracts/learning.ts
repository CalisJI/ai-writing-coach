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

export const practiceContextSchema = z.object({
  intent: z.enum(['repair', 'reinforce', 'transfer', 'baseline']), focus_category: z.string().max(80), focus_label: z.string().max(120),
  focus_family: z.enum(['grammar', 'vocabulary', 'coherence', 'task_achievement', 'naturalness', 'expression']), focus_status: z.string().max(40).optional(), task_type: z.string().max(32), topic: z.string().max(120), target_level: z.string().max(12), action_label: z.string().max(120), reason: z.string().max(1600), evidence: z.string().max(600), focus_instruction: z.string().max(1600), grammar_id: z.string().max(160).optional(), grammar_title: z.string().max(240).optional(),
}).strict();
export type PracticeContext = z.infer<typeof practiceContextSchema>;

const evaluationIssueSchema = z.object({id: z.union([z.string(), z.number()]).optional(), category: z.string().optional(), fragment: z.string().optional(), explanation: z.string().optional(), explanation_vi: z.string().optional(), explanation_en: z.string().optional(), explanation_zh: z.string().optional(), mini_rule_vi: z.string().optional(), mini_rule_en: z.string().optional(), mini_rule_zh: z.string().optional(), suggestion: z.string().optional(), confidence: z.number().optional(), grammar_link_id: z.string().optional()}).passthrough();
const grammarLinkSchema = z.object({grammar_id: z.string().min(1), title: z.string().optional(), level: z.string().optional(), issue_id: z.string().optional(), category: z.string().optional(), reason: z.string().optional(), evidence: z.string().optional(), source: z.string().optional()}).passthrough();
export const evaluationResultSchema = z.object({
  id: z.number().int().positive(), series_id: z.number().int().positive(), revision_no: z.number().int().positive(), parent_id: z.number().int().positive().nullable().optional(), overall: z.number(), app_cefr: z.string(), evaluator: z.string(), summary_vi: z.string(), strengths_vi: z.array(z.string()), strength_evidence: z.array(z.unknown()), priorities_vi: z.array(z.string()), errors: z.array(evaluationIssueSchema), grammar_links: z.array(grammarLinkSchema), delta: z.unknown().nullable().optional(), grammar: z.unknown().optional(), vocabulary: z.unknown().optional(), coherence: z.unknown().optional(), task_achievement: z.unknown().optional(), naturalness: z.unknown().optional(), cefr_estimate: z.string().optional(),
}).passthrough();
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

export const evaluationInputSchema = z.object({prompt: z.string().max(5000), text: z.string().min(10).max(20000), target_cefr: z.string().min(2).max(12), parent_essay_id: z.number().int().positive().optional(), practice_context: practiceContextSchema.optional(), learning_language: z.enum(['en', 'zh']).optional()}).strict();
export type EvaluationInput = z.infer<typeof evaluationInputSchema>;

export const grammarPracticeSchema = z.object({grammar_id: z.string().min(1), title: z.string().min(1), level: z.string().min(2), target_level: z.string().min(2), prompt: z.string().min(1), practice_blueprint: z.record(z.unknown()), practice_context: practiceContextSchema, source: z.string().min(1)}).strict();
export type GrammarPractice = z.infer<typeof grammarPracticeSchema>;
