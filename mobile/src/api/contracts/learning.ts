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

// GET /api/essays/{essay_id} -- app.py's essay_detail(); mostly the same row shape
// evaluate-writing returns (evaluationResultSchema), plus the raw text/prompt/
// target_cefr/language_code columns needed to reopen this essay in Review the way a
// fresh evaluation would. Unlike a fresh evaluation, essay_detail does not compute
// `app_cefr` (app.py's app_cefr(overall) helper is only called at evaluate-writing and
// essay-list time) -- only the stored `cefr_estimate` column, so app_cefr is optional
// here and callers fall back to cefr_estimate before handing this to setReviewHandoff.
export const essayDetailSchema = evaluationResultSchema.extend({text: z.string(), prompt: z.string(), target_cefr: z.string(), language_code: z.enum(['en', 'zh']), app_cefr: z.string().optional(), cefr_estimate: z.string().optional()});
export type EssayDetail = z.infer<typeof essayDetailSchema>;

export const grammarPracticeSchema = z.object({grammar_id: z.string().min(1), title: z.string().min(1), level: z.string().min(2), target_level: z.string().min(2), prompt: z.string().min(1), practice_blueprint: z.record(z.unknown()), practice_context: practiceContextSchema, source: z.string().min(1)}).strict();
export type GrammarPractice = z.infer<typeof grammarPracticeSchema>;

// `module`/`category` already arrived through `.passthrough()`; naming them
// lets the curriculum map group by module the way groupByModule() does on the
// web. The R5 concept identifiers themselves are untouched.
const grammarLessonSummarySchema = z.object({id: z.string().min(1), title: z.string().min(1), level: z.string().min(2), kind: z.string().optional(), completed: z.boolean().optional(), module: z.string().optional(), category: z.string().optional()}).passthrough();
export const grammarLibrarySchema = z.object({lessons: z.array(grammarLessonSummarySchema), total: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), levels: z.array(z.string()), level_names: z.record(z.string()), language: z.enum(['en', 'zh'])}).passthrough();
export type GrammarLessonSummary = z.infer<typeof grammarLessonSummarySchema>;
export type GrammarLibrary = z.infer<typeof grammarLibrarySchema>;
export const grammarLessonDetailSchema = grammarLessonSummarySchema.extend({examples: z.array(z.record(z.unknown())).optional(), quick_reference: z.record(z.unknown()).optional(), cross_skill: z.record(z.unknown()).optional(), learning_model: z.record(z.unknown()).optional(), content_status: z.string().optional(), source: z.string().optional(), completion_claim: z.string().optional()}).passthrough();
export type GrammarLessonDetail = z.infer<typeof grammarLessonDetailSchema>;

const dashboardTrendSchema = z.object({id: z.number().int().positive(), series_id: z.number().int().positive(), revision_no: z.number().int().positive(), date: z.string().min(1), overall: z.number()}).passthrough();
const dashboardMemorySchema = z.object({category: z.string(), focus_family: z.string().optional(), evidence: z.string().optional(), status: z.string().optional(), total: z.number().int().nonnegative().optional()}).passthrough();
const dashboardNextLevelSchema = z.object({level: z.string().min(1), threshold: z.number(), remaining: z.number()}).passthrough();
export const journeyDashboardSchema = z.object({
  essay_count: z.number().int().nonnegative(), revision_count: z.number().int().nonnegative(), skill_score: z.number(), cefr: z.string(), streak: z.number().int().nonnegative(), recent_average: z.number(), trend: z.array(dashboardTrendSchema), metrics: z.record(z.number()), error_counts: z.record(z.number()), error_memory: z.array(dashboardMemorySchema), next_level: dashboardNextLevelSchema.nullable(), version: z.string().min(1),
}).passthrough();
export type JourneyDashboard = z.infer<typeof journeyDashboardSchema>;

const practiceOutcomeSchema = z.object({
  essay_id: z.number().int().positive(), series_id: z.number().int().positive(), revision_no: z.number().int().positive(), created_at: z.string().min(1), overall: z.number(), status: z.string().min(1), intent: z.string().min(1), focus_family: z.string().min(1), focus_category: z.string().min(1), focus_label: z.string().min(1), grammar_id: z.string(), grammar_title: z.string(), issue_count: z.number().int().nonnegative(), previous_issue_count: z.number().int().nonnegative().nullable(), strength_count: z.number().int().nonnegative(), error_evidence: z.array(z.string()), strength_evidence: z.array(z.string()), practice: z.record(z.unknown()),
}).passthrough();
export const journeyOutcomesSchema = z.object({items: z.array(practiceOutcomeSchema), latest: practiceOutcomeSchema.nullable()}).passthrough();
export type JourneyOutcomes = z.infer<typeof journeyOutcomesSchema>;
export type PracticeOutcome = z.infer<typeof practiceOutcomeSchema>;

// GET /api/essays -- app.py's row_to_dict() without detail=True: text/summary_vi/errors_json etc.
// are stripped server-side, so only the summary fields below are ever present.
export const essaySummarySchema = z.object({
  id: z.number().int().positive(), series_id: z.number().int().positive(), revision_no: z.number().int().positive(), created_at: z.string().min(1), overall: z.number().nullable().optional(), app_cefr: z.string().optional(), cefr_estimate: z.string().optional(), level_estimate: z.string().optional(), target_cefr: z.string().optional(), prompt: z.string().optional(),
}).passthrough();
export type EssaySummary = z.infer<typeof essaySummarySchema>;
export const essaysListSchema = z.array(essaySummarySchema);

// GET /api/learning-memory -- writing_coach/becoming_memory.py's get_learning_memory().
const memoryPatternSchema = z.object({category: z.string(), status: z.string().optional(), series_count: z.number().optional(), total: z.number().optional(), older: z.number().int().nonnegative().optional(), newer: z.number().int().nonnegative().optional(), example: z.string().optional(), suggestion: z.string().optional(), latest_essay_id: z.number().int().positive().nullable().optional()}).passthrough();
const memoryStrengthSchema = z.object({category: z.string(), stage: z.string(), evidence_count: z.number().int().nonnegative(), series_count: z.number().int().nonnegative(), recent_count: z.number().int().nonnegative().optional(), example: z.string().optional(), explanation: z.string().optional()}).passthrough();
const memoryRevisionWinSchema = z.object({overall_delta: z.number(), error_delta: z.number(), revisions: z.number().int().min(2), series_id: z.number().int().positive().optional(), latest_id: z.number().int().positive().optional(), latest_date: z.string().optional()}).passthrough();
const memoryReviewCueSchema = z.object({available: z.boolean(), state: z.string().optional(), source: z.string().optional(), status: z.string().optional(), evidence: z.string().optional(), essay_id: z.number().int().positive().nullable().optional(), category: z.string().optional(), suggestion: z.string().optional()}).passthrough();
export const learningMemorySchema = z.object({
  language: z.string(), essay_count: z.number().int().nonnegative(), revision_count: z.number().int().nonnegative(), focus: memoryPatternSchema.nullable(), patterns: z.array(memoryPatternSchema), strengths: z.array(memoryStrengthSchema), revision_wins: z.array(memoryRevisionWinSchema), review_cue: memoryReviewCueSchema.nullable(),
}).passthrough();
export type LearningMemory = z.infer<typeof learningMemorySchema>;

// GET /api/practice-outcome/{essay_id} -- writing_coach/becoming_outcomes.py's get_practice_outcome().
export const practiceOutcomeResponseSchema = z.object({found: z.boolean(), outcome: practiceOutcomeSchema.nullable()}).passthrough();
export type PracticeOutcomeResponse = z.infer<typeof practiceOutcomeResponseSchema>;

// GET /api/review-cue?essay_id= -- writing_coach/becoming_memory.py's get_review_cue(); same
// shape as learningMemorySchema's review_cue but this endpoint also returns grammar_id.
export const reviewCueSchema = z.object({available: z.boolean(), state: z.string().optional(), source: z.string().optional(), status: z.string().optional(), category: z.string().optional(), evidence: z.string().optional(), essay_id: z.number().int().positive().nullable().optional(), grammar_id: z.string().optional()}).passthrough();
export type ReviewCue = z.infer<typeof reviewCueSchema>;

// POST /api/tasks/generate -- app.py's api_generate_task(). Same shape as
// practiceTaskSchema minus `personalization`, which only /api/practice/next
// (the personalized wrapper) adds.
export const freeTaskSchema = z.object({title: z.string().min(1), instruction: z.string().min(1), checklist: z.array(z.string()), word_target: z.number().int().positive(), task_type: taskTypeSchema, topic: z.string(), source: z.string(), prompt: z.string().min(1), target_level: z.string().min(2)}).passthrough();
export type FreeTask = z.infer<typeof freeTaskSchema>;
export const generateTaskInputSchema = z.object({task_type: taskTypeSchema, topic: z.string().min(1).max(120), target_cefr: z.string().min(2).max(12), word_target: z.number().int().min(20).max(500)}).strict();
export type GenerateTaskInput = z.infer<typeof generateTaskInputSchema>;

// GET /api/cross-skill-cue -- writing_coach/cross_skill_transfer.py's select_cross_skill_cue().
// One evidence-backed cue naming the strongest place to continue across skills, or an
// unavailable placeholder. `action` shape depends on `source`.
const crossSkillActionSchema = z.discriminatedUnion('kind', [
  z.object({kind: z.literal('review'), essay_id: z.number().int().positive()}).passthrough(),
  z.object({kind: z.literal('reading'), session_id: z.number().int().positive()}).passthrough(),
  z.object({kind: z.literal('listening'), asset_id: z.string().min(1), segment_id: z.string().min(1), title: z.string().optional(), source_url: z.string().optional()}).passthrough(),
  z.object({kind: z.literal('speaking'), asset_id: z.string().min(1), segment_id: z.string().min(1)}).passthrough(),
]);
export const crossSkillCueSchema = z.object({available: z.boolean(), state: z.string(), source: z.string(), evidence: z.string(), action: crossSkillActionSchema.nullable()}).passthrough();
export type CrossSkillCue = z.infer<typeof crossSkillCueSchema>;

// POST /api/improve -- app.py's improve_with_ai(). Review's "compare a polished
// version" dialog reads only the two texts; the upgrade lists stay passthrough.
export const improveInputSchema = z.object({text: z.string().min(10).max(20000), target_cefr: z.string().min(2).max(12), mode: z.enum(['correct', 'grammar', 'vocabulary', 'polish'])}).strict();
export type ImproveInput = z.infer<typeof improveInputSchema>;
export const improveResultSchema = z.object({corrected_text: z.string(), upgraded_text: z.string(), summary_vi: z.string().optional()}).passthrough();
export type ImproveResult = z.infer<typeof improveResultSchema>;

// POST /api/essays/{id}/linguistic-annotations -- writing_coach/becoming_linguistics.py.
// Offsets index back into the essay text, which is what makes the lens safe to draw.
export const linguisticAnnotationsSchema = z.object({
  found: z.boolean(), essay_id: z.number().int().positive().optional(), language_code: z.string().optional(),
  annotations: z.array(z.object({fragment: z.string(), start: z.number().int().nonnegative(), end: z.number().int().nonnegative(), pos: z.string()}).passthrough()),
  cached: z.boolean().optional(), truncated: z.boolean().optional(),
}).passthrough();
export type LinguisticAnnotations = z.infer<typeof linguisticAnnotationsSchema>;
