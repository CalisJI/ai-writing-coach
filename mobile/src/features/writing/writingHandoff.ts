import {z} from 'zod';
import {grammarPracticeSchema, practiceTaskSchema, type EvaluationResult, type GrammarPractice, type PracticeTask} from '../../api/contracts/learning';

const revisionSchema = z.object({kind: z.literal('revise'), essayId: z.number().int().positive(), text: z.string().min(10), prompt: z.string(), targetLevel: z.string().min(2), learningLanguage: z.enum(['en', 'zh'])});
export type RevisionHandoff = z.infer<typeof revisionSchema>;
export type WritingHandoff = {kind: 'practice'; task: PracticeTask} | {kind: 'grammar'; task: GrammarPractice; learningLanguage: 'en' | 'zh'} | RevisionHandoff;
const writingHandoffSchema = z.union([z.object({kind: z.literal('practice'), task: practiceTaskSchema}), z.object({kind: z.literal('grammar'), task: grammarPracticeSchema, learningLanguage: z.enum(['en', 'zh'])}), revisionSchema]);
let pending: WritingHandoff | null = null;
export function setPracticeWritingHandoff(task: PracticeTask): void { pending = writingHandoffSchema.parse({kind: 'practice', task}); }
export function setGrammarWritingHandoff(task: GrammarPractice, learningLanguage: 'en' | 'zh' = 'en'): void { pending = writingHandoffSchema.parse({kind: 'grammar', task, learningLanguage}); }
export function setRevisionWritingHandoff(essayId: number, text: string, prompt: string, targetLevel: string, learningLanguage: 'en' | 'zh'): void { pending = writingHandoffSchema.parse({kind: 'revise', essayId, text, prompt, targetLevel, learningLanguage}); }
export function consumeWritingHandoff(): WritingHandoff | null { const value = pending; pending = null; return value; }
export function clearWritingHandoff(): void { pending = null; }
export type {EvaluationResult};
