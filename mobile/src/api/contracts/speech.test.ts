import {speechEvaluationSchema, speechTranscriptionSchema} from './speech';

describe('speech response contracts', () => {
  it('accepts server-confirmed transcription and evaluation evidence', () => {
    expect(speechTranscriptionSchema.parse({provider: 'asr', language: 'en', text: 'Hello', segments: [], words: []}).text).toBe('Hello');
    expect(speechEvaluationSchema.parse({schema_version: 1, language: 'en', locale: 'en-US', dimensions: {transcription_confidence: null, content_match: null, pronunciation: 90, fluency: null, proficiency: null}, provenance: {}, evidence: {}, highlights: [], next_steps: []}).dimensions.proficiency).toBeNull();
  });
  it('rejects evaluator proficiency values so mobile cannot become scoring authority', () => {
    expect(() => speechEvaluationSchema.parse({schema_version: 1, language: 'en', locale: 'en-US', dimensions: {transcription_confidence: null, content_match: null, pronunciation: null, fluency: null, proficiency: 70}, provenance: {}, evidence: {}, highlights: [], next_steps: []})).toThrow();
  });
});
