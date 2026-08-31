import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useAudioPlayer, useAudioPlayerStatus, type AudioPlayer, type AudioStatus} from 'expo-audio';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../src/api/client';
import type {ListeningProgress, MediaLesson} from '../../src/api/contracts/listening';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useImportMedia, useListeningProgress, useSaveListeningProgress} from '../../src/query/useListening';
import {useMediaImportStatus, createMediaResumeStore} from '../../src/query/useMediaImportStatus';
import {clearListeningPending, clearListeningResume, readListeningPending, readListeningResume, secureListeningResumeStorage, secureMediaResumeStorage, writeListeningPending, writeListeningResume, type ListeningPending, type ListeningResume} from '../../src/features/listening/listeningResume';
import type {ResumeState} from '../../src/api/mediaClient';
import type {KeyValueStorage} from '../../src/storage/boundedCache';
import {Button as OrenaButton, Chip, Label as OrenaLabel, Panel} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/listening.js and orena/listening.css.
 *
 * The web is a full studio -- an embedded video/audio player with transport
 * controls, a waveform-backed transcript, a Shadowing-mode layout variant,
 * and a vocabulary rail -- built around media the native client has no
 * player surface for beyond `expo-audio`'s bare playback. The functional
 * surface native actually has (import a source, Follow/Active practice on a
 * segment list, resume across an app restart, hand a segment to Shadowing)
 * is restyled here with the Orena panel/label/chip primitives; the studio
 * layout itself (video frame, transport bar, vocab rail) is not reproduced
 * and is tracked as a residual in MOBILE_VISUAL_PARITY_AUDIT.md.
 */

type ListeningMode = 'follow' | 'active';
export type ListeningScreenProps = {client?: ApiClient; resumeStorage?: KeyValueStorage; mediaResumeStorage?: KeyValueStorage};

function Button({label, onPress, disabled = false, secondary = false}: {label: string; onPress: () => void; disabled?: boolean; secondary?: boolean}) {
  return <OrenaButton label={label} onPress={onPress} disabled={disabled} variant={secondary ? 'outline' : 'primary'} />;
}

function PlayerControl({url, player, status}: {url: string; player: AudioPlayer; status: AudioStatus}) {
  const {t} = useI18n();
  const playing = Boolean(status?.playing);
  return <Button label={playing ? t('listening.pause') : t('listening.play')} onPress={() => playing ? player.pause() : player.play()} disabled={!url || status?.isLoaded === false} />;
}

function ReadyLesson({lesson, mode, selectedId, progress, progressPending, progressError, answer, setAnswer, onMode, onSelect, onSave, onReveal, onRestart, player, playerStatus}: {lesson: MediaLesson; mode: ListeningMode; selectedId: string; progress: ListeningProgress[]; progressPending: boolean; progressError: boolean; answer: string; setAnswer: (value: string) => void; onMode: (mode: ListeningMode) => void; onSelect: (id: string) => void; onSave: () => void; onReveal: () => void; onRestart: () => void; player: AudioPlayer; playerStatus: AudioStatus}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const selected = lesson.transcript?.segments.find((segment) => segment.segment_id === selectedId) ?? lesson.transcript?.segments[0];
  const selectedProgress = progress.find((item) => item.segment_id === selected?.segment_id);
  const revealed = selectedProgress?.presentation === 'revealed';
  const checked = selectedProgress?.presentation === 'checked' || revealed;
  const checkedCount = progress.reduce((total, item) => total + item.checked_attempt_count, 0);
  return <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
    <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{lesson.asset.title || t('listening.title')}</Text>
    <Text style={{color: tokens.colors.mutedText}}>{mode === 'follow' ? t('listening.follow_body') : t('listening.active_body')}</Text>
    <PlayerControl url={lesson.playback.url} player={player} status={playerStatus} />
    <View accessibilityRole="tablist" style={styles.modeRow}>
      <Pressable accessibilityRole="tab" accessibilityLabel={t('listening.follow')} accessibilityState={{selected: mode === 'follow'}} onPress={() => onMode('follow')} style={[styles.mode, mode === 'follow' && {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.accent}]}><Text style={{color: tokens.colors.text}}>{t('listening.follow')}</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityLabel={t('listening.active')} accessibilityState={{selected: mode === 'active'}} onPress={() => onMode('active')} style={[styles.mode, mode === 'active' && {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.accent}]}><Text style={{color: tokens.colors.text}}>{t('listening.active')}</Text></Pressable>
    </View>
    <OrenaLabel>{t('listening.segment')}</OrenaLabel>
    <View style={styles.segmentList}>{lesson.transcript?.segments.map((segment) => <Pressable key={segment.segment_id} accessibilityRole="button" accessibilityLabel={segment.original_text} accessibilityState={{selected: segment.segment_id === selected?.segment_id}} onPress={() => onSelect(segment.segment_id)} style={[styles.segment, {borderColor: segment.segment_id === selected?.segment_id ? tokens.colors.accent : tokens.colors.border, backgroundColor: segment.segment_id === selected?.segment_id ? tokens.colors.surfaceSunken : tokens.colors.surface}]}><Text style={{color: tokens.colors.text}}>{segment.original_text}</Text></Pressable>)}</View>
    {selected && mode === 'active' && <Panel>
      <OrenaLabel>{t('listening.answer')}</OrenaLabel>
      <TextInput accessibilityLabel={t('listening.answer')} value={answer} onChangeText={setAnswer} placeholder={t('listening.answer_placeholder')} placeholderTextColor={tokens.colors.mutedText} multiline style={[styles.input, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]} />
      <View style={styles.actionRow}><Button label={t('listening.check')} onPress={onSave} disabled={!answer.trim()} /><Button label={t('listening.reveal')} onPress={onReveal} secondary /></View>
      {checked && <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.text}}>{revealed ? t('listening.revealed') : t('listening.checked')}</Text>}
      {revealed && <Text style={{color: tokens.colors.text}}>{selected.original_text}</Text>}
    </Panel>}
    {mode === 'follow' && selected && <Panel><Text style={[styles.selectedText, {color: tokens.colors.text}]}>{selected.original_text}</Text></Panel>}
    <Panel>
      <View style={styles.progressHead}>
        <OrenaLabel>{t('listening.progress')}</OrenaLabel>
        {!progressPending ? <Chip>{checkedCount}</Chip> : null}
      </View>
      {progressPending ? <Text style={{color: tokens.colors.mutedText}}>{t('listening.progress_loading')}</Text> : null}
      {progressError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('listening.progress_unavailable')}</Text>}
    </Panel>
    <Button label={t('listening.resume_cancel')} onPress={onRestart} secondary />
  </ScrollView>;
}

export default function ListeningScreen({client: providedClient, resumeStorage = secureListeningResumeStorage, mediaResumeStorage = secureMediaResumeStorage}: ListeningScreenProps) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const handoff = useLocalSearchParams<{assetId?: string; segmentId?: string}>();
  const client = useMemo(() => { if (providedClient) return providedClient; try { return createConfiguredApiClient(); } catch { return null; } }, [providedClient]);
  const mediaStore = useMemo(() => client ? createMediaResumeStore(client, mediaResumeStorage) : null, [client, mediaResumeStorage]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [resume, setResume] = useState<ListeningResume | null>(null);
  const [pending, setPending] = useState<ListeningPending | null>(null);
  const [mediaResume, setMediaResume] = useState<ResumeState | null>(null);
  const [mediaResumeHandle, setMediaResumeHandle] = useState('');
  const [lesson, setLesson] = useState<MediaLesson | null>(null);
  const [mode, setMode] = useState<ListeningMode>('follow');
  const [selectedId, setSelectedId] = useState('');
  const [answer, setAnswer] = useState('');
  const [progress, setProgress] = useState<ListeningProgress[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const operation = useRef(0);
  const rehydrating = useRef(false);
  const attemptedReadyHandle = useRef<string | null>(null);
  const importMedia = useImportMedia(client, sessionCookie);
  const progressQuery = useListeningProgress(client, sessionCookie, lesson?.asset.asset_id ?? '');
  const saveProgress = useSaveListeningProgress(client, sessionCookie);
  const player = useAudioPlayer(lesson?.playback.url ?? null, {updateInterval: 500});
  const playerStatus = useAudioPlayerStatus(player);
  const mediaStatus = useMediaImportStatus(mediaResumeHandle, mediaStore, sessionCookie);

  useEffect(() => { let mounted = true; void Promise.all([readListeningResume(resumeStorage), readListeningPending(resumeStorage), mediaStore?.read() ?? Promise.resolve(null)]).then(([ready, waiting, media]) => { if (!mounted) return; setResume(ready); setPending(waiting); setMediaResume(media); if (waiting && media) setMediaResumeHandle(media.resumeHandle); }); return () => { mounted = false; }; }, [mediaStore, resumeStorage]);
  useEffect(() => { if (progressQuery.data?.items) setProgress(progressQuery.data.items); }, [progressQuery.data]);
  useEffect(() => { if (!lesson || handoff.assetId !== lesson.asset.asset_id || typeof handoff.segmentId !== 'string') return; if (lesson.transcript?.segments.some((segment) => segment.segment_id === handoff.segmentId)) setSelectedId(handoff.segmentId); }, [handoff.assetId, handoff.segmentId, lesson]);
  useEffect(() => { const subscription = AppState.addEventListener('change', (state) => { if (state === 'background' || state === 'inactive') { player.pause(); setNotice(t('listening.interrupted')); } }); return () => subscription.remove(); }, [player, t]);
  const prepare = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized || !sessionCookie || !client) return;
    const current = ++operation.current;
    setSourceUrl(normalized); setNotice(null); setLesson(null); setProgress([]); setAnswer('');
    importMedia.mutate({source_url: normalized, target_language: locale, include_word_timing: false, include_translation: true}, {onSuccess: async (next) => {
      if (current !== operation.current) return;
      if (next.asset.processing_state !== 'ready' || !next.transcript?.segments.length) {
        if (next.asset.processing_state === 'processing' && next.import_job?.job_id && mediaStore) {
          const waiting: ListeningPending = {assetId: next.asset.asset_id, mode, sourceUrl: normalized};
          await mediaStore.persist({assetId: next.asset.asset_id, resumeHandle: next.import_job.job_id, status: 'processing', resumable: true});
          await writeListeningPending(waiting, resumeStorage);
          setPending(waiting); setMediaResume({assetId: next.asset.asset_id, resumeHandle: next.import_job.job_id, status: 'processing', resumable: true}); setMediaResumeHandle(next.import_job.job_id);
        }
        setNotice(next.asset.processing_state === 'processing' ? t('listening.processing') : t('listening.no_transcript')); return;
      }
      const restored = resume?.assetId === next.asset.asset_id && resume.sourceUrl === normalized ? resume : null;
      const segment = next.transcript.segments.some((item) => item.segment_id === restored?.segmentId) ? restored!.segmentId : next.transcript.segments[0]!.segment_id;
      const nextMode = restored?.mode ?? 'follow';
      rehydrating.current = false;
      setLesson(next); setSelectedId(segment); setMode(nextMode); setResume(null); setPending(null); setMediaResume(null); setMediaResumeHandle(''); await mediaStore?.clear(); await clearListeningPending(resumeStorage);
      await writeListeningResume({assetId: next.asset.asset_id, segmentId: segment, mode: nextMode, sourceUrl: normalized}, resumeStorage);
    }, onError: () => { if (current === operation.current) { rehydrating.current = false; setNotice(t('listening.unavailable')); } }});
  }, [client, importMedia, locale, mediaStore, mode, resume, resumeStorage, sessionCookie, t]);
  useEffect(() => {
    const state = mediaStatus.data?.state;
    if (!state) return;
    setMediaResume(state);
    if (state.status === 'ready' && pending && sourceUrl.trim() === pending.sourceUrl && !rehydrating.current && attemptedReadyHandle.current !== state.resumeHandle) {
      attemptedReadyHandle.current = state.resumeHandle;
      rehydrating.current = true;
      prepare(pending.sourceUrl);
    } else if (state.status === 'failed') {
      setMediaResumeHandle(''); setMediaResume(null); setPending(null); void mediaStore?.clear(); void clearListeningPending(resumeStorage); setNotice(t('listening.unavailable'));
    }
  }, [mediaStatus.data, pending, sourceUrl, mediaStore, resumeStorage, t, prepare]);
  const cancel = () => { operation.current += 1; rehydrating.current = false; importMedia.reset(); setNotice(null); };
  const select = (segmentId: string) => { setSelectedId(segmentId); setAnswer(''); if (lesson) void writeListeningResume({assetId: lesson.asset.asset_id, segmentId, mode, sourceUrl: lesson.asset.source_url}, resumeStorage); };
  const changeMode = (nextMode: ListeningMode) => { setMode(nextMode); if (lesson) void writeListeningResume({assetId: lesson.asset.asset_id, segmentId: selectedId, mode: nextMode, sourceUrl: lesson.asset.source_url}, resumeStorage); };
  const save = (presentation: 'checked' | 'revealed') => { const segment = lesson?.transcript?.segments.find((item) => item.segment_id === selectedId); if (!lesson || !segment) return; const current = progress.find((item) => item.segment_id === segment.segment_id); saveProgress.mutate({asset_id: lesson.asset.asset_id, segment_id: segment.segment_id, presentation, revealed: presentation === 'revealed', checked_attempt_count: presentation === 'checked' ? (current?.checked_attempt_count ?? 0) + 1 : current?.checked_attempt_count ?? 0, best_exact: false, last_answer: presentation === 'checked' ? answer.trim() : current?.last_answer ?? ''}, {onSuccess: (result) => setProgress((items) => [...items.filter((item) => item.segment_id !== result.item.segment_id), result.item]), onError: () => setNotice(t('listening.unavailable'))}); };

  if (!sessionCookie || !client) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('listening.title')}</Text><Text style={{color: tokens.colors.mutedText}}>{t('listening.signed_out')}</Text><Button label={t('listening.back')} onPress={() => router.replace('/(app)')} secondary /></View>;
  if (!lesson) return <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
    <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('listening.title')}</Text>
    <Text style={{color: tokens.colors.mutedText}}>{t('listening.body')}</Text>
    {(resume || (pending && mediaResume)) && <Panel>
      <Text style={{color: tokens.colors.text}}>{t('listening.resume_found')}</Text>
      <Button label={t('listening.resume')} onPress={() => { if (pending && mediaResume) { setSourceUrl(pending.sourceUrl); attemptedReadyHandle.current = null; rehydrating.current = false; if (mediaResume.resumable) setMediaResumeHandle(mediaResume.resumeHandle); else { rehydrating.current = true; prepare(pending.sourceUrl); } } else if (resume) { setSourceUrl(resume.sourceUrl); prepare(resume.sourceUrl); } }} />
      <Button label={t('listening.resume_cancel')} onPress={() => { void clearListeningResume(resumeStorage); void clearListeningPending(resumeStorage); void mediaStore?.clear(); setResume(null); setPending(null); setMediaResume(null); setMediaResumeHandle(''); }} secondary />
    </Panel>}
    <Panel>
      <OrenaLabel>{t('listening.source_url')}</OrenaLabel>
      <TextInput accessibilityLabel={t('listening.source_url')} value={sourceUrl} onChangeText={setSourceUrl} placeholder={t('listening.source_placeholder')} placeholderTextColor={tokens.colors.mutedText} autoCapitalize="none" autoCorrect={false} style={[styles.input, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]} />
      {notice && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text>}
      {importMedia.isPending ? <View style={styles.actionRow}><Button label={t('listening.preparing')} onPress={() => undefined} disabled /><Button label={t('listening.cancel')} onPress={cancel} secondary /></View> : <Button label={t('listening.prepare')} onPress={() => prepare(sourceUrl)} disabled={!sourceUrl.trim()} />}
    </Panel>
  </ScrollView>;
  const restart = () => { operation.current += 1; rehydrating.current = false; importMedia.reset(); setLesson(null); setProgress([]); setAnswer(''); setSourceUrl(''); setNotice(null); setResume(null); setPending(null); setMediaResume(null); setMediaResumeHandle(''); void clearListeningResume(resumeStorage); void clearListeningPending(resumeStorage); void mediaStore?.clear(); };
  const selectedSegment = lesson.transcript?.segments.find((item) => item.segment_id === selectedId) ?? lesson.transcript?.segments[0];
  return <><ReadyLesson lesson={lesson} mode={mode} selectedId={selectedId} progress={progress} progressPending={progressQuery.isPending} progressError={progressQuery.isError} answer={answer} setAnswer={setAnswer} onMode={changeMode} onSelect={select} onSave={() => save('checked')} onReveal={() => save('revealed')} onRestart={restart} player={player} playerStatus={playerStatus} /><View style={{paddingHorizontal: 24, paddingBottom: 24}}><Button label={t('speaking.open_listening')} onPress={() => { if (!selectedSegment) return; router.push({pathname: '/(app)/speaking', params: {mode: 'shadowing', assetId: lesson.asset.asset_id, segmentId: selectedSegment.segment_id, sourceUrl: lesson.asset.source_url, referenceText: selectedSegment.original_text}} as never); }} /></View></>;
}

const styles = StyleSheet.create({container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 20, fontWeight: '700'}, input: {minHeight: 52, borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 15}, actionRow: {gap: 8}, modeRow: {flexDirection: 'row', gap: 8}, mode: {flex: 1, padding: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 15, alignItems: 'center'}, segmentList: {gap: 8}, segment: {padding: 12, borderWidth: 1, borderRadius: 15}, selectedText: {fontSize: 15, lineHeight: 28}, progressHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}});
