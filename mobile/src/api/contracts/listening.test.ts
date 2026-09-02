import {mediaTranslationInputSchema, mediaTranslationResultSchema} from './listening';

/**
 * These mirror `serialize_media_translation()` in writing_coach/media_api.py.
 *
 * They exist because a contract that is merely *narrower* than the server fails
 * silently in the worst possible way: the request succeeds, the parse rejects
 * it, and the screen tells the learner their meaning could not be generated.
 * A shape that the server really produces must parse here.
 */
describe('media translation result contract', () => {
  const base = {
    asset: {
      asset_id: 'asset-1', source_url: 'https://youtu.be/x', source_provider: 'youtube',
      source_type: 'video', title: 'A lesson', source_language: 'en',
      processing_state: 'ready', duration_ms: 278000, transcript_available: true, translation_available: true,
    },
    transcript: {
      asset_id: 'asset-1', source_language: 'en',
      segments: [{segment_id: 's1', order: 0, start_ms: 0, end_ms: 2000, original_text: 'do you forget words', words: []}],
    },
    translations: [{segment_id: 's1', target_language: 'vi', translated_meaning: 'bạn có quên từ không'}],
  };

  it('accepts a ready translation, whose source is the provenance object', () => {
    const parsed = mediaTranslationResultSchema.parse({
      ...base,
      translation: {
        status: 'ready', target_language: 'vi',
        // safe_translation_source() returns a dict, never a string.
        source: {capability_key: 'media_translation', provider: 'groq', model: 'llama-3.3-70b', request_count: 1},
        failure_kind: null,
      },
    });
    expect(parsed.translations[0]?.translated_meaning).toBe('bạn có quên từ không');
    expect(parsed.translation.status).toBe('ready');
  });

  it.each(['ready', 'not_required', 'transcript_unavailable', 'too_large', 'unavailable'])(
    'accepts every MediaTranslationStatus the server can emit: %s',
    (status) => {
      expect(() => mediaTranslationResultSchema.parse({
        ...base, translations: [], translation: {status, target_language: 'vi', source: null, failure_kind: null},
      })).not.toThrow();
    },
  );

  it('accepts an outcome with no transcript', () => {
    expect(() => mediaTranslationResultSchema.parse({
      ...base, transcript: null, translations: [],
      translation: {status: 'transcript_unavailable', target_language: 'vi', source: null, failure_kind: null},
    })).not.toThrow();
  });

  it('rejects a status the server does not define', () => {
    expect(() => mediaTranslationResultSchema.parse({
      ...base, translation: {status: 'pending', target_language: 'vi'},
    })).toThrow();
  });
});

describe('media translation request contract', () => {
  const request = {
    target_language: 'vi',
    asset: {
      asset_id: 'asset-1', source_url: 'https://youtu.be/x', source_provider: 'youtube',
      source_type: 'video', title: 'A lesson', source_language: 'en',
      processing_state: 'ready', duration_ms: 278000, transcript_available: true,
    },
    transcript: {
      asset_id: 'asset-1', source_language: 'en',
      segments: [{segment_id: 's1', order: 0, start_ms: 0, end_ms: 2000, original_text: 'do you forget words'}],
    },
  };

  it('sends exactly the fields MediaTranslationIn accepts', () => {
    expect(() => mediaTranslationInputSchema.parse(request)).not.toThrow();
  });

  /* `MediaTranslationIn` is `extra="forbid"`, so anything the transcript happens
     to carry -- word timings, say -- must be stripped before it is sent, or the
     server answers 422. */
  it('refuses to send a field the server forbids', () => {
    expect(() => mediaTranslationInputSchema.parse({...request, playback: {provider: 'youtube'}})).toThrow();
  });

  it('accepts an asset with no duration', () => {
    expect(() => mediaTranslationInputSchema.parse({...request, asset: {...request.asset, duration_ms: null}})).not.toThrow();
  });
});
