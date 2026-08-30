import {practiceTaskSchema, type PracticeTask} from '../../api/contracts/learning';

let pending: PracticeTask | null = null;

/** Navigation-only context; server responses remain the source of learner truth. */
export function setPracticeHandoff(task: PracticeTask): void {
  pending = practiceTaskSchema.parse(task);
}

export function consumePracticeHandoff(): PracticeTask | null {
  const task = pending;
  pending = null;
  return task;
}

export function clearPracticeHandoff(): void {
  pending = null;
}
