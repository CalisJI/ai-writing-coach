import {useMutation, type UseMutationResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import {ApiError} from '../api/errors';
import type {SpeechEvaluation, SpeechTranscription} from '../api/contracts/speech';

const unavailable = () => Promise.reject(new ApiError('configuration_missing', 'API client is unavailable'));
export function useTranscribeSpeaking(client: ApiClient | null, cookie?: string | null): UseMutationResult<SpeechTranscription, ApiError, {uri: string; language: 'en' | 'zh'; signal?: AbortSignal}> {
  return useMutation({mutationFn: ({uri, language, signal}: {uri: string; language: 'en' | 'zh'; signal?: AbortSignal}) => client ? client.transcribeSpeaking(uri, language, {signal, sessionCookie: cookie ?? undefined}) : unavailable(), retry: false});
}
export function useAssessSpeakingPronunciation(client: ApiClient | null, cookie?: string | null): UseMutationResult<Record<string, unknown>, ApiError, {uri: string; language: 'en' | 'zh'; referenceText: string; signal?: AbortSignal}> {
  return useMutation({mutationFn: ({uri, language, referenceText, signal}) => client ? client.assessSpeakingPronunciation(uri, language, referenceText, {signal, sessionCookie: cookie ?? undefined}) : unavailable(), retry: false});
}
export function useEvaluateSpeaking(client: ApiClient | null, cookie?: string | null): UseMutationResult<SpeechEvaluation, ApiError, {input: Record<string, unknown>; signal?: AbortSignal}> {
  return useMutation({mutationFn: ({input, signal}) => client ? client.evaluateSpeaking(input, {signal, sessionCookie: cookie ?? undefined}) : unavailable(), retry: false});
}
export function useSaveSpeakingAttempt(client: ApiClient | null, cookie?: string | null): UseMutationResult<Awaited<ReturnType<ApiClient['saveSpeakingAttempt']>>, ApiError, {input: Record<string, unknown>; signal?: AbortSignal}> {
  return useMutation({mutationFn: ({input, signal}) => client ? client.saveSpeakingAttempt(input, {signal, sessionCookie: cookie ?? undefined}) : unavailable(), retry: false});
}
