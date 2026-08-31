import {createDiagnosticsSink, diagnosticEventSchema} from './diagnostics';

describe('privacy-safe diagnostics boundary', () => {
  it('emits only the closed, non-content event shape', () => {
    const received: unknown[] = [];
    const sink = createDiagnosticsSink((event) => received.push(event));
    sink.record({name: 'api_request_failed', category: 'timeout', surface: 'writing', locale: 'zh', duration_ms: 1200});
    expect(received).toEqual([{name: 'api_request_failed', category: 'timeout', surface: 'writing', locale: 'zh', duration_ms: 1200}]);
    expect(Object.isFrozen(received[0])).toBe(true);
  });

  it('drops learner content, raw audio, session material, secrets, and arbitrary fields', () => {
    const received: unknown[] = [];
    const sink = createDiagnosticsSink((event) => received.push(event));
    sink.record({name: 'screen_unavailable', category: 'unknown', surface: 'review', text: 'learner essay', audio: 'base64', session: 'cookie', authorization: 'Bearer secret', provider_key: 'secret'});
    expect(received).toHaveLength(0);
    expect(diagnosticEventSchema.safeParse({name: 'screen_unavailable', category: 'unknown', surface: 'review', text: 'learner essay'}).success).toBe(false);
  });
});
