import {useEffect, useMemo, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../src/api/client';
import {ApiError} from '../../src/api/errors';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {TransientAudioService, type TransientAudioSnapshot} from '../../src/media/transientAudioService';
import {useTransientAudioLifecycle} from '../../src/media/useTransientAudioLifecycle';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {useAssessSpeakingPronunciation, useEvaluateSpeaking, useSaveSpeakingAttempt, useTranscribeSpeaking} from '../../src/query/useSpeaking';
import {Button as OrenaButton, Label as OrenaLabel, Panel} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/speaking.js and orena/speaking.css.
 *
 * The functional surface (record, transcribe, evaluate, save an attempt,
 * hand off from/back to Listening's Shadowing mode) was already correct;
 * this restyles the bare bordered Views onto the Orena panel/label system,
 * the same treatment as Listening.
 */

export type SpeakingScreenProps = {client?: ApiClient; service?: TransientAudioService; learningLanguage?: 'en' | 'zh'};
function Button({label, onPress, disabled = false, secondary = false}: {label: string; onPress: () => void; disabled?: boolean; secondary?: boolean}) { return <OrenaButton label={label} onPress={onPress} disabled={disabled} variant={secondary ? 'outline' : 'primary'} />; }
const stepMessage: Record<string, 'speaking.step_focus_words' | 'speaking.step_missing_tokens' | 'speaking.step_fluency' | 'speaking.step_complete_line'> = {focus_words: 'speaking.step_focus_words', missing_tokens: 'speaking.step_missing_tokens', fluency: 'speaking.step_fluency', complete_line: 'speaking.step_complete_line'};

export default function SpeakingScreen({client: suppliedClient, service: suppliedService, learningLanguage: suppliedLearningLanguage}: SpeakingScreenProps) {
  const {t} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter();
  const params = useLocalSearchParams<{mode?: string; assetId?: string; segmentId?: string; referenceText?: string}>();
  const service = useMemo(() => suppliedService ?? new TransientAudioService(), [suppliedService]);
  const client = useMemo(() => suppliedClient ?? (() => { try { return createConfiguredApiClient(); } catch { return null; } })(), [suppliedClient]);
  const [snapshot, setSnapshot] = useState<TransientAudioSnapshot>(service.getSnapshot()); const [transcript, setTranscript] = useState<string | null>(null); const [evaluation, setEvaluation] = useState<Record<string, unknown> | null>(null); const [notice, setNotice] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [profileError, setProfileError] = useState(false); const operation = useRef(0); const abortRef = useRef<AbortController | null>(null);
  const profile = useLearnerProfile(client, sessionCookie, !suppliedLearningLanguage); const learningLanguage = suppliedLearningLanguage ?? profile.data?.language ?? null; const transcribe = useTranscribeSpeaking(client, sessionCookie); const assessPronunciation = useAssessSpeakingPronunciation(client, sessionCookie); const evaluateSpeaking = useEvaluateSpeaking(client, sessionCookie); const saveAttempt = useSaveSpeakingAttempt(client, sessionCookie);
  useTransientAudioLifecycle(service); useEffect(() => service.subscribe(setSnapshot), [service]);
  useEffect(() => { setProfileError(!suppliedLearningLanguage && profile.isError); }, [profile.isError, suppliedLearningLanguage]);
  useEffect(() => () => { operation.current += 1; abortRef.current?.abort(); abortRef.current = null; }, []);
  const referenceText = typeof params.referenceText === 'string' ? params.referenceText : ''; const language = learningLanguage;
  const evaluate = async () => { const uri = service.getRecordingUri(); if (!uri || !language) { setNotice(t('speaking.unavailable')); return; } const current = ++operation.current; abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller; setBusy(true); setNotice(null); setTranscript(null); setEvaluation(null); try { const asr = await transcribe.mutateAsync({uri, language, signal: controller.signal}); if (current !== operation.current) return; setTranscript(asr.text); let pronunciation: Record<string, unknown> | null = null; if (referenceText.trim()) { try { pronunciation = await assessPronunciation.mutateAsync({uri, language, referenceText, signal: controller.signal}); } catch (error) { if (current !== operation.current || controller.signal.aborted) return; setNotice(error instanceof ApiError ? error.message : t('speaking.pronunciation_unavailable')); } } const result = await evaluateSpeaking.mutateAsync({input: {language, reference_text: referenceText || asr.text, transcript_text: asr.text, content_match: null, pronunciation, transcription_confidence: null}, signal: controller.signal}); if (current !== operation.current) return; setEvaluation(result as unknown as Record<string, unknown>); if (params.assetId && params.segmentId) { try { await saveAttempt.mutateAsync({input: {language, take_id: `native-${Date.now()}`, asset_id: params.assetId, segment_id: params.segmentId, reference_text: referenceText || asr.text, transcript_text: asr.text, evaluation: result}, signal: controller.signal}); } catch (error) { if (current === operation.current && !controller.signal.aborted) setNotice(error instanceof ApiError ? error.message : t('speaking.unavailable')); } } } catch (error) { if (current === operation.current && !controller.signal.aborted) setNotice(error instanceof ApiError ? error.message : t('speaking.unavailable')); } finally { if (current === operation.current) { setBusy(false); abortRef.current = null; await service.cancel(); } } };
  const start = () => { setNotice(null); setTranscript(null); setEvaluation(null); void service.startRecording(); }; const stop = async () => { const token = operation.current; await service.stopRecording(); if (token === operation.current && service.getSnapshot().state === 'recorded') void evaluate(); }; const discard = async () => { operation.current += 1; abortRef.current?.abort(); abortRef.current = null; setBusy(false); setTranscript(null); setEvaluation(null); await service.cancel(); };
  const stateMessage: Record<TransientAudioSnapshot['state'], string> = {idle: t('media.ready'), requesting: t('media.permission_requesting'), recording: t('speaking.recording'), recorded: t('media.recorded'), playing: t('media.playing'), denied: t('media.permission_denied'), restricted: t('media.permission_restricted'), unavailable: t('media.unavailable'), interrupted: t('media.interrupted'), failed: t('media.failed'), suspended: t('media.suspended')}; const dimensions = evaluation?.dimensions as Record<string, unknown> | undefined; const nextSteps = Array.isArray(evaluation?.next_steps) ? evaluation.next_steps as {kind?: string; words?: string[]}[] : [];
  const backToListening = () => { void discard().finally(() => router.replace({pathname: '/(app)/listening', params: {assetId: params.assetId, segmentId: params.segmentId}} as never)); };
  if (!sessionCookie || !client) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('speaking.title')}</Text><Text style={{color: tokens.colors.mutedText}}>{t('speaking.unavailable')}</Text><Button label={t('speaking.back_listening')} onPress={backToListening} secondary /></View>;
  return <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
    <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{params.mode === 'shadowing' ? t('speaking.shadowing') : t('speaking.title')}</Text>
    <Text style={{color: tokens.colors.mutedText}}>{t('speaking.body')}</Text>
    {referenceText ? <Panel><OrenaLabel>{t('speaking.reference')}</OrenaLabel><Text style={{color: tokens.colors.text}}>{referenceText}</Text></Panel> : <Text style={{color: tokens.colors.mutedText}}>{t('speaking.no_reference')}</Text>}
    {profileError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('speaking.profile_failed')}</Text> : !learningLanguage ? <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.mutedText}}>{t('speaking.profile_loading')}</Text> : <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.text}}>{busy ? (transcript ? t('speaking.evaluating') : t('speaking.transcribing')) : stateMessage[snapshot.state]}</Text>}
    {snapshot.state === 'recording' ? <Button label={t('speaking.stop')} onPress={() => { void stop(); }} disabled={busy} /> : <Button label={t('speaking.start')} onPress={start} disabled={busy || !learningLanguage} />}
    {(snapshot.state === 'recorded' || snapshot.state === 'playing') && <Button label={t('speaking.cancel')} onPress={() => { void discard(); }} secondary />}
    {notice && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text>}
    {evaluation && <Panel>
      <OrenaLabel>{t('speaking.evidence')}</OrenaLabel>
      {transcript && <Text style={{color: tokens.colors.text}}>{t('speaking.transcript')}: {transcript}</Text>}
      {dimensions?.pronunciation != null && <Text style={{color: tokens.colors.text}}>{t('speaking.pronunciation')}: {String(dimensions.pronunciation)}</Text>}
      {dimensions?.fluency != null && <Text style={{color: tokens.colors.text}}>{t('speaking.fluency')}: {String(dimensions.fluency)}</Text>}
      {nextSteps.length > 0 && <><OrenaLabel>{t('speaking.next_steps')}</OrenaLabel>{nextSteps.map((step, index) => <Text key={`${step.kind}-${index}`} style={{color: tokens.colors.text}}>{t(stepMessage[step.kind ?? ''] ?? 'speaking.next_steps')}{step.words?.length ? `: ${step.words.join(', ')}` : ''}</Text>)}</>}
    </Panel>}
    <Button label={t('speaking.back_listening')} onPress={backToListening} secondary />
  </ScrollView>;
}
const styles = StyleSheet.create({container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 20, fontWeight: '700'}});
