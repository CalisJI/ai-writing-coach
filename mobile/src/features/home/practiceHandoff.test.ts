import {clearPracticeHandoff, consumePracticeHandoff, setPracticeHandoff} from './practiceHandoff';

const task = {title: 'Practice', instruction: 'Write a note.', checklist: ['Be clear', 'Use examples'], word_target: 80, task_type: 'email' as const, topic: 'work', source: 'personalized', prompt: 'Write a note.', target_level: 'B1', personalization: {language: 'en' as const, intent: 'repair' as const, focus_category: 'grammar', focus_label: 'Articles', focus_family: 'grammar' as const, focus_status: 'watch', evidence: 'Repeated pattern', goal: 'work' as const, guidance_style: 'guided' as const, task_type: 'email' as const, topic: 'work', target_level: 'B1', word_target: 80, difficulty: {state: 'hold' as const, word_target: 80, length_delta: 0, provenance: {source: 'none' as const, evidence_count: 0}}, reason: 'Practice this pattern', focus_instruction: 'Use articles', action_label: 'Practice'}};

describe('practice handoff', () => {
  afterEach(clearPracticeHandoff);
  it('validates, consumes once, and does not persist learner state', () => { setPracticeHandoff(task); expect(consumePracticeHandoff()).toEqual(task); expect(consumePracticeHandoff()).toBeNull(); });
});
