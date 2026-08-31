import {useMutation, useQueryClient, type UseMutationResult} from '@tanstack/react-query';
import {ApiClient} from '../api/client';
import type {EvaluationInput, EvaluationResult, GrammarPractice} from '../api/contracts/learning';
import {ApiError} from '../api/errors';

export function useEvaluateWriting(client: ApiClient | null, sessionCookie?: string | null): UseMutationResult<EvaluationResult, ApiError, EvaluationInput> {
  return useMutation({mutationFn: (input) => client ? client.evaluateWriting(input, {sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), retry: false});
}
export function useGrammarPractice(client: ApiClient | null, sessionCookie?: string | null): UseMutationResult<GrammarPractice, ApiError, {grammarId: string; evidence?: string}> {
  const queryClient = useQueryClient();
  return useMutation({mutationFn: ({grammarId, evidence}) => client ? client.getGrammarPractice(grammarId, evidence, {sessionCookie: sessionCookie ?? undefined}) : Promise.reject(new ApiError('configuration_missing', 'API client is unavailable')), onSuccess: () => { void queryClient.invalidateQueries({queryKey: ['learner-profile']}); }, retry: false});
}
