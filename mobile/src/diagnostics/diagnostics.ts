import {z} from 'zod';
import type {ApiErrorCategory} from '../api/errors';

const diagnosticNameSchema = z.enum(['api_request_failed', 'screen_unavailable', 'audio_permission_denied', 'lifecycle_revalidate']);
const diagnosticSurfaceSchema = z.enum(['auth', 'home', 'writing', 'review', 'grammar', 'reading', 'listening', 'speaking', 'library', 'journey', 'profile', 'system']);

/**
 * Deliberately closed telemetry shape. There is no message, URL, payload,
 * session, learner-content, transcript, audio, or arbitrary metadata field.
 */
export const diagnosticEventSchema = z.object({
  name: diagnosticNameSchema,
  category: z.custom<ApiErrorCategory>((value) => typeof value === 'string' && ['configuration_missing', 'configuration_invalid', 'network_unavailable', 'timeout', 'cancelled', 'authentication_required', 'permission_denied', 'server_unavailable', 'request_rejected', 'invalid_response', 'unknown'].includes(value)),
  surface: diagnosticSurfaceSchema,
  locale: z.enum(['en', 'zh']).optional(),
  duration_ms: z.number().int().nonnegative().max(120000).optional(),
}).strict();

export type DiagnosticEvent = z.infer<typeof diagnosticEventSchema>;
export type DiagnosticsSink = {record: (event: unknown) => void};

/** Creates a no-op-by-default sink; a future vendor adapter receives only validated events. */
export function createDiagnosticsSink(emit: (event: DiagnosticEvent) => void = () => undefined): DiagnosticsSink {
  return {
    record(event) {
      const parsed = diagnosticEventSchema.safeParse(event);
      if (!parsed.success) return;
      emit(Object.freeze({...parsed.data}));
    },
  };
}
