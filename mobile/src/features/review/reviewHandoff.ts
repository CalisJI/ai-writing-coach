import {evaluationResultSchema, type EvaluationInput, type EvaluationResult} from '../../api/contracts/learning';
let pending: {result: EvaluationResult; input: EvaluationInput} | null = null;
export function setReviewHandoff(result: EvaluationResult, input: EvaluationInput): void { pending = {result: evaluationResultSchema.parse(result), input}; }
export function consumeReviewHandoff(): {result: EvaluationResult; input: EvaluationInput} | null { const value = pending; pending = null; return value; }
export function clearReviewHandoff(): void { pending = null; }
