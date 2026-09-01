import {useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode} from 'react';
import {AppState, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View} from 'react-native';
import YoutubePlayer, {type YoutubeIframeRef} from 'react-native-youtube-iframe';
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
import {addListenedSeconds, listeningHabitSnapshot, saveListeningGoal, type ListeningHabitSnapshot} from '../../src/features/listening/listeningHabit';
import {listMediaLessons, rememberMediaLesson, type MediaLessonEntry} from '../../src/features/listening/mediaLessonHistory';
import {MAX_LISTENING_EVALUATION_UNITS, MAX_LISTENING_RECONSTRUCTION_CHARS, listeningUnits, playbackAvailable, practiceSummary, stamp, textMatch, type ListeningMode, type SegmentPractice} from '../../src/features/listening/listeningDomain';
import type {ResumeState} from '../../src/api/mediaClient';
import type {KeyValueStorage} from '../../src/storage/boundedCache';
import {Button as OrenaButton, Card, Chip, Label as OrenaLabel, Panel, PanelCopy} from '../../src/components/orena';
import {OrenaIcon, type OrenaIconName} from '../../src/components/OrenaIcon';

/**
 * Ported from static/becoming/screens/listening.js and orena/listening.css.
 *
 * The web's "video" is a YouTube IFrame Player API embed
 * (components/media-player.js's playbackAdapter(), youtube-nocookie.com) --
 * not a self-hosted file. The backend confirms this: every playback record the
 * server ever produces has `kind: "embed"` (writing_coach/media_providers/youtube.py,
 * the only provider registered), so there is no other playback shape to
 * support, and react-native-youtube-iframe wraps that same official IFrame
 * Player API.
 *
 * The composition here is the web's phone breakpoint (`@media (max-width:1023px)`
 * in orena/listening.css), not a redrawn mobile screen: one column, the player
 * card pinned at the top while the transcript scrolls beneath it, the transcript
 * holding its own 52dvh scroll because smart-follow scrolls that container, and
 * the transport pinned across the bottom. Before a lesson is ready the screen is
 * an ordinary page -- masthead, import, history, requirements, goal.
 *
 * Still to port: the Shadowing Studio's take recorder. The mode is offered and
 * routes to Speaking, which is where this product's recognition and evaluation
 * live; the in-studio takes are a separate batch.
 */

export type ListeningScreenProps = {client?: ApiClient; resumeStorage?: KeyValueStorage; mediaResumeStorage?: KeyValueStorage};

// The only playback shape the backend ever produces is {kind:"embed", provider:"youtube",
// url:"https://www.youtube-nocookie.com/embed/{id}"} -- matches web's playbackAdapter().
function extractYouTubeVideoId(playback: {kind: string; provider: string; url: string} | undefined): string | null {
  if (!playback || playback.kind !== 'embed' || playback.provider !== 'youtube') return null;
  const match = /\/embed\/([A-Za-z0-9_-]{11})(?:[/?]|$)/.exec(playback.url);
  return match ? match[1]! : null;
}

const SEEK_SECONDS = 5;
const RATES = [0.75, 1, 1.25] as const;
const rateLabel = (rate: number) => `${rate.toFixed(2).replace(/0$/, '')}x`;

/** `.o-icon-button`: a 40px square that carries one 20px glyph. */
function IconButton({icon, label, onPress, disabled = false, pressed}: {icon: OrenaIconName; label: string; onPress: () => void; disabled?: boolean; pressed?: boolean}) {
  const {tokens} = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled, selected: pressed}}
      disabled={disabled}
      onPress={onPress}
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

/** `.o-tab`: the Original / Meaning pair, and the vocabulary / notes pair. */
function Tab({label, active, disabled = false, onPress}: {label: string; active: boolean; disabled?: boolean; onPress: () => void}) {
  const {tokens} = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{selected: active, disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tab, {
        backgroundColor: active ? tokens.colors.surface : 'transparent',
        borderColor: active ? tokens.colors.borderStrong : 'transparent',
        opacity: disabled ? 0.45 : 1,
      }]}
    >
      <Text style={[styles.tabLabel, {color: active ? tokens.colors.text : tokens.colors.mutedText}]}>{label}</Text>
    </Pressable>
  );
}

/** `.context-label`: the small caps label above an intro list. */
function ContextLabel({children}: {children: string}) {
  const {tokens} = useTheme();
  return <Text style={[styles.contextLabel, {color: tokens.colors.faintText}]}>{children}</Text>;
}

/**
 * `skillMasthead()`: the screen's identity, kept on every state. The stat is
 * prepared lessons -- real per-device evidence of work done, not a placeholder.
 */
function Masthead({name, purpose, stat}: {name: string; purpose?: string; stat?: {value: number; label: string} | null}) {
  const {tokens} = useTheme();
  return (
    <View style={styles.masthead}>
      <View style={styles.mastheadIdentity}>
        <Text accessibilityRole="header" style={[styles.mastheadName, {color: tokens.colors.heading}]}>{name}</Text>
        {purpose ? <Text style={[styles.mastheadPurpose, {color: tokens.colors.mutedText}]}>{purpose}</Text> : null}
      </View>
      {stat ? (
        <View style={[styles.mastheadStat, {backgroundColor: tokens.colors.accentTint}]}>
          <Text style={[styles.mastheadValue, {color: tokens.colors.accent}]}>{stat.value}</Text>
          <Text style={[styles.mastheadStatLabel, {color: tokens.colors.mutedText}]}>{stat.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * `modeSwitcher()`: name, one line of what the mode is for, and the selected
 * card carrying the accent. Active and Shadowing need real playback, so they
 * are disabled rather than hidden when the provider gives us nothing to play.
 */
function ModeSwitch({mode, playbackReady, onMode}: {mode: ListeningMode; playbackReady: boolean; onMode: (mode: ListeningMode) => void}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const card = (key: ListeningMode, name: string, sub: string, icon: OrenaIconName, disabled: boolean) => {
    const active = mode === key;
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityState={{selected: active, disabled}}
        disabled={disabled}
        onPress={() => onMode(key)}
        style={[styles.modeCard, {
          borderColor: active ? tokens.colors.accent : tokens.colors.border,
          backgroundColor: active ? tokens.colors.accentTint : tokens.colors.surface,
          opacity: disabled ? 0.45 : 1,
        }]}
      >
        <View style={[styles.modeIcon, {borderColor: tokens.depth.badgeEdge, backgroundColor: tokens.colors.surface}]}>
          <OrenaIcon name={icon} size={18} color={active ? tokens.colors.accent : tokens.colors.mutedText} />
        </View>
        <View style={styles.modeCopy}>
          <Text style={[styles.modeName, {color: active ? tokens.colors.accent : tokens.colors.text}]}>{name}</Text>
          <Text style={[styles.modeSub, {color: tokens.colors.mutedText}]}>{sub}</Text>
        </View>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={styles.modeSwitch}>
      {card('follow', t('listen.mode_follow'), t('listen.follow_sub'), 'rubric', false)}
      {card('active', t('listen.mode_active'), t('listen.active_sub'), 'listen', !playbackReady)}
      {card('shadowing', t('listen.mode_shadowing'), t('listen.shadow_sub'), 'speak', !playbackReady)}
    </View>
  );
}

/** `listeningHeader()`: kicker, two-line headline, lead, focus mode, switcher. */
function ListeningHeader({mode, playbackReady, focus, onFocus, onMode}: {mode: ListeningMode; playbackReady: boolean; focus: boolean; onFocus: () => void; onMode: (mode: ListeningMode) => void}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <View style={styles.listenHead}>
      <Text style={[styles.kicker, {color: tokens.colors.faintText}]}>{t('listen.kicker')}</Text>
      <Text accessibilityRole="header" style={[styles.headline, {color: tokens.colors.heading}]}>{t('listen.headline')}</Text>
      <Text style={[styles.lead, {color: tokens.colors.mutedText}]}>{t('listen.lead')}</Text>
      <OrenaButton label={focus ? t('listen.leave_focus') : t('listen.focus_mode')} variant="outline" compact onPress={onFocus} />
      <ModeSwitch mode={mode} playbackReady={playbackReady} onMode={onMode} />
    </View>
  );
}

/**
 * `playerCard`: the video, its own progress track, the media caption, and the
 * rate / transport / mute row. On a phone `.o-player` is `position:sticky;top:0`
 * -- the video is the thing being followed -- so it is rendered outside the
 * scroll container rather than inside it.
 */
function PlayerCard({lesson, videoId, playing, muted, rate, elapsedMs, onChangeState, onTogglePlay, onSeek, onToggleMute, onCycleRate, playerRef}: {
  lesson: MediaLesson; videoId: string | null; playing: boolean; muted: boolean; rate: number; elapsedMs: number;
  onChangeState: (playing: boolean) => void; onTogglePlay: () => void; onSeek: (delta: number) => void;
  onToggleMute: () => void; onCycleRate: () => void; playerRef: MutableRefObject<YoutubeIframeRef | null>;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const duration = Number(lesson.asset.duration_ms);
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const fill = hasDuration ? Math.min(100, Math.round((elapsedMs / duration) * 100)) : 0;
  return (
    <Card style={styles.player}>
      {videoId ? (
        <View style={styles.videoFrame}>
          <YoutubePlayer ref={playerRef} height={190} videoId={videoId} play={playing} mute={muted} playbackRate={rate} onChangeState={(state: string) => onChangeState(state === 'playing')} />
        </View>
      ) : (
        <PanelCopy>{t('listening.playback_unavailable')}</PanelCopy>
      )}
      <View style={styles.playerTrack}>
        <View accessibilityRole="progressbar" accessibilityLabel={lesson.asset.title || ''} style={[styles.playerBar, {backgroundColor: tokens.colors.surfaceSunken}]}>
          <View style={[styles.playerFill, {width: `${fill}%`, backgroundColor: tokens.colors.accent}]} />
        </View>
        <Text style={[styles.playerTime, {color: tokens.colors.faintText}]}>{stamp(elapsedMs)}</Text>
        <Text style={[styles.playerTime, {color: tokens.colors.faintText}]}>{hasDuration ? stamp(duration) : '—'}</Text>
      </View>
      <View style={styles.playerMeta}>
        <Text style={[styles.playerKicker, {color: tokens.colors.faintText}]}>{t('listen.shared_media')}</Text>
        <Text style={[styles.playerTitle, {color: tokens.colors.heading}]} numberOfLines={2}>{lesson.asset.title || t('listening.title')}</Text>
        <Text style={[styles.playerProvider, {color: tokens.colors.mutedText}]}>{lesson.asset.source_provider || 'media'}</Text>
      </View>
      <View style={styles.playerControls}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listen.speed')} onPress={onCycleRate} style={[styles.rateButton, {borderColor: tokens.colors.border}]}>
          <Text style={[styles.rateValue, {color: tokens.colors.text}]}>{rateLabel(rate)}</Text>
        </Pressable>
        <View style={styles.playerTransport}>
          <IconButton icon="skipBack" label={t('listening.skip_back')} onPress={() => onSeek(-SEEK_SECONDS)} disabled={!videoId} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? t('listening.pause') : t('listening.play')}
            disabled={!videoId}
            onPress={onTogglePlay}
            style={[styles.playButton, {backgroundColor: tokens.colors.accent, opacity: videoId ? 1 : 0.45}]}
          >
            <OrenaIcon name={playing ? 'pause' : 'play'} size={22} color={tokens.colors.onAccent} />
          </Pressable>
          <IconButton icon="skipForward" label={t('listening.skip_forward')} onPress={() => onSeek(SEEK_SECONDS)} disabled={!videoId} />
        </View>
        <IconButton icon={muted ? 'volumeOff' : 'volume'} label={t('listen.subtitles')} onPress={onToggleMute} pressed={muted} />
      </View>
    </Card>
  );
}

/** `segmentNavigation()`: previous, replay, next -- the same row both modes get. */
function SegmentNavigation({index, total, onPrevious, onReplay, onNext}: {index: number; total: number; onPrevious: () => void; onReplay: () => void; onNext: () => void}) {
  const {t} = useI18n();
  return (
    <View accessibilityLabel={t('listen.select')} style={styles.segmentNav}>
      <OrenaButton label={t('listen.previous')} variant="outline" compact disabled={index <= 0} onPress={onPrevious} />
      <OrenaButton label={t('listen.replay')} variant="outline" compact onPress={onReplay} />
      <OrenaButton label={t('listen.next')} variant="outline" compact disabled={index < 0 || index >= total - 1} onPress={onNext} />
    </View>
  );
}

/** `.o-legend--inline`: the four word-role bands, shared with Writing. */
function RoleLegend() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const roles: [string, string][] = [
    ['verb', tokens.colors.roleVerb], ['noun', tokens.colors.roleNoun],
    ['adjective', tokens.colors.roleAdjective], ['adverb', tokens.colors.roleAdverb],
  ];
  return (
    <View style={styles.legend}>
      {roles.map(([role, color]) => (
        <View key={role} style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: color}]} />
          <Text style={[styles.legendLabel, {color: tokens.colors.mutedText}]}>{t(`write.role_${role}` as never)}</Text>
        </View>
      ))}
    </View>
  );
}

type Segment = NonNullable<MediaLesson['transcript']>['segments'][number];

/**
 * `followWorkspace()`: Original / Meaning as one visible choice over an
 * independent pair of switches, the timestamped segment rows with the inline
 * meaning, the per-segment actions on the selected row, and the foot carrying
 * the legend and the word count.
 */
function FollowWorkspace({lesson, segments, selectedId, original, meaning, maxHeight, onToggleOriginal, onToggleMeaning, onSelect, onShadow, onOpenSpeaking, onFollowPlaying, index, onPrevious, onReplay, onNext}: {
  lesson: MediaLesson; segments: Segment[]; selectedId: string; original: boolean; meaning: boolean; maxHeight: number;
  onToggleOriginal: () => void; onToggleMeaning: () => void; onSelect: (id: string) => void;
  onShadow: () => void; onOpenSpeaking: () => void; onFollowPlaying: () => void;
  index: number; onPrevious: () => void; onReplay: () => void; onNext: () => void;
}) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const translations = useMemo(() => new Map((lesson.translations || []).map((item) => [item.segment_id, item.translated_meaning])), [lesson.translations]);
  const status = (lesson as {translation?: {status?: string}}).translation?.status;
  const notRequired = status === 'not_required';
  const preparing = !status;
  const degraded = status === 'unavailable' || status === 'too_large';
  const statusMessage = preparing ? t('listen.preparing') : status === 'unavailable' ? t('listen.translation_unavailable') : null;
  const meaningBlocked = preparing || notRequired || degraded;
  const words = segments.reduce((total, segment) => total + listeningUnits(segment.original_text, lesson.asset.source_language).length, 0);
  return (
    <Card style={styles.transcriptCard}>
      <View style={styles.tcardHead}>
        <View style={[styles.tabs, {backgroundColor: tokens.colors.surfaceSunken}]}>
          <Tab label={t('listen.original')} active={original} onPress={onToggleOriginal} />
          <Tab label={t('listen.meaning')} active={meaning} disabled={meaningBlocked} onPress={onToggleMeaning} />
        </View>
        <View style={styles.switchField}>
          <Text style={[styles.switchLabel, {color: tokens.colors.mutedText}]}>{t('listen.word_timing')}</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={t('listen.word_timing')}
            accessibilityState={{checked: original}}
            onPress={onToggleOriginal}
            style={[styles.switchTrack, {backgroundColor: original ? tokens.colors.accent : tokens.colors.surfaceSunken, borderColor: tokens.colors.border}]}
          >
            <View style={[styles.switchThumb, {backgroundColor: tokens.colors.surface, alignSelf: original ? 'flex-end' : 'flex-start'}]} />
          </Pressable>
        </View>
        <IconButton icon="listen" label={t('listen.jump_playing')} onPress={onFollowPlaying} />
      </View>

      {notRequired ? <Text accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.mutedText}]}>{t('listen.not_required')}</Text> : null}
      {statusMessage ? <Text accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.mutedText}]}>{statusMessage}</Text> : null}

      <ScrollView style={{maxHeight}} nestedScrollEnabled contentContainerStyle={styles.segmentList}>
        {segments.map((segment) => {
          const isSelected = segment.segment_id === selectedId;
          const inline = meaning && !notRequired && !degraded ? translations.get(segment.segment_id) : '';
          return (
            <View key={segment.segment_id} style={[styles.segmentRow, isSelected && {backgroundColor: tokens.colors.accentTint, borderColor: tokens.colors.accent}]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={segment.original_text}
                accessibilityState={{selected: isSelected}}
                onPress={() => onSelect(segment.segment_id)}
                style={styles.segmentMain}
              >
                <Text style={[styles.segmentTime, {color: tokens.colors.faintText}]}>{stamp(segment.start_ms)}</Text>
                <View style={styles.segmentCopy}>
                  {original ? <Text style={[styles.segmentText, {color: tokens.colors.text}, locale === 'zh' && styles.cjk]}>{segment.original_text}</Text> : null}
                  {inline ? <Text style={[styles.segmentMeaning, {color: tokens.colors.mutedText}]}>{inline}</Text> : null}
                </View>
              </Pressable>
              {isSelected ? (
                <View style={styles.segmentActions}>
                  <OrenaButton label={t('listen.shadow_this')} variant="outline" compact onPress={onShadow} accessibilityHint={t('listen.shared')} />
                  <OrenaButton label={t('listen.open_speaking')} compact onPress={onOpenSpeaking} accessibilityHint={t('listen.shared')} />
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.tcardFoot}>
        <RoleLegend />
        <Text style={[styles.tcardCount, {color: tokens.colors.faintText}]}>{words} {t('listen.words')}</Text>
      </View>

      <SegmentNavigation index={index} total={segments.length} onPrevious={onPrevious} onReplay={onReplay} onNext={onNext} />
      <PanelCopy>{t('listen.shared')}</PanelCopy>
    </Card>
  );
}

/**
 * `activeWorkspace()`: the reconstruction exercise. The transcript line is not
 * printed in the list here -- that would hand the learner the answer -- so rows
 * carry only their position, and the line appears in the result once checked or
 * revealed.
 */
function ActiveWorkspace({lesson, segments, selectedId, session, validation, persistence, maxHeight, onSelect, onDraft, onCheck, onReveal, onRetry, index, onPrevious, onReplay, onNext}: {
  lesson: MediaLesson; segments: Segment[]; selectedId: string; session: Record<string, SegmentPractice>;
  validation: string; persistence: string; maxHeight: number;
  onSelect: (id: string) => void; onDraft: (value: string) => void; onCheck: () => void; onReveal: () => void; onRetry: () => void;
  index: number; onPrevious: () => void; onReplay: () => void; onNext: () => void;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const segment = segments.find((item) => item.segment_id === selectedId);
  const practice = session[selectedId];
  const visible = practice?.presentation === 'checked' || practice?.presentation === 'revealed';
  const lastAttempt = practice?.presentation === 'checked' ? practice.attempts[practice.attempts.length - 1] ?? null : null;
  const summary = practiceSummary(session, segments.length);
  const evaluable = Boolean(segment) && listeningUnits(segment!.original_text, lesson.asset.source_language).length <= MAX_LISTENING_EVALUATION_UNITS;
  const translations = new Map((lesson.translations || []).map((item) => [item.segment_id, item.translated_meaning]));
  const quality = lastAttempt?.result.exact ? t('listen.exact') : (lastAttempt?.result.accuracy_percent ?? 0) >= 80 ? t('listen.close') : t('listen.try_again');
  return (
    <Card style={styles.transcriptCard}>
      <View style={styles.toolbar}>
        <Text style={[styles.toolbarTitle, {color: tokens.colors.heading}]}>{t('listen.practice')}</Text>
        <Text style={[styles.toolbarSub, {color: tokens.colors.mutedText}]}>{t('listen.disclaimer')}</Text>
      </View>
      <SegmentNavigation index={index} total={segments.length} onPrevious={onPrevious} onReplay={onReplay} onNext={onNext} />
      <ScrollView style={{maxHeight: Math.round(maxHeight * 0.5)}} nestedScrollEnabled contentContainerStyle={styles.segmentList}>
        {segments.map((item, position) => {
          const isSelected = item.segment_id === selectedId;
          return (
            <Pressable
              key={item.segment_id}
              accessibilityRole="button"
              accessibilityLabel={`${t('listen.segment')} ${position + 1}`}
              accessibilityState={{selected: isSelected}}
              onPress={() => onSelect(item.segment_id)}
              style={[styles.segmentRow, styles.segmentMain, isSelected && {backgroundColor: tokens.colors.accentTint, borderColor: tokens.colors.accent}]}
            >
              <Text style={[styles.segmentTime, {color: tokens.colors.faintText}]}>{stamp(item.start_ms)}</Text>
              <Text style={[styles.segmentText, {color: tokens.colors.text}]}>{t('listen.segment')} {position + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {evaluable ? (
        <View style={styles.activeForm}>
          <OrenaLabel>{t('listen.prompt')}</OrenaLabel>
          <TextInput
            accessibilityLabel={t('listen.prompt')}
            value={practice?.draft ?? ''}
            onChangeText={onDraft}
            maxLength={MAX_LISTENING_RECONSTRUCTION_CHARS}
            multiline
            style={[styles.input, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]}
          />
          {validation ? <Text accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.attention}]}>{validation}</Text> : null}
          <View style={styles.activeActions}>
            <OrenaButton label={t('listen.check')} onPress={onCheck} />
            <OrenaButton label={t('listen.reveal')} variant="outline" onPress={onReveal} />
            {visible ? <OrenaButton label={t('listen.retry')} variant="outline" onPress={onRetry} /> : null}
          </View>
        </View>
      ) : (
        <Text accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.attention}]}>{t('listen.segment_too_large')}</Text>
      )}
      {visible && segment ? (
        <View accessibilityLiveRegion="polite" style={styles.activeResult}>
          {lastAttempt ? (
            <>
              <Text style={{color: tokens.colors.text}}><Text style={styles.strong}>{t('listen.your_answer')}</Text> {lastAttempt.answer}</Text>
              <Text style={{color: tokens.colors.text}}><Text style={styles.strong}>{t('listen.text_match')}</Text> {lastAttempt.result.accuracy_percent}% · {quality}</Text>
            </>
          ) : null}
          <Text style={{color: tokens.colors.text}}><Text style={styles.strong}>{t('listen.original')}</Text> {segment.original_text}</Text>
          {translations.get(segment.segment_id) ? <Text style={{color: tokens.colors.mutedText}}>{translations.get(segment.segment_id)}</Text> : null}
          <PanelCopy>{t('listen.disclaimer')}</PanelCopy>
        </View>
      ) : null}
      <View accessibilityLiveRegion="polite" style={styles.activeSummary}>
        <OrenaLabel>{t('listen.progress')}</OrenaLabel>
        <Text style={{color: tokens.colors.mutedText}}>{t('listen.practiced')} {summary.practiced_segments} / {summary.total_segments}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{t('listen.attempts')} {summary.checked_attempts}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{t('listen.exact_count')} {summary.exact_match_segments}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{t('listen.revealed')} {summary.revealed_only_segments}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{t('listen.average')} {summary.average_best_text_match === null ? '—' : `${summary.average_best_text_match}%`}</Text>
      </View>
      {persistence ? <Text accessibilityLiveRegion="polite" style={[styles.statusLine, {color: tokens.colors.faintText}]}>{persistence}</Text> : null}
    </Card>
  );
}

/**
 * `currentSegmentPanel()`: the line in front of the learner, set large, with the
 * meaning behind a reveal. In Active mode it shows only where the learner is and
 * how to hear it again -- printing the line would hand over the answer.
 */
function CurrentSegmentPanel({segment, meaning, mode, showOriginal, showMeaning, onReplay}: {
  segment: Segment; meaning: string; mode: ListeningMode; showOriginal: boolean; showMeaning: boolean; onReplay: () => void;
}) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  return (
    <Card style={styles.segmentNow}>
      <View style={[styles.segmentRule, {backgroundColor: tokens.colors.accent}]} />
      <View style={styles.segmentNowHead}>
        <OrenaLabel>{t('listen.current_segment')}</OrenaLabel>
        <IconButton icon="volume" label={t('listen.replay')} onPress={onReplay} />
      </View>
      <Text style={[styles.segmentTime, {color: tokens.colors.faintText}]}>{stamp(segment.start_ms)} – {stamp(segment.end_ms)}</Text>
      {mode === 'active' ? (
        <PanelCopy>{t('listen.prompt')}</PanelCopy>
      ) : (
        <>
          {showOriginal ? <Text style={[styles.segmentNowText, {color: tokens.colors.text}, locale === 'zh' && styles.cjk]}>{segment.original_text}</Text> : null}
          {showMeaning && meaning ? <Text style={[styles.segmentNowMeaning, {color: tokens.colors.mutedText}]}>{meaning}</Text> : null}
          {showMeaning && !meaning ? <PanelCopy>{t('listen.preparing_body')}</PanelCopy> : null}
        </>
      )}
    </Card>
  );
}

/**
 * `vocabularyFocusPanel()`: only words already in the learner's library are
 * named. Nothing in this product classifies a transcript any other way, so the
 * reference's new-word and grammar bands are absent rather than guessed. It is
 * withheld in Active mode and with the original switched off, because the saved
 * words are words of the line.
 */
function VocabularyFocusPanel({hits}: {hits: {word: string; phonetic?: string; definition?: string}[]}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <Card style={styles.panelCard}>
      <OrenaLabel>{t('listen.vocab_focus')}</OrenaLabel>
      {hits.length ? (
        <>
          <View style={styles.focusWords}>
            {hits.map((item) => (
              <View key={item.word} style={styles.focusWord}>
                <Text style={[styles.strong, {color: tokens.colors.text}]}>{item.word}</Text>
                {item.phonetic ? <Text style={[styles.focusPhonetic, {color: tokens.colors.faintText}]}>{item.phonetic}</Text> : null}
                {item.definition ? <Text style={{color: tokens.colors.mutedText}}>{item.definition}</Text> : null}
              </View>
            ))}
          </View>
          <PanelCopy>{t('listen.vocab_focus_note')}</PanelCopy>
        </>
      ) : (
        <PanelCopy>{t('listen.vocab_focus_empty')}</PanelCopy>
      )}
    </Card>
  );
}

/** `goalPanel()`: the device-local listening habit, with its two meters. */
function GoalPanel() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const [snapshot, setSnapshot] = useState<ListeningHabitSnapshot | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const refresh = useCallback(() => { void listeningHabitSnapshot().then(setSnapshot); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  if (!snapshot || snapshot.status !== 'ok') return null;
  const mins = (seconds: number) => Math.floor(seconds / 60);
  const weeklyGoal = snapshot.dailyGoalMinutes * 7;
  const bar = (value: number, total: number) => (
    <View style={[styles.goalTrack, {backgroundColor: tokens.colors.surfaceSunken}]}>
      <View style={[styles.goalFill, {width: `${total ? Math.min(100, Math.round((value / total) * 100)) : 0}%`, backgroundColor: tokens.colors.accent}]} />
    </View>
  );
  return (
    <Panel>
      <OrenaLabel>{t('listening.goal_title')}</OrenaLabel>
      <View style={styles.goalRow}><Text style={{color: tokens.colors.text}}>{t('listening.daily')}</Text><Text style={{color: tokens.colors.text}}>{mins(snapshot.todaySeconds)} / {snapshot.dailyGoalMinutes} {t('listening.minutes')}</Text></View>
      {bar(mins(snapshot.todaySeconds), snapshot.dailyGoalMinutes)}
      <View style={styles.goalRow}><Text style={{color: tokens.colors.text}}>{t('listening.weekly')}</Text><Text style={{color: tokens.colors.text}}>{mins(snapshot.weekSeconds)} / {weeklyGoal} {t('listening.minutes')}</Text></View>
      {bar(mins(snapshot.weekSeconds), weeklyGoal)}
      {editing ? (
        <View style={styles.goalEdit}>
          <TextInput accessibilityLabel={t('listening.goal_prompt')} value={draft} onChangeText={setDraft} keyboardType="number-pad" placeholder={String(snapshot.dailyGoalMinutes)} placeholderTextColor={tokens.colors.mutedText} style={[styles.goalInput, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong}]} />
          <OrenaButton label={t('listening.save_goal')} compact onPress={() => { const minutes = Number(draft); if (Number.isFinite(minutes) && minutes > 0) void saveListeningGoal(minutes).then(refresh); setEditing(false); setDraft(''); }} />
        </View>
      ) : (
        <OrenaButton label={t('listening.edit_goals')} variant="outline" compact onPress={() => { setDraft(String(snapshot.dailyGoalMinutes)); setEditing(true); }} />
      )}
    </Panel>
  );
}

/** `sourcePanel()`: what this lesson is, and the way back to the provider. */
function SourcePanel({lesson}: {lesson: MediaLesson}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const duration = Number(lesson.asset.duration_ms);
  return (
    <Card style={styles.panelCard}>
      <OrenaLabel>{t('listen.source_video')}</OrenaLabel>
      <View style={styles.sourceMeta}>
        <Text style={[styles.strong, {color: tokens.colors.text}]}>{lesson.asset.title || t('listening.title')}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{lesson.asset.source_provider || 'media'}</Text>
        {Number.isFinite(duration) && duration > 0 ? <Text style={{color: tokens.colors.mutedText}}>{stamp(duration)}</Text> : null}
      </View>
      {lesson.asset.source_url ? (
        <RowButton label={t('listen.view_on_provider')} icon="arrowRight" onPress={() => { void Linking.openURL(lesson.asset.source_url); }} />
      ) : null}
    </Card>
  );
}

/** `.o-row-button`: a full-width row that ends in a glyph. */
function RowButton({label, icon, onPress, sub}: {label: string; icon: OrenaIconName; onPress: () => void; sub?: string}) {
  const {tokens} = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed}) => [styles.rowButton, {borderColor: tokens.colors.border, backgroundColor: pressed ? tokens.colors.surfaceSunken : 'transparent'}]}>
      <View style={styles.rowButtonCopy}>
        <Text style={[styles.rowButtonLabel, {color: tokens.colors.text}]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={[styles.rowButtonSub, {color: tokens.colors.faintText}]}>{sub}</Text> : null}
      </View>
      <OrenaIcon name={icon} size={18} color={tokens.colors.faintText} />
    </Pressable>
  );
}

/**
 * `savedLessonsPanel()`: with the import row off the top of this layout, the way
 * to start a new lesson lives with the lessons.
 */
function SavedLessonsPanel({lessons, onOpen, onNew}: {lessons: MediaLessonEntry[]; onOpen: (url: string) => void; onNew: () => void}) {
  const {t} = useI18n();
  return (
    <Card style={styles.panelCard}>
      <View style={styles.panelHead}>
        <OrenaLabel>{t('listen.saved_lessons')}</OrenaLabel>
        {lessons.length > 3 ? <Chip>{lessons.length}</Chip> : null}
      </View>
      {lessons.length ? (
        <View style={styles.savedList}>
          {lessons.slice(0, 4).map((item) => (
            <RowButton key={item.source_url} label={item.title || item.source_url} sub={item.provider || undefined} icon="arrowRight" onPress={() => onOpen(item.source_url)} />
          ))}
        </View>
      ) : (
        <PanelCopy>{t('listen.no_saved')}</PanelCopy>
      )}
      <RowButton label={t('listen.new_lesson')} icon="write" onPress={onNew} />
    </Card>
  );
}

/**
 * `transportBar()`: the row the reference pins across the bottom. Everything on
 * it already exists on the player card; it is here because on a phone the player
 * scrolls out of reach of the thumb while the transcript is being read.
 */
function TransportBar({playing, muted, rate, onSeek, onPrevious, onNext, onTogglePlay, onToggleMute, onCycleRate, onToggleSubtitles, subtitles}: {
  playing: boolean; muted: boolean; rate: number; subtitles: boolean;
  onSeek: (delta: number) => void; onPrevious: () => void; onNext: () => void;
  onTogglePlay: () => void; onToggleMute: () => void; onCycleRate: () => void; onToggleSubtitles: () => void;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <View style={[styles.transport, {backgroundColor: tokens.colors.surface, borderTopColor: tokens.colors.border}, tokens.elevation.raised]}>
      <IconButton icon="rubric" label={t('listen.subtitles')} onPress={onToggleSubtitles} pressed={subtitles} />
      <View style={styles.transportMain}>
        <IconButton icon="skipBack" label={t('listening.skip_back')} onPress={() => onSeek(-SEEK_SECONDS)} />
        <IconButton icon="chevronDown" label={t('listen.previous')} onPress={onPrevious} />
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('listening.pause') : t('listening.play')} onPress={onTogglePlay} style={[styles.playButton, {backgroundColor: tokens.colors.accent}]}>
          <OrenaIcon name={playing ? 'pause' : 'play'} size={22} color={tokens.colors.onAccent} />
        </Pressable>
        <IconButton icon="chevronUp" label={t('listen.next')} onPress={onNext} />
        <IconButton icon="skipForward" label={t('listening.skip_forward')} onPress={() => onSeek(SEEK_SECONDS)} />
      </View>
      <IconButton icon={muted ? 'volumeOff' : 'volume'} label={t('listen.speed')} onPress={onToggleMute} pressed={muted} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('listen.speed')} onPress={onCycleRate} style={[styles.rateButton, {borderColor: tokens.colors.border}]}>
        <Text style={[styles.rateValue, {color: tokens.colors.text}]}>{rateLabel(rate)}</Text>
      </Pressable>
    </View>
  );
}

/**
 * `.o-studio-bar`: inside the studio the way out is "leave", and the other two
 * modes are not offered alongside the thing being practised. Speaking owns
 * recognition and evaluation; shadowing here is practice only, so the route
 * across is a product contract rather than a convenience link.
 */
function StudioBar({segment, onOpenSpeaking, onLeave, onReplay}: {segment: Segment | undefined; onOpenSpeaking: () => void; onLeave: () => void; onReplay: () => void}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <>
      <View style={styles.studioBar}>
        <Text accessibilityRole="header" style={[styles.studioTitle, {color: tokens.colors.heading}]}>{t('listen.studio_title')}</Text>
        <Text style={[styles.lead, {color: tokens.colors.mutedText}]}>{t('listen.studio_lead')}</Text>
        <View style={styles.studioActions}>
          <OrenaButton label={t('listen.open_speaking')} variant="outline" compact onPress={onOpenSpeaking} />
          <OrenaButton label={t('listen.leave_studio')} variant="outline" compact onPress={onLeave} />
        </View>
      </View>
      {segment ? (
        <Card style={styles.segmentNow}>
          <View style={[styles.segmentRule, {backgroundColor: tokens.colors.accent}]} />
          <View style={styles.segmentNowHead}>
            <OrenaLabel>{t('listen.now_practicing')}</OrenaLabel>
            <IconButton icon="volume" label={t('listen.replay')} onPress={onReplay} />
          </View>
          <Text style={[styles.segmentTime, {color: tokens.colors.faintText}]}>{stamp(segment.start_ms)} – {stamp(segment.end_ms)}</Text>
          <Text style={[styles.segmentNowText, {color: tokens.colors.text}]}>{segment.original_text}</Text>
        </Card>
      ) : null}
      <Panel>
        <OrenaLabel>{t('listen.tips')}</OrenaLabel>
        <PanelCopy>{t('listen.tip1')}</PanelCopy>
        <PanelCopy>{t('listen.tip2')}</PanelCopy>
      </Panel>
    </>
  );
}

export default function ListeningScreen({client: providedClient, resumeStorage = secureListeningResumeStorage, mediaResumeStorage = secureMediaResumeStorage}: ListeningScreenProps) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const {height} = useWindowDimensions();
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
  const [progress, setProgress] = useState<ListeningProgress[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<MediaLessonEntry[]>([]);
  // The two transcript switches. The reference presents them as one Original /
  // Meaning choice, but the model keeps all four combinations -- including both
  // off, which a two-state tab cannot express.
  const [original, setOriginal] = useState(true);
  const [meaning, setMeaning] = useState(true);
  const [focus, setFocus] = useState(false);
  const [session, setSession] = useState<Record<string, SegmentPractice>>({});
  const [validation, setValidation] = useState('');
  const operation = useRef(0);
  const rehydrating = useRef(false);
  const attemptedReadyHandle = useRef<string | null>(null);
  const importMedia = useImportMedia(client, sessionCookie);
  const progressQuery = useListeningProgress(client, sessionCookie, lesson?.asset.asset_id ?? '');
  const saveProgress = useSaveListeningProgress(client, sessionCookie);
  const videoId = useMemo(() => extractYouTubeVideoId(lesson?.playback), [lesson]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const mediaStatus = useMediaImportStatus(mediaResumeHandle, mediaStore, sessionCookie);

  const segments = useMemo(() => lesson?.transcript?.segments ?? [], [lesson]);
  const playbackReady = segments.length > 0 && playbackAvailable(lesson?.playback);
  const selectedIndex = segments.findIndex((segment) => segment.segment_id === selectedId);
  const selected = segments[selectedIndex] ?? segments[0];
  const translationFor = (segmentId: string) => (lesson?.translations || []).find((item) => item.segment_id === segmentId)?.translated_meaning ?? '';

  const refreshHistory = useCallback(() => { void listMediaLessons(locale).then(setHistory); }, [locale]);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);
  useEffect(() => { let mounted = true; void Promise.all([readListeningResume(resumeStorage), readListeningPending(resumeStorage), mediaStore?.read() ?? Promise.resolve(null)]).then(([ready, waiting, media]) => { if (!mounted) return; setResume(ready); setPending(waiting); setMediaResume(media); if (waiting && media) setMediaResumeHandle(media.resumeHandle); }); return () => { mounted = false; }; }, [mediaStore, resumeStorage]);
  useEffect(() => { if (progressQuery.data?.items) setProgress(progressQuery.data.items); }, [progressQuery.data]);
  useEffect(() => { if (!lesson || handoff.assetId !== lesson.asset.asset_id || typeof handoff.segmentId !== 'string') return; if (segments.some((segment) => segment.segment_id === handoff.segmentId)) setSelectedId(handoff.segmentId); }, [handoff.assetId, handoff.segmentId, lesson, segments]);
  useEffect(() => { setPlaying(false); setCurrentTime(0); }, [videoId]);
  useEffect(() => { const subscription = AppState.addEventListener('change', (state) => { if (state === 'background' || state === 'inactive') { setPlaying(false); setNotice(t('listening.interrupted')); } }); return () => subscription.remove(); }, [t]);
  // Polls the player's own clock while playing -- react-native-youtube-iframe has no
  // continuous onProgress callback, unlike the web's timeupdate on the iframe API.
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => { void playerRef.current?.getCurrentTime().then(setCurrentTime); }, 500);
    return () => clearInterval(interval);
  }, [playing]);
  // Device-local habit counter, ported from the web's orena:media-time tick:
  // wall-clock delta between ticks while the position is actually advancing,
  // dropping gaps over 2.5s so a backgrounded or paused player never counts.
  const habitTick = useRef<{time: number; position: number} | null>(null);
  useEffect(() => {
    if (!playing) { habitTick.current = null; return; }
    const now = Date.now();
    const previous = habitTick.current;
    if (previous && now - previous.time < 2500 && currentTime > previous.position) {
      void addListenedSeconds((now - previous.time) / 1000);
    }
    habitTick.current = {time: now, position: currentTime};
  }, [playing, currentTime]);

  const prepare = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized || !sessionCookie || !client) return;
    const current = ++operation.current;
    setSourceUrl(normalized); setNotice(null); setLesson(null); setProgress([]); setSession({}); setValidation('');
    importMedia.mutate({source_url: normalized, target_language: locale, include_word_timing: false, include_translation: true}, {onSuccess: async (next) => {
      if (current !== operation.current) return;
      if (next.asset.processing_state !== 'ready' || !next.transcript?.segments.length) {
        if (next.asset.processing_state === 'processing' && next.import_job?.job_id && mediaStore) {
          const waiting: ListeningPending = {assetId: next.asset.asset_id, mode: mode === 'shadowing' ? 'follow' : mode, sourceUrl: normalized};
          await mediaStore.persist({assetId: next.asset.asset_id, resumeHandle: next.import_job.job_id, status: 'processing', resumable: true});
          await writeListeningPending(waiting, resumeStorage);
          setPending(waiting); setMediaResume({assetId: next.asset.asset_id, resumeHandle: next.import_job.job_id, status: 'processing', resumable: true}); setMediaResumeHandle(next.import_job.job_id);
        }
        setNotice(next.asset.processing_state === 'processing' ? t('listening.processing') : t('listening.no_transcript')); return;
      }
      const restored = resume?.assetId === next.asset.asset_id && resume.sourceUrl === normalized ? resume : null;
      const segment = next.transcript.segments.some((item) => item.segment_id === restored?.segmentId) ? restored!.segmentId : next.transcript.segments[0]!.segment_id;
      // The resume record only ever holds Follow or Active: the studio is a room
      // the learner steps into, not a state a lesson reopens in.
      const nextMode = restored?.mode ?? 'follow';
      rehydrating.current = false;
      setLesson(next); setSelectedId(segment); setMode(nextMode); setResume(null); setPending(null); setMediaResume(null); setMediaResumeHandle(''); await mediaStore?.clear(); await clearListeningPending(resumeStorage);
      await writeListeningResume({assetId: next.asset.asset_id, segmentId: segment, mode: nextMode, sourceUrl: normalized}, resumeStorage);
      // The web keeps a per-device list of prepared lessons so returning to the
      // same material does not mean finding the URL again.
      await rememberMediaLesson({learning_language: locale, source_url: normalized, title: next.asset.title || '', provider: next.asset.source_provider || '', selected_segment_id: segment, mode: nextMode});
      refreshHistory();
    }, onError: () => { if (current === operation.current) { rehydrating.current = false; setNotice(t('listening.unavailable')); } }});
  }, [client, importMedia, locale, mediaStore, mode, refreshHistory, resume, resumeStorage, sessionCookie, t]);

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
  const restart = () => { operation.current += 1; rehydrating.current = false; importMedia.reset(); setLesson(null); setProgress([]); setSession({}); setSourceUrl(''); setNotice(null); setResume(null); setPending(null); setMediaResume(null); setMediaResumeHandle(''); void clearListeningResume(resumeStorage); void clearListeningPending(resumeStorage); void mediaStore?.clear(); };
  const select = (segmentId: string) => {
    setSelectedId(segmentId); setValidation('');
    const segment = segments.find((item) => item.segment_id === segmentId);
    if (segment) void playerRef.current?.seekTo(segment.start_ms / 1000, true);
    if (lesson) void writeListeningResume({assetId: lesson.asset.asset_id, segmentId, mode: mode === 'shadowing' ? 'follow' : mode, sourceUrl: lesson.asset.source_url}, resumeStorage);
  };
  const changeMode = (nextMode: ListeningMode) => {
    setMode(nextMode); setValidation('');
    if (lesson) void writeListeningResume({assetId: lesson.asset.asset_id, segmentId: selectedId, mode: nextMode === 'shadowing' ? 'follow' : nextMode, sourceUrl: lesson.asset.source_url}, resumeStorage);
  };
  const seek = (delta: number) => { void playerRef.current?.getCurrentTime().then((seconds) => playerRef.current?.seekTo(Math.max(0, seconds + delta), true)); };
  const replayCurrent = () => { if (selected) void playerRef.current?.seekTo(selected.start_ms / 1000, true); };
  const step = (delta: number) => { const next = segments[selectedIndex + delta]; if (next) select(next.segment_id); };
  const followPlaying = () => {
    const position = currentTime * 1000;
    const hit = segments.find((segment) => position >= segment.start_ms && position < segment.end_ms);
    if (hit) { setSelectedId(hit.segment_id); setValidation(''); }
  };
  const cycleRate = () => { const next = RATES[(RATES.indexOf(rate as typeof RATES[number]) + 1) % RATES.length]!; setRate(next); };
  const openSpeaking = () => {
    if (!lesson || !selected) return;
    router.push({pathname: '/(app)/speaking', params: {mode: 'shadowing', assetId: lesson.asset.asset_id, segmentId: selected.segment_id, sourceUrl: lesson.asset.source_url, referenceText: selected.original_text}} as never);
  };

  /**
   * Saving a checked or revealed segment. The server keeps the counters; the
   * text match itself is computed here, exactly as listening.js computes it in
   * the browser, and is a comparison with this transcript rather than a score.
   */
  const commit = (presentation: 'checked' | 'revealed') => {
    if (!lesson || !selected) return;
    const practice = session[selected.segment_id];
    const answer = (practice?.draft ?? '').trim();
    if (presentation === 'checked' && !answer) { setValidation(t('listen.answer_empty')); return; }
    setValidation('');
    const result = presentation === 'checked' ? textMatch(answer, selected.original_text, lesson.asset.source_language) : null;
    setSession((current) => {
      const existing = current[selected.segment_id] ?? {presentation: 'checked' as const, draft: '', attempts: []};
      return {...current, [selected.segment_id]: {
        presentation,
        draft: existing.draft,
        attempts: result ? [...existing.attempts, {answer, result}] : existing.attempts,
      }};
    });
    const current = progress.find((item) => item.segment_id === selected.segment_id);
    saveProgress.mutate({
      asset_id: lesson.asset.asset_id,
      segment_id: selected.segment_id,
      presentation,
      revealed: presentation === 'revealed',
      checked_attempt_count: presentation === 'checked' ? (current?.checked_attempt_count ?? 0) + 1 : current?.checked_attempt_count ?? 0,
      best_exact: result?.exact ?? current?.best_exact ?? false,
      last_answer: presentation === 'checked' ? answer : current?.last_answer ?? '',
    }, {
      onSuccess: (saved) => setProgress((items) => [...items.filter((item) => item.segment_id !== saved.item.segment_id), saved.item]),
      onError: () => setNotice(t('listening.unavailable')),
    });
  };

  if (!sessionCookie || !client) {
    return (
      <View style={[styles.page, {backgroundColor: tokens.colors.background}]}>
        <Text accessibilityRole="header" style={[styles.mastheadName, {color: tokens.colors.heading}]}>{t('listening.title')}</Text>
        <PanelCopy>{t('listening.signed_out')}</PanelCopy>
        <OrenaButton label={t('listening.back')} variant="outline" onPress={() => router.replace('/(app)')} />
      </View>
    );
  }

  const busy = importMedia.isPending;

  /* Before a lesson exists the screen is an ordinary page: the orientation and
     the requirements show what this does and why a video without captions
     cannot work, so the first thing a new learner meets is not an error. */
  if (!lesson) {
    return (
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.page, {backgroundColor: tokens.colors.background}]}>
        <Masthead name={t('listening.title')} purpose={t('listen.lead')} stat={history.length ? {value: history.length, label: t('listen.skill_stat')} : null} />
        {(resume || (pending && mediaResume)) ? (
          <Panel>
            <PanelCopy>{t('listening.resume_found')}</PanelCopy>
            <OrenaButton label={t('listening.resume')} onPress={() => { if (pending && mediaResume) { setSourceUrl(pending.sourceUrl); attemptedReadyHandle.current = null; rehydrating.current = false; if (mediaResume.resumable) setMediaResumeHandle(mediaResume.resumeHandle); else { rehydrating.current = true; prepare(pending.sourceUrl); } } else if (resume) { setSourceUrl(resume.sourceUrl); prepare(resume.sourceUrl); } }} />
            <OrenaButton label={t('listening.resume_cancel')} variant="outline" onPress={() => { void clearListeningResume(resumeStorage); void clearListeningPending(resumeStorage); void mediaStore?.clear(); setResume(null); setPending(null); setMediaResume(null); setMediaResumeHandle(''); }} />
          </Panel>
        ) : null}
        <Card style={styles.importCard}>
          <OrenaLabel>{t('listening.source_url')}</OrenaLabel>
          <TextInput accessibilityLabel={t('listening.source_url')} value={sourceUrl} onChangeText={setSourceUrl} placeholder={t('listening.source_placeholder')} placeholderTextColor={tokens.colors.mutedText} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={[styles.input, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]} />
          {notice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{color: tokens.colors.danger}}>{notice}</Text> : null}
          {busy
            ? <View style={styles.activeActions}><OrenaButton label={t('listening.preparing')} onPress={() => undefined} disabled /><OrenaButton label={t('listening.cancel')} variant="outline" onPress={cancel} /></View>
            : <OrenaButton label={t('listening.prepare')} onPress={() => prepare(sourceUrl)} disabled={!sourceUrl.trim()} />}
        </Card>
        {history.length ? (
          <View style={styles.introBlock}>
            <ContextLabel>{t('listen.recent_title')}</ContextLabel>
            {history.map((item) => <RowButton key={item.source_url} label={item.title || item.source_url} sub={item.provider || undefined} icon="arrowRight" onPress={() => { setSourceUrl(item.source_url); prepare(item.source_url); }} />)}
          </View>
        ) : null}
        <View style={styles.introBlock}>
          <ContextLabel>{t('listen.need_title')}</ContextLabel>
          <PanelCopy>{t('listen.need1')}</PanelCopy>
          <PanelCopy>{t('listen.need2')}</PanelCopy>
          <PanelCopy>{t('listen.need3')}</PanelCopy>
        </View>
        <GoalPanel />
      </ScrollView>
    );
  }

  /* Once a lesson is open the screen is a frame, not a document: the player
     holds the top of the phone layout (`.o-player{position:sticky;top:0}`), the
     transcript scrolls inside its own card, and the transport holds the bottom. */
  const transcriptHeight = Math.round(height * 0.52);
  const savedWords = (lesson as {libraryVocabulary?: {items?: {word: string; phonetic?: string; definition?: string}[]}}).libraryVocabulary?.items ?? [];
  const line = String(selected?.original_text ?? '').toLocaleLowerCase();
  const vocabularyHits = savedWords.filter((item) => item.word && line.includes(item.word.toLocaleLowerCase())).slice(0, 6);
  const notices: ReactNode[] = [];
  if ((lesson as {transcript_generation?: {status?: string}}).transcript_generation?.status === 'generated') notices.push(<Text key="generated" accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.mutedText}]}>{t('listen.generated_transcript')}</Text>);
  if (!playbackReady) notices.push(<Text key="playback" accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.attention}]}>{t('listen.active_unavailable')}</Text>);
  if (notice) notices.push(<Text key="notice" accessibilityRole="alert" style={[styles.statusLine, {color: tokens.colors.danger}]}>{notice}</Text>);

  return (
    <View style={[styles.frame, {backgroundColor: tokens.colors.background}]}>
      {focus ? null : (
        <View style={styles.stickyPlayer}>
          <PlayerCard
            lesson={lesson} videoId={videoId} playing={playing} muted={muted} rate={rate} elapsedMs={currentTime * 1000}
            onChangeState={setPlaying} onTogglePlay={() => setPlaying((value) => !value)} onSeek={seek}
            onToggleMute={() => setMuted((value) => !value)} onCycleRate={cycleRate} playerRef={playerRef}
          />
        </View>
      )}
      <ScrollView style={{flex: 1}} contentContainerStyle={styles.frameScroll}>
        {mode === 'shadowing' ? (
          <StudioBar segment={selected} onOpenSpeaking={openSpeaking} onLeave={() => changeMode('follow')} onReplay={replayCurrent} />
        ) : (
          <ListeningHeader mode={mode} playbackReady={playbackReady} focus={focus} onFocus={() => setFocus((value) => !value)} onMode={changeMode} />
        )}
        {notices.length ? <View style={styles.notices}>{notices}</View> : null}
        {mode === 'follow' ? (
          <FollowWorkspace
            lesson={lesson} segments={segments} selectedId={selected?.segment_id ?? ''} original={original} meaning={meaning}
            maxHeight={transcriptHeight}
            onToggleOriginal={() => setOriginal((value) => !value)} onToggleMeaning={() => setMeaning((value) => !value)}
            onSelect={select} onShadow={() => changeMode('shadowing')} onOpenSpeaking={openSpeaking} onFollowPlaying={followPlaying}
            index={selectedIndex} onPrevious={() => step(-1)} onReplay={replayCurrent} onNext={() => step(1)}
          />
        ) : null}
        {mode === 'active' ? (
          <ActiveWorkspace
            lesson={lesson} segments={segments} selectedId={selected?.segment_id ?? ''} session={session}
            validation={validation} persistence={progressQuery.isError ? t('listening.progress_unavailable') : saveProgress.isPending ? t('listening.checking') : ''}
            maxHeight={transcriptHeight}
            onSelect={select}
            onDraft={(value) => setSession((current) => ({...current, [selected!.segment_id]: {presentation: current[selected!.segment_id]?.presentation ?? 'checked', draft: value, attempts: current[selected!.segment_id]?.attempts ?? []}}))}
            onCheck={() => commit('checked')} onReveal={() => commit('revealed')}
            onRetry={() => setSession((current) => ({...current, [selected!.segment_id]: {presentation: 'checked', draft: '', attempts: current[selected!.segment_id]?.attempts ?? []}}))}
            index={selectedIndex} onPrevious={() => step(-1)} onReplay={replayCurrent} onNext={() => step(1)}
          />
        ) : null}
        {mode !== 'shadowing' && selected ? (
          <CurrentSegmentPanel segment={selected} meaning={translationFor(selected.segment_id)} mode={mode} showOriginal={original} showMeaning={meaning} onReplay={replayCurrent} />
        ) : null}
        {mode === 'follow' && original ? <VocabularyFocusPanel hits={vocabularyHits} /> : null}
        <GoalPanel />
        <SourcePanel lesson={lesson} />
        <SavedLessonsPanel lessons={history} onOpen={(url) => { setSourceUrl(url); prepare(url); }} onNew={restart} />
      </ScrollView>
      <TransportBar
        playing={playing} muted={muted} rate={rate} subtitles={original}
        onSeek={seek} onPrevious={() => step(-1)} onNext={() => step(1)}
        onTogglePlay={() => setPlaying((value) => !value)} onToggleMute={() => setMuted((value) => !value)}
        onCycleRate={cycleRate} onToggleSubtitles={() => setOriginal((value) => !value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flexGrow: 1, padding: 16, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  frame: {flex: 1},
  frameScroll: {padding: 16, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  // `.o-player{position:sticky;top:0;z-index:5;padding:10px;gap:10px}`
  stickyPlayer: {paddingHorizontal: 16, paddingTop: 16, zIndex: 5, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  player: {padding: 10, gap: 10},
  videoFrame: {borderRadius: 15, overflow: 'hidden'},
  playerTrack: {flexDirection: 'row', alignItems: 'center', gap: 8},
  playerBar: {flex: 1, height: 4, borderRadius: 999, overflow: 'hidden'},
  playerFill: {height: '100%', borderRadius: 999},
  playerTime: {fontSize: 12, fontVariant: ['tabular-nums']},
  playerMeta: {gap: 2},
  playerKicker: {fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', fontWeight: '600'},
  playerTitle: {fontSize: 17, fontWeight: '600', lineHeight: 22},
  playerProvider: {fontSize: 12},
  playerControls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  playerTransport: {flexDirection: 'row', alignItems: 'center', gap: 8},
  // `.o-player-play{width:46px;height:46px}` at the phone breakpoint.
  playButton: {width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center'},
  iconButton: {width: 40, height: 40, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  rateButton: {minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  rateValue: {fontSize: 13, fontWeight: '600'},

  masthead: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16},
  mastheadIdentity: {flex: 1, gap: 6},
  mastheadName: {fontSize: 24, fontWeight: '700', lineHeight: 30},
  mastheadPurpose: {fontSize: 15, lineHeight: 22},
  mastheadStat: {borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center'},
  mastheadValue: {fontSize: 22, fontWeight: '700'},
  mastheadStatLabel: {fontSize: 11},

  listenHead: {gap: 10},
  kicker: {fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '600'},
  headline: {fontSize: 26, fontWeight: '700', lineHeight: 32},
  lead: {fontSize: 15, lineHeight: 22},
  modeSwitch: {gap: 8},
  modeCard: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 15},
  modeIcon: {width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  modeCopy: {flex: 1, gap: 2},
  modeName: {fontSize: 15, fontWeight: '600'},
  modeSub: {fontSize: 12},

  introBlock: {gap: 8},
  contextLabel: {fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600'},
  importCard: {padding: 16, gap: 12},
  input: {minHeight: 52, borderWidth: 1, borderRadius: 15, padding: 14, fontSize: 15},

  notices: {gap: 6},
  statusLine: {fontSize: 13, lineHeight: 19},

  transcriptCard: {paddingVertical: 12, gap: 12},
  // `.o-tcard-head{flex-wrap:wrap;row-gap:8px}` -- the tabs, the timing switch
  // and the follow button do not fit one phone row.
  tcardHead: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 8, columnGap: 10, paddingHorizontal: 12},
  tabs: {flexDirection: 'row', borderRadius: 999, padding: 3, gap: 2},
  tab: {paddingHorizontal: 14, minHeight: 32, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  tabLabel: {fontSize: 13, fontWeight: '600'},
  switchField: {flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 0},
  switchLabel: {fontSize: 12},
  switchTrack: {width: 40, height: 22, borderRadius: 999, borderWidth: 1, padding: 2, justifyContent: 'center'},
  switchThumb: {width: 16, height: 16, borderRadius: 999},
  segmentList: {gap: 6, paddingHorizontal: 12},
  segmentRow: {borderRadius: 15, borderWidth: 1, borderColor: 'transparent'},
  // `.listening-segment-main{grid-template-columns:44px minmax(0,1fr);gap:10px;padding:10px 12px}`
  segmentMain: {flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12},
  segmentTime: {width: 44, fontSize: 12, fontVariant: ['tabular-nums']},
  segmentCopy: {flex: 1, gap: 4},
  segmentText: {fontSize: 15, lineHeight: 22},
  segmentMeaning: {fontSize: 13, lineHeight: 20},
  cjk: {lineHeight: 28},
  // `.listening-segment-actions{padding:0 12px 10px 66px}`
  segmentActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 66, paddingRight: 12, paddingBottom: 10},
  tcardFoot: {paddingHorizontal: 12, gap: 8},
  tcardCount: {fontSize: 12},
  legend: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  legendDot: {width: 8, height: 8, borderRadius: 999},
  legendLabel: {fontSize: 12},
  segmentNav: {flexDirection: 'row', gap: 8, paddingHorizontal: 12},

  toolbar: {paddingHorizontal: 12, gap: 4},
  toolbarTitle: {fontSize: 17, fontWeight: '600'},
  toolbarSub: {fontSize: 12, lineHeight: 18},
  activeForm: {paddingHorizontal: 12, gap: 10},
  activeActions: {gap: 8},
  activeResult: {paddingHorizontal: 12, gap: 6},
  activeSummary: {paddingHorizontal: 12, gap: 4},
  strong: {fontWeight: '600'},

  segmentNow: {padding: 16, gap: 8},
  segmentRule: {height: 3, width: 34, borderRadius: 999},
  segmentNowHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  segmentNowText: {fontSize: 20, lineHeight: 30},
  segmentNowMeaning: {fontSize: 15, lineHeight: 22},

  panelCard: {padding: 16, gap: 10},
  panelHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  focusWords: {gap: 8},
  focusWord: {gap: 2},
  focusPhonetic: {fontSize: 12, fontStyle: 'italic'},
  sourceMeta: {gap: 2},
  savedList: {gap: 6},
  rowButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 46, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1},
  rowButtonCopy: {flex: 1, gap: 1},
  rowButtonLabel: {fontSize: 14, fontWeight: '500'},
  rowButtonSub: {fontSize: 11},

  // `.o-studio-bar{flex-direction:column;align-items:stretch}` on a phone.
  studioBar: {gap: 8},
  studioTitle: {fontSize: 21, fontWeight: '700'},
  studioActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},

  transport: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1},
  transportMain: {flexDirection: 'row', alignItems: 'center', gap: 4},

  goalRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  goalTrack: {height: 6, borderRadius: 999, overflow: 'hidden'},
  goalFill: {height: '100%', borderRadius: 999},
  goalEdit: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  goalInput: {flex: 1, borderWidth: 1, borderRadius: 15, padding: 10, minHeight: 44},
});
