import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import YoutubePlayer, {type YoutubeIframeRef} from 'react-native-youtube-iframe';
import Svg, {Circle} from 'react-native-svg';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../src/api/client';
import {ApiError} from '../../src/api/errors';
import {pronunciationAssessmentSchema, type PronunciationAssessment, type SpeechEvaluation} from '../../src/api/contracts/speech';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {TransientAudioService, type TransientAudioSnapshot} from '../../src/media/transientAudioService';
import {useTransientAudioLifecycle} from '../../src/media/useTransientAudioLifecycle';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {useAssessSpeakingPronunciation, useEvaluateSpeaking, useSaveSpeakingAttempt, useTranscribeSpeaking} from '../../src/query/useSpeaking';
import {getSharedMediaSession, selectSharedMediaSegment} from '../../src/features/listening/sharedMediaSession';
import {listMediaLessons, type MediaLessonEntry} from '../../src/features/listening/mediaLessonHistory';
import {MAX_RECORDING_MS, alignToReference, isSyntheticScore, scoreBand, stamp, transcriptLines, weakPronunciationWords} from '../../src/features/speaking/speakingDomain';
import {Button as OrenaButton, Card, Chip, Label as OrenaLabel, Panel, PanelCopy} from '../../src/components/orena';
import {OrenaIcon, type OrenaIconName} from '../../src/components/OrenaIcon';

/**
 * Ported from static/becoming/screens/speaking.js and orena/speaking.css.
 *
 * The composition is the web's phone breakpoint: one column, the feedback rail
 * unpinned and stacked under the recorder, the segment nav on its own row, and
 * the two secondary actions sharing a row while "See feedback" takes the full
 * width of the card.
 *
 * The prompt is a segment of a Listening lesson, so this screen needs that
 * lesson — the reference player has to be on the page for the play control to
 * reach it. It reads the shared media session Listening publishes, which is the
 * same handoff the web uses; native previously received only a `referenceText`
 * string and so had no reference audio and no way to move between lines.
 *
 * Nothing here reports proficiency. The provider's numbers are labelled as
 * measurements of one take, a generated demo score is banner-marked as such,
 * and the proficiency row says "Not assessed" — all as the reference does.
 */

export type SpeakingScreenProps = {
  client?: ApiClient;
  service?: TransientAudioService;
  learningLanguage?: 'en' | 'zh';
};

const RATES = [0.75, 1, 1.25] as const;
const rateLabel = (rate: number) => `${rate.toFixed(2).replace(/0$/, '')}x`;
const RING_RADIUS = 19;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const stepMessage: Record<string, 'speaking.step_focus_words' | 'speaking.step_missing_tokens' | 'speaking.step_fluency' | 'speaking.step_complete_line'> = {
  focus_words: 'speaking.step_focus_words', missing_tokens: 'speaking.step_missing_tokens',
  fluency: 'speaking.step_fluency', complete_line: 'speaking.step_complete_line',
};

function extractYouTubeVideoId(playback: {kind?: string; provider?: string; url?: string} | undefined): string | null {
  if (!playback || playback.kind !== 'embed' || playback.provider !== 'youtube') return null;
  const match = /\/embed\/([A-Za-z0-9_-]{11})(?:[/?]|$)/.exec(playback.url || '');
  return match ? match[1]! : null;
}

function IconButton({icon, label, onPress, disabled = false, pressed}: {icon: OrenaIconName; label: string; onPress: () => void; disabled?: boolean; pressed?: boolean}) {
  const {tokens} = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{disabled, selected: pressed}} disabled={disabled} onPress={onPress}
      style={({pressed: down}) => [styles.iconButton, {
        borderColor: tokens.colors.border,
        backgroundColor: pressed ? tokens.colors.accentTint : tokens.colors.surface,
        opacity: disabled ? 0.45 : down ? 0.8 : 1,
      }]}
    >
      <OrenaIcon name={icon} size={20} color={pressed ? tokens.colors.accent : tokens.colors.mutedText} />
    </Pressable>
  );
}

/**
 * `ring()`: the provider's number drawn as an arc. With nothing measured it is
 * an em dash, not a zero-length arc — an empty ring would read as a score of
 * nought.
 */
function Ring({value}: {value: number | null | undefined}) {
  const {tokens} = useTheme();
  const band = scoreBand(value);
  if (!band) {
    return (
      <View style={[styles.ring, {borderColor: tokens.colors.border}]}>
        <Text style={[styles.ringPending, {color: tokens.colors.faintText}]}>—</Text>
      </View>
    );
  }
  const score = value as number;
  const colour = band === 'strong' ? tokens.colors.positive : band === 'steady' ? tokens.colors.attention : tokens.colors.danger;
  const arc = (Math.max(0, Math.min(100, score)) / 100) * RING_LENGTH;
  return (
    <View style={styles.ring}>
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Circle cx={22} cy={22} r={RING_RADIUS} stroke={tokens.colors.border} strokeWidth={3} fill="none" />
        <Circle
          cx={22} cy={22} r={RING_RADIUS} stroke={colour} strokeWidth={3} fill="none" strokeLinecap="round"
          strokeDasharray={`${arc.toFixed(1)} ${RING_LENGTH.toFixed(1)}`} transform="rotate(-90 22 22)"
        />
      </Svg>
      <Text style={[styles.ringValue, {color: tokens.colors.text}]}>{Math.round(score)}</Text>
    </View>
  );
}

/** `metric()`: label, ring, band word, and the note under it. */
function Metric({label, value, note}: {label: string; value: number | null | undefined; note?: string}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const band = scoreBand(value);
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, {color: tokens.colors.text}]}>{label}</Text>
      <View style={styles.metricBody}>
        <Ring value={value} />
        <Text style={[styles.metricBand, {color: tokens.colors.mutedText}]}>
          {band ? t(`speak.band_${band}` as never) : t('speak.pending')}
        </Text>
      </View>
      {note ? <PanelCopy>{note}</PanelCopy> : null}
    </View>
  );
}

/** `.o-lesson-row`: a remembered lesson, offered so Speaking is reachable directly. */
function LessonRow({label, sub, onPress}: {label: string; sub?: string; onPress: () => void}) {
  const {tokens} = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed}) => [styles.rowButton, {borderColor: tokens.colors.border, backgroundColor: pressed ? tokens.colors.surfaceSunken : 'transparent'}]}>
      <View style={styles.rowButtonCopy}>
        <Text style={[styles.rowButtonLabel, {color: tokens.colors.text}]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={[styles.rowButtonSub, {color: tokens.colors.faintText}]}>{sub}</Text> : null}
      </View>
      <OrenaIcon name="arrowRight" size={18} color={tokens.colors.faintText} />
    </Pressable>
  );
}

/**
 * `emptyPage()`: Speaking used to be one line of shorthand and a button to walk
 * to another screen. Remembered lessons are offered here directly, which is what
 * breaks the hard dependency on Listening.
 */
function EmptyPage({history, onOpenLesson, onOpenListening}: {history: MediaLessonEntry[]; onOpenLesson: (url: string) => void; onOpenListening: () => void}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={styles.page}>
      <Card style={styles.emptyCard}>
        <OrenaLabel>{t('speak.exercise')}</OrenaLabel>
        <Text accessibilityRole="header" style={[styles.emptyTitle, {color: tokens.colors.heading}]}>{t('speak.empty_title')}</Text>
        <PanelCopy>{t('speak.empty_body')}</PanelCopy>
        {history.length ? (
          <View style={styles.introBlock}>
            <OrenaLabel>{t('speak.recent_title')}</OrenaLabel>
            {history.map((item) => (
              <LessonRow key={item.source_url} label={item.title || item.source_url} sub={item.provider || undefined} onPress={() => onOpenLesson(item.source_url)} />
            ))}
          </View>
        ) : null}
        <OrenaButton
          label={history.length ? t('speak.prepare_new') : t('speak.open_listening')}
          variant={history.length ? 'outline' : 'primary'}
          onPress={onOpenListening}
        />
        <PanelCopy>{t('speak.privacy')}</PanelCopy>
      </Card>
    </ScrollView>
  );
}

type Segment = {segment_id: string; start_ms: number; end_ms: number; original_text: string};

export default function SpeakingScreen({client: suppliedClient, service: suppliedService, learningLanguage: suppliedLearningLanguage}: SpeakingScreenProps) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{mode?: string; assetId?: string; segmentId?: string; referenceText?: string}>();
  const service = useMemo(() => suppliedService ?? new TransientAudioService(), [suppliedService]);
  const client = useMemo(() => suppliedClient ?? (() => { try { return createConfiguredApiClient(); } catch { return null; } })(), [suppliedClient]);

  const profile = useLearnerProfile(client, sessionCookie, !suppliedLearningLanguage);
  const learningLanguage = suppliedLearningLanguage ?? profile.data?.language ?? null;
  const transcribe = useTranscribeSpeaking(client, sessionCookie);
  const assessPronunciation = useAssessSpeakingPronunciation(client, sessionCookie);
  const evaluateSpeaking = useEvaluateSpeaking(client, sessionCookie);
  const saveAttempt = useSaveSpeakingAttempt(client, sessionCookie);

  // The lesson Listening handed over: segments to step through, and the
  // playback the reference control needs.
  const session = useMemo(() => getSharedMediaSession(learningLanguage ?? locale), [learningLanguage, locale]);
  const segments = useMemo<Segment[]>(() => (session?.payload.transcript?.segments ?? []) as Segment[], [session]);
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const handoff = typeof params.segmentId === 'string' ? params.segmentId : '';
    const initial = segments.some((item) => item.segment_id === handoff) ? handoff : session?.selected_segment_id ?? segments[0]?.segment_id ?? '';
    setSelectedId(initial);
  }, [params.segmentId, segments, session]);
  const index = segments.findIndex((item) => item.segment_id === selectedId);
  const segment = segments[index] ?? segments[0];

  const [snapshot, setSnapshot] = useState<TransientAudioSnapshot>(service.getSnapshot());
  const [transcript, setTranscript] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SpeechEvaluation | null>(null);
  const [pronunciation, setPronunciation] = useState<PronunciationAssessment | null>(null);
  const [pronunciationStatus, setPronunciationStatus] = useState<'idle' | 'loading' | 'unavailable'>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [readText, setReadText] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [history, setHistory] = useState<MediaLessonEntry[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const operation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const [playing, setPlaying] = useState(false);

  useTransientAudioLifecycle(service);
  useEffect(() => service.subscribe(setSnapshot), [service]);
  useEffect(() => { setProfileError(!suppliedLearningLanguage && profile.isError); }, [profile.isError, suppliedLearningLanguage]);
  useEffect(() => () => { operation.current += 1; abortRef.current?.abort(); abortRef.current = null; }, []);
  useEffect(() => { void listMediaLessons(learningLanguage ?? locale).then(setHistory); }, [learningLanguage, locale]);

  const referenceText = segment?.original_text ?? (typeof params.referenceText === 'string' ? params.referenceText : '');
  const meaning = useMemo(() => (session?.payload.translations ?? []).find((item) => item.segment_id === selectedId)?.translated_meaning ?? '', [session, selectedId]);
  const videoId = extractYouTubeVideoId(session?.payload.playback);
  const promptMs = segment ? Math.max(0, Number(segment.end_ms || 0) - Number(segment.start_ms || 0)) : 0;

  /**
   * The pipeline the web runs: recognise the take, ask the provider to measure
   * it against the line, then evaluate. A pronunciation failure is reported but
   * does not stop the evaluation -- the transcript is still worth something.
   */
  const evaluate = async () => {
    const uri = service.getRecordingUri();
    if (!uri || !learningLanguage) { setNotice(t('speaking.unavailable')); return; }
    const current = ++operation.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true); setNotice(null); setTranscript(null); setEvaluation(null); setPronunciation(null); setSaveFailed(false);
    try {
      const asr = await transcribe.mutateAsync({uri, language: learningLanguage, signal: controller.signal});
      if (current !== operation.current) return;
      setTranscript(asr.text);
      let measured: PronunciationAssessment | null = null;
      if (referenceText.trim()) {
        setPronunciationStatus('loading');
        try {
          const raw = await assessPronunciation.mutateAsync({uri, language: learningLanguage, referenceText, signal: controller.signal});
          measured = pronunciationAssessmentSchema.parse(raw);
          if (current !== operation.current) return;
          setPronunciation(measured);
          setPronunciationStatus('idle');
        } catch (error) {
          if (current !== operation.current || controller.signal.aborted) return;
          setPronunciationStatus('unavailable');
          setNotice(error instanceof ApiError ? error.message : t('speaking.pronunciation_unavailable'));
        }
      }
      const result = await evaluateSpeaking.mutateAsync({
        input: {
          language: learningLanguage, reference_text: referenceText || asr.text, transcript_text: asr.text,
          content_match: null, pronunciation: measured, transcription_confidence: null,
        },
        signal: controller.signal,
      });
      if (current !== operation.current) return;
      setEvaluation(result);
      if (params.assetId && selectedId) {
        try {
          await saveAttempt.mutateAsync({
            input: {
              language: learningLanguage, take_id: `native-${Date.now()}`, asset_id: params.assetId,
              segment_id: selectedId, reference_text: referenceText || asr.text, transcript_text: asr.text, evaluation: result,
            },
            signal: controller.signal,
          });
        } catch {
          if (current === operation.current && !controller.signal.aborted) setSaveFailed(true);
        }
      }
    } catch (error) {
      if (current === operation.current && !controller.signal.aborted) setNotice(error instanceof ApiError ? error.message : t('speaking.unavailable'));
    } finally {
      if (current === operation.current) { setBusy(false); abortRef.current = null; }
    }
  };

  const start = () => { setNotice(null); setTranscript(null); setEvaluation(null); setPronunciation(null); setPlaying(false); void service.startRecording(); };
  const stop = useCallback(async () => { await service.stopRecording(); }, [service]);
  const discard = async () => {
    operation.current += 1; abortRef.current?.abort(); abortRef.current = null;
    setBusy(false); setTranscript(null); setEvaluation(null); setPronunciation(null); setNotice(null); setSaveFailed(false);
    await service.cancel();
  };
  const select = (segmentId: string) => {
    if (snapshot.state === 'recording') return;
    setSelectedId(segmentId);
    selectSharedMediaSegment(learningLanguage ?? locale, segmentId);
    void discard();
  };
  const step = (delta: number) => { const next = segments[index + delta]; if (next) select(next.segment_id); };
  const replay = () => { if (segment) { void playerRef.current?.seekTo(segment.start_ms / 1000, true); setPlaying(true); } };

  useEffect(() => {
    if (snapshot.state !== 'recording') { setElapsedMs(0); return; }
    const startedAt = Date.now();
    const ticker = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(Math.min(elapsed, MAX_RECORDING_MS));
      if (elapsed >= MAX_RECORDING_MS) void stop();
    }, 200);
    return () => clearInterval(ticker);
  }, [snapshot.state, stop]);

  const backToListening = () => {
    void discard().finally(() => router.replace({pathname: '/(app)/listening', params: {assetId: params.assetId, segmentId: selectedId}} as never));
  };

  if (!sessionCookie || !client) {
    return (
      <View style={[styles.page, {backgroundColor: tokens.colors.background}]}>
        <Text accessibilityRole="header" style={[styles.emptyTitle, {color: tokens.colors.heading}]}>{t('speaking.title')}</Text>
        <PanelCopy>{t('speaking.unavailable')}</PanelCopy>
        <OrenaButton label={t('speaking.back_listening')} variant="outline" onPress={backToListening} />
      </View>
    );
  }

  /* Without a lesson there is no line to say, so the screen offers the way in
     rather than an empty exercise. */
  if (!segment) {
    return <EmptyPage history={history} onOpenLesson={() => router.replace('/(app)/listening')} onOpenListening={() => router.replace('/(app)/listening')} />;
  }

  const isRecording = snapshot.state === 'recording';
  const stateMessage: Record<TransientAudioSnapshot['state'], string> = {
    idle: t('speak.idle'), requesting: t('media.permission_requesting'), recording: t('speaking.recording'),
    recorded: t('speak.take_ready'), playing: t('media.playing'), denied: t('media.permission_denied'),
    restricted: t('media.permission_restricted'), unavailable: t('speak.mic_error'),
    interrupted: t('media.interrupted'), failed: t('speak.empty_recording'), suspended: t('media.suspended'),
  };
  const statusText = busy ? (transcript ? t('speaking.evaluating') : t('speaking.transcribing')) : stateMessage[snapshot.state];
  const hasTake = snapshot.state === 'recorded' || snapshot.state === 'playing';
  const dimensions = evaluation?.dimensions;
  const check = transcript ? alignToReference(referenceText, transcript, learningLanguage ?? 'en') : null;
  const weakWords = weakPronunciationWords(pronunciation);
  const synthetic = isSyntheticScore(pronunciation);
  const scored = Boolean(pronunciation || evaluation);
  const nextSteps = evaluation?.next_steps ?? [];

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={styles.page}>
      {/* `.o-exercise` */}
      <Card style={styles.exercise}>
        <View style={styles.exerciseKicker}>
          <OrenaLabel>{t('speak.exercise')}</OrenaLabel>
          <OrenaButton label={t('speaking.back_listening')} variant="outline" compact onPress={backToListening} />
        </View>
        <Text accessibilityRole="header" style={[styles.exercisePrompt, {color: tokens.colors.heading}, locale === 'zh' && styles.cjk]}>{segment.original_text}</Text>
        <View style={styles.exerciseMeta}>
          <Chip>{stamp(promptMs)}</Chip>
        </View>
      </Card>

      {/* `.o-speak-heading` + `.o-ref-head`; on a phone the nav takes its own row. */}
      <Text style={[styles.speakHeading, {color: tokens.colors.heading}]}>{t('speak.reference')}</Text>
      <View style={styles.refHead}>
        <Text style={[styles.refLead, {color: tokens.colors.mutedText}]}>{t('speak.listen_prompt')}</Text>
        <OrenaButton label={t('speak.read_text')} variant="outline" compact onPress={() => setReadText((value) => !value)} />
        <View style={styles.refNav}>
          <IconButton icon="chevronDown" label={t('listen.previous')} disabled={index <= 0} onPress={() => step(-1)} />
          <Text style={[styles.refCount, {color: tokens.colors.mutedText}]}>
            {t('speak.segment_of').replace('{n}', String(index + 1)).replace('{total}', String(segments.length))}
          </Text>
          <IconButton icon="chevronUp" label={t('listen.next')} disabled={index < 0 || index >= segments.length - 1} onPress={() => step(1)} />
        </View>
      </View>

      {/* `.o-ref-card`: the prompt is a segment of the lesson video, so the
          player has to be on the page for the play control to reach it. */}
      <Card style={styles.refCard}>
        {videoId ? (
          <View style={styles.videoFrame}>
            <YoutubePlayer ref={playerRef} height={170} videoId={videoId} play={playing} playbackRate={rate} onChangeState={(state: string) => { if (state === 'playing') setPlaying(true); else if (state === 'paused' || state === 'ended') setPlaying(false); }} webViewProps={{allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false, androidLayerType: 'hardware'}} initialPlayerParams={{controls: true, modestbranding: true, rel: false}} />
          </View>
        ) : (
          <PanelCopy>{t('listening.playback_unavailable')}</PanelCopy>
        )}
        <View style={styles.refControls}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('speak.replay')} disabled={!videoId} onPress={replay} style={[styles.roundButton, {backgroundColor: tokens.colors.accent, opacity: videoId ? 1 : 0.45}]}>
            <OrenaIcon name="play" size={22} color={tokens.colors.onAccent} />
          </Pressable>
          <View style={styles.refMeta}>
            <Text style={[styles.refMetaTitle, {color: tokens.colors.text}]}>{t('speak.prompt_audio')}</Text>
            <Text style={[styles.refMetaTime, {color: tokens.colors.faintText}]}>{stamp(promptMs)}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('speak.speed')} onPress={() => setRate(RATES[(RATES.indexOf(rate as typeof RATES[number]) + 1) % RATES.length]!)} style={[styles.rateButton, {borderColor: tokens.colors.border}]}>
            <Text style={[styles.rateValue, {color: tokens.colors.text}]}>{rateLabel(rate)}</Text>
          </Pressable>
        </View>
      </Card>

      {readText ? (
        <View style={styles.refText}>
          <Text style={[styles.refSource, {color: tokens.colors.text}, locale === 'zh' && styles.cjk]}>{segment.original_text}</Text>
          {meaning ? <Text style={{color: tokens.colors.mutedText}}><Text style={styles.strong}>{t('speak.meaning')}</Text> {meaning}</Text> : null}
        </View>
      ) : null}

      {/* `.o-recorder` */}
      <Text style={[styles.speakHeading, {color: tokens.colors.heading}]}>{t('speak.record_heading')}</Text>
      <Card style={styles.recorder}>
        <View style={styles.recState}>
          <Text accessibilityLiveRegion="polite" style={[styles.recStatus, {color: tokens.colors.text}]}>{statusText}</Text>
          <Text style={[styles.recClock, {color: tokens.colors.faintText}]}>{stamp(elapsedMs)} / {stamp(MAX_RECORDING_MS)}</Text>
        </View>
        {/* Ticks, not a waveform. Nothing here measures loudness, so the bar is
            a fixed ruler and the fill is elapsed time. */}
        <View style={[styles.recMeter, {backgroundColor: tokens.colors.surfaceSunken}]}>
          <View style={[styles.recMeterFill, {width: `${Math.min(100, (elapsedMs / MAX_RECORDING_MS) * 100)}%`, backgroundColor: tokens.colors.accent}]} />
        </View>
        <View style={styles.recButtonRow}>
          {isRecording ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('speak.stop')} onPress={() => { void stop(); }} style={[styles.recButton, {backgroundColor: tokens.colors.danger}]}>
              <OrenaIcon name="close" size={23} color={tokens.colors.onAccent} />
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={t('speak.record')} disabled={busy || !learningLanguage} onPress={start} style={[styles.recButton, {backgroundColor: tokens.colors.accent, opacity: busy || !learningLanguage ? 0.45 : 1}]}>
              <OrenaIcon name="speak" size={23} color={tokens.colors.onAccent} />
            </Pressable>
          )}
        </View>

        <View style={[styles.recDivider, {backgroundColor: tokens.colors.border}]} />

        <View style={styles.recPlayback}>
          <Text style={[styles.strong, {color: tokens.colors.text}]}>{t('speak.playback')}</Text>
          {hasTake
            ? <OrenaButton label={t('speak.play_take')} variant="outline" compact onPress={() => { void service.play(); }} />
            : <Text style={{color: tokens.colors.faintText}}>{t('speak.idle')}</Text>}
        </View>

        <View style={[styles.recDivider, {backgroundColor: tokens.colors.border}]} />

        <View style={styles.recTranscript}>
          <View style={styles.recTranscriptHead}>
            <Text style={[styles.strong, {color: tokens.colors.text}]}>{t('speaking.transcript')}</Text>
            <Chip>{t('speak.auto_generated')}</Chip>
          </View>
          {busy && !transcript ? <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.mutedText}}>{t('speaking.transcribing')}</Text>
            : transcript ? transcriptLines(transcript).map((line, position) => <Text key={position} style={{color: tokens.colors.text}}>{line}</Text>)
            : <Text style={{color: tokens.colors.faintText}}>{t('speak.transcript_empty')}</Text>}

          {/* `sourceCheck()`: a comparison with the line, next to the words it
              is comparing -- not a score. */}
          {check ? (
            <View style={styles.sourceCheck}>
              <View style={styles.sourceCheckHead}>
                <Text style={[styles.strong, {color: tokens.colors.text}]}>{t('speak.source_check')}</Text>
                <Chip>{check.band === 'strong' ? t('speak.strong') : check.band === 'close' ? t('speak.close') : t('speak.retry')}</Chip>
              </View>
              <View style={styles.sourceTokens}>
                {check.alignment.map((item, position) => (
                  <Text key={position} style={[styles.token, {
                    color: item.matched ? tokens.colors.text : tokens.colors.danger,
                    backgroundColor: item.matched ? tokens.colors.surfaceSunken : tokens.colors.dangerSurface,
                  }]}>{item.token}</Text>
                ))}
              </View>
              {check.extra.length ? (
                <View style={styles.sourceTokens}>
                  <Text style={[styles.strong, {color: tokens.colors.mutedText}]}>{t('speak.extra')}</Text>
                  {check.extra.map((token, position) => <Text key={position} style={[styles.token, {color: tokens.colors.mutedText, backgroundColor: tokens.colors.surfaceSunken}]}>{token}</Text>)}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>

      {/* `.o-speak-actions`: the two secondary actions share a row and the one
          that starts the assessment gets the width of the card. */}
      <View style={styles.speakActions}>
        <View style={styles.speakActionsRow}>
          <View style={styles.speakActionCell}><OrenaButton label={t('speak.discard')} variant="outline" disabled={!hasTake} onPress={() => { void discard(); }} /></View>
          <View style={styles.speakActionCell}><OrenaButton label={t('speaking.cancel')} variant="outline" disabled={!busy} onPress={() => { void discard(); }} /></View>
        </View>
        <OrenaButton label={t('speak.see_feedback')} disabled={!hasTake || busy} onPress={() => { void evaluate(); }} />
      </View>

      {notice ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text> : null}
      {profileError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('speaking.profile_failed')}</Text> : null}
      {!learningLanguage && !profileError ? <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.mutedText}}>{t('speaking.profile_loading')}</Text> : null}
      <PanelCopy>{t('speak.privacy')}</PanelCopy>

      {/* `feedbackRail()`, stacked under the recorder on a phone. */}
      <Card style={styles.feedback}>
        <Text accessibilityRole="header" style={[styles.feedbackTitle, {color: tokens.colors.heading}]}>{t('speak.feedback_title')}</Text>
        {synthetic ? <Text accessibilityRole="alert" style={[styles.demoBanner, {color: tokens.colors.attention, borderColor: tokens.colors.attention}]}>{t('speak.demo')}</Text> : null}
        <Metric label={t('speaking.pronunciation')} value={pronunciation?.pron_score} />
        <Metric label={t('speaking.fluency')} value={pronunciation?.fluency_score} />
        {weakWords.length ? (
          <View style={styles.evidence}>
            <OrenaLabel>{t('speak.focus')}</OrenaLabel>
            {weakWords.map((word) => (
              <View key={word.word} style={styles.evidenceWord}>
                <View style={styles.evidenceHead}>
                  <Text style={[styles.strong, {color: tokens.colors.text}]}>{word.word}</Text>
                  {typeof word.accuracy_score === 'number' ? <Text style={{color: tokens.colors.mutedText}}>{Math.round(word.accuracy_score)}</Text> : null}
                </View>
                {word.error_type ? <Text style={[styles.evidenceReason, {color: tokens.colors.faintText}]}>{word.error_type}</Text> : null}
                {word.phonemes?.length ? (
                  <View style={styles.phonemes}>
                    <Text style={[styles.evidenceReason, {color: tokens.colors.faintText}]}>{t('speak.phonemes')}</Text>
                    {word.phonemes.slice(0, 8).map((phoneme, position) => (
                      <Text key={position} style={[styles.token, {color: tokens.colors.mutedText, backgroundColor: tokens.colors.surfaceSunken}]}>
                        {phoneme.phoneme}{typeof phoneme.accuracy_score === 'number' ? ` ${Math.round(phoneme.accuracy_score)}` : ''}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
        {pronunciationStatus === 'loading' ? <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.mutedText}}>{t('speak.busy')}</Text> : null}
        {pronunciationStatus === 'unavailable' ? <Text accessibilityRole="alert" style={{color: tokens.colors.attention}}>{t('speak.pron_unavailable')}</Text> : null}

        <View style={[styles.feedbackRule, {backgroundColor: tokens.colors.border}]} />
        <Metric label={t('speak.transcript_match')} value={dimensions?.content_match} />

        {evaluation ? (
          <View style={styles.evaluation}>
            <OrenaLabel>{t('speak.eval_title')}</OrenaLabel>
            <PanelCopy>{t('speak.eval_intro')}</PanelCopy>
            {dimensions?.transcription_confidence != null ? <Text style={{color: tokens.colors.text}}>{t('speak.eval_transcription')}: {Math.round(dimensions.transcription_confidence)}</Text> : null}
            {dimensions?.content_match != null ? <Text style={{color: tokens.colors.text}}>{t('speak.eval_content')}: {Math.round(dimensions.content_match)}</Text> : null}
            {dimensions?.pronunciation != null ? <Text style={{color: tokens.colors.text}}>{t('speaking.pronunciation')}: {Math.round(dimensions.pronunciation)}</Text> : null}
            {dimensions?.fluency != null ? <Text style={{color: tokens.colors.text}}>{t('speaking.fluency')}: {Math.round(dimensions.fluency)}</Text> : null}
            {/* The reference prints this row and says what it is: nothing here
                assesses proficiency. */}
            <Text style={{color: tokens.colors.mutedText}}>{t('speak.eval_proficiency')}: {t('speak.not_assessed')}</Text>
          </View>
        ) : null}

        {evaluation?.highlights?.length ? (
          <View style={styles.feedbackList}>
            <OrenaLabel>{t('speak.highlights')}</OrenaLabel>
            {evaluation.highlights.map((item, position) => <Text key={position} style={{color: tokens.colors.text}}>{item}</Text>)}
          </View>
        ) : null}
        {nextSteps.length ? (
          <View style={styles.feedbackList}>
            <OrenaLabel>{t('speaking.next_steps')}</OrenaLabel>
            {nextSteps.map((step, position) => (
              <Text key={`${step.kind}-${position}`} style={{color: tokens.colors.text}}>
                {t(stepMessage[step.kind] ?? 'speaking.next_steps')}{step.words?.length ? `: ${step.words.join(', ')}` : ''}
              </Text>
            ))}
          </View>
        ) : null}

        <PanelCopy>{scored ? t('speak.disclaimer') : t('speak.run_feedback')}</PanelCopy>
      </Card>

      {saveFailed ? <Panel><OrenaLabel>{t('speak.history_title')}</OrenaLabel><Text accessibilityRole="alert" style={{color: tokens.colors.attention}}>{t('speak.save_failed')}</Text></Panel> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {flexGrow: 1, padding: 16, gap: 14, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  emptyCard: {padding: 20, gap: 12},
  emptyTitle: {fontSize: 22, fontWeight: '700', lineHeight: 30},
  introBlock: {gap: 8},

  // `.o-exercise{padding:18px}` and `.o-exercise-kicker{flex-wrap:wrap}`
  exercise: {padding: 18, gap: 12},
  exerciseKicker: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  exercisePrompt: {fontSize: 21, fontWeight: '600', lineHeight: 30},
  exerciseMeta: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10},

  speakHeading: {fontSize: 15, fontWeight: '600'},
  // `.o-ref-nav{order:3;width:100%;justify-content:space-between}`
  refHead: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10},
  refLead: {fontSize: 13, flexShrink: 1},
  refNav: {width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  refCount: {fontSize: 13},
  // `.o-ref-card{gap:12px;padding:12px 14px;row-gap:10px}`
  refCard: {paddingVertical: 12, paddingHorizontal: 14, gap: 12},
  videoFrame: {borderRadius: 15, overflow: 'hidden'},
  refControls: {flexDirection: 'row', alignItems: 'center', gap: 12},
  roundButton: {width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
  refMeta: {flex: 1, gap: 2},
  refMetaTitle: {fontSize: 14, fontWeight: '600'},
  refMetaTime: {fontSize: 12, fontVariant: ['tabular-nums']},
  rateButton: {minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  rateValue: {fontSize: 13, fontWeight: '600'},
  refText: {gap: 6},
  refSource: {fontSize: 17, lineHeight: 26},
  cjk: {lineHeight: 34},

  // `.o-rec-row{grid-template-columns:minmax(0,1fr);gap:14px;padding:16px}`
  recorder: {padding: 16, gap: 14},
  recState: {gap: 4},
  recStatus: {fontSize: 15, fontWeight: '600'},
  recClock: {fontSize: 12, fontVariant: ['tabular-nums']},
  recMeter: {height: 8, borderRadius: 999, overflow: 'hidden'},
  recMeterFill: {height: '100%', borderRadius: 999},
  recButtonRow: {alignItems: 'center'},
  // `.o-rec-button{width:54px;height:54px}` at the phone breakpoint.
  recButton: {width: 54, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
  recDivider: {height: 1},
  // `.o-rec-playback{padding:14px 16px;gap:12px;flex-wrap:wrap}`
  recPlayback: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  recTranscript: {gap: 8},
  recTranscriptHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sourceCheck: {gap: 8, paddingTop: 4},
  sourceCheckHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sourceTokens: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6},
  token: {fontSize: 13, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, overflow: 'hidden'},

  // `.o-speak-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}`
  // with `.o-speak-feedback{grid-column:1 / -1}`.
  speakActions: {gap: 10},
  speakActionsRow: {flexDirection: 'row', gap: 10},
  speakActionCell: {flex: 1},

  // `.o-feedback{padding:18px}`
  feedback: {padding: 18, gap: 14},
  feedbackTitle: {fontSize: 17, fontWeight: '700'},
  demoBanner: {fontSize: 12, lineHeight: 18, borderWidth: 1, borderRadius: 10, padding: 8},
  feedbackRule: {height: 1},
  metric: {gap: 6},
  metricLabel: {fontSize: 14, fontWeight: '600'},
  metricBody: {flexDirection: 'row', alignItems: 'center', gap: 12},
  ring: {width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
  ringPending: {fontSize: 16},
  ringValue: {position: 'absolute', fontSize: 13, fontWeight: '700'},
  metricBand: {fontSize: 13},
  evidence: {gap: 10},
  evidenceWord: {gap: 4},
  evidenceHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  evidenceReason: {fontSize: 11},
  phonemes: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6},
  evaluation: {gap: 4},
  feedbackList: {gap: 4},

  rowButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 46, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1},
  rowButtonCopy: {flex: 1, gap: 1},
  rowButtonLabel: {fontSize: 14, fontWeight: '500'},
  rowButtonSub: {fontSize: 11},
  iconButton: {width: 40, height: 40, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  strong: {fontWeight: '600'},
});
