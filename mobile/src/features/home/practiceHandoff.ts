import {practiceTaskSchema, type PracticeTask} from '../../api/contracts/learning';
import {clearWritingHandoff, consumeWritingHandoff, setPracticeWritingHandoff} from '../writing/writingHandoff';

/** Navigation-only context; server responses remain the source of learner truth. */
export function setPracticeHandoff(task: PracticeTask): void {
  setPracticeWritingHandoff(practiceTaskSchema.parse(task));
}

export function consumePracticeHandoff(): PracticeTask | null {
  const value = consumeWritingHandoff();
  return value?.kind === 'practice' ? value.task : null;
}

export function clearPracticeHandoff(): void {
  clearWritingHandoff();
}
