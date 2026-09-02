import {useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode} from 'react';
import {AppState, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View} from 'react-native';
import YoutubePlayer, {type YoutubeIframeRef} from 'react-native-youtube-iframe';
import {useAudioPlayer, useAudioPlayerStatus} from 'expo-audio';
import {VideoView, useVideoPlayer, type VideoPlayer} from 'expo-video';
import {useEvent} from 'expo';
import {Image} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../src/api/client';
import type {ListeningLibrary, ListeningLibraryLessonMetadata, ListeningProgress, MediaLesson} from '../../src/api/contracts/listening';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useImportMedia, useListeningProgress, useSaveListeningProgress, useSaveShadowingProgress, useShadowingProgress, useTranslateMedia} from '../../src/query/useListening';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {useMediaImportStatus, createMediaResumeStore} from '../../src/query/useMediaImportStatus';
import {clearListeningPending, clearListeningResume, readListeningPending, readListeningResume, secureListeningResumeStorage, secureMediaResumeStorage, writeListeningPending, writeListeningResume, type ListeningPending, type ListeningResume} from '../../src/features/listening/listeningResume';
import {addListenedSeconds, listeningHabitSnapshot, saveListeningGoal, type ListeningHabitSnapshot} from '../../src/features/listening/listeningHabit';
import {listMediaLessons, rememberMediaLesson, type MediaLessonEntry} from '../../src/features/listening/mediaLessonHistory';
import {selectSharedMediaSegment, setSharedMediaMode, setSharedMediaSession} from '../../src/features/listening/sharedMediaSession';
import {keepTake, releaseTakes, roundCount, shadowingSummary, takeKey, type ShadowTake, type ShadowingSummary} from '../../src/features/listening/shadowTakes';
import {MAX_LISTENING_EVALUATION_UNITS, MAX_LISTENING_RECONSTRUCTION_CHARS, directMediaKind, listeningUnits, playbackAvailable, posterSource, practiceSummary, reconstructionDiff, segmentAt, stamp, textMatch, type ListeningMode, type SegmentPractice} from '../../src/features/listening/listeningDomain';
import type {ResumeState} from '../../src/api/mediaClient';
import type {KeyValueStorage} from '../../src/storage/boundedCache';
import {Button as OrenaButton, Card, Chip, Label as OrenaLabel, Panel, PanelCopy} from '../../src/components/orena';
import {OrenaIcon, type OrenaIconName} from '../../src/components/OrenaIcon';
import {TransientAudioService} from '../../src/media/transientAudioService';

/**
 * Ported from static/becoming/screens/listening.js and orena/listening.css.
 *
 * Curated rights-cleared audio and learner-imported YouTube embeds both use the
 * canonical Media Learning payload. Native playback mirrors the web adapter:
 * expo-audio handles direct audio assets and react-native-youtube-iframe wraps
 * YouTube's official IFrame Player API for supported imports.
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

export type ListeningScreenProps = {
  client?: ApiClient;
  resumeStorage?: KeyValueStorage;
  mediaResumeStorage?: KeyValueStorage;
  /** Injected so the studio's recorder is drivable in tests without a device. */
  audioService?: TransientAudioService;
};

const NATIVE_LIBRARY_COPY = {
  en: {purpose: 'Choose something interesting and start listening now.', discover: 'Discover', myMedia: 'My media', recommended: 'Recommended for you', start: 'Start lesson', loading: 'Preparing your Listening library…', failed: 'The Listening library could not be loaded.', add: 'Add your own media', dictation: 'Dictation', dictationSub: 'Type what you hear'},
  vi: {purpose: 'Chọn một nội dung thú vị và bắt đầu luyện nghe ngay.', discover: 'Khám phá', myMedia: 'Media của tôi', recommended: 'Đề xuất cho bạn', start: 'Bắt đầu bài', loading: 'Đang chuẩn bị thư viện Listening…', failed: 'Không thể tải thư viện Listening.', add: 'Thêm media của bạn', dictation: 'Chính tả', dictationSub: 'Gõ lại điều bạn nghe'},
  zh: {purpose: '选择有趣的内容，马上开始听力练习。', discover: '发现', myMedia: '我的媒体', recommended: '为你推荐', start: '开始课程', loading: '正在准备听力内容库…', failed: '无法加载听力内容库。', add: '添加自己的媒体', dictation: '听写', dictationSub: '输入你听到的内容'},
} as const;

const DICTATION_HINT_COPY = {
  en: {hint: 'Use a hint', count: 'Word count', first: 'First word', vocabulary: 'Vocabulary help', used: 'Hint used', full: 'full answer'},
  vi: {hint: 'Dùng gợi ý', count: 'Số từ', first: 'Từ đầu tiên', vocabulary: 'Từ vựng khó', used: 'Đã dùng gợi ý', full: 'đáp án đầy đủ'},
  zh: {hint: '使用提示', count: '字数', first: '第一个字', vocabulary: '重点词汇', used: '已使用提示', full: '完整答案'},
} as const;

const DISCOVERY_FILTER_COPY = {
  en: {topics: 'Topics', allTopics: 'All topics', level: 'Level', allLevels: 'All levels'},
  vi: {topics: 'Chủ đề', allTopics: 'Tất cả chủ đề', level: 'Trình độ', allLevels: 'Mọi trình độ'},
  zh: {topics: '主题', allTopics: '全部主题', level: '等级', allLevels: '全部等级'},
} as const;

const TAG_FILTER_COPY = {
  en: {tags: 'Tags', allTags: 'All tags', source: 'Source'},
  vi: {tags: 'Thẻ nội dung', allTags: 'Tất cả thẻ', source: 'Nguồn'},
  zh: {tags: '标签', allTags: '全部标签', source: '来源'},
} as const;

const DICTATION_ACTION_COPY = {
  en: {next: 'Next segment', shadow: 'Shadow this segment', slow: 'Replay slowly', save: 'Save', saved: 'Saved to Active Recall', saveFailed: 'Could not save this word'},
  vi: {next: 'Đoạn tiếp theo', shadow: 'Shadow đoạn này', slow: 'Nghe chậm', save: 'Lưu', saved: 'Đã lưu vào Active Recall', saveFailed: 'Không thể lưu từ này'},
  zh: {next: '下一句', shadow: '跟读这一句', slow: '慢速重听', save: '保存', saved: '已保存到主动复习', saveFailed: '无法保存这个词'},
} as const;

// Mirrors LIBRARY_TERM_LABELS in static/becoming/screens/listening.js. A topic
// missing here falls back to the raw slug, which on a Chinese UI reads as an
// English taxonomy string, so a topic added to the catalog must be added here
// in the same batch.
const NATIVE_LIBRARY_TERMS = {
  en: {'daily-life': 'Daily life', travel: 'Travel', conversations: 'Conversations', culture: 'Culture', science: 'Science', technology: 'Technology', follow: 'Listen', active: 'Active listening', dictation: 'Dictation', shadowing: 'Shadowing'},
  vi: {'daily-life': 'Đời sống hằng ngày', travel: 'Du lịch', conversations: 'Hội thoại', culture: 'Văn hóa', science: 'Khoa học', technology: 'Công nghệ', follow: 'Nghe', active: 'Nghe chủ động', dictation: 'Chính tả', shadowing: 'Shadowing'},
  zh: {'daily-life': '日常生活', travel: '旅行', conversations: '对话', culture: '文化', science: '科学', technology: '科技', follow: '听力', active: '主动听力', dictation: '听写', shadowing: '跟读'},
} as const;

/**
 * Discovery artwork. The web shows the real poster for a real-media lesson and
 * an icon swatch otherwise; native showed the swatch for everything, which kept
 * the library looking synthetic on a phone while the same lesson had a real
 * thumbnail in a browser.
 *
 * A poster that fails to load must not leave a hole in the card, so a failed
 * image falls back to the same icon a lesson without a poster gets.
 */
function LibraryArtwork({item}: {item: ListeningLibraryLessonMetadata}) {
  const {tokens} = useTheme();
  const poster = posterSource(item.poster_url);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [poster]);
  if (poster && !failed) {
    return (
      <View style={[styles.libraryArtwork, {backgroundColor: tokens.colors.accentTint}]}>
        <Image
          source={{uri: poster}}
          style={styles.libraryPoster}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }
  return (
    <View style={[styles.libraryArtwork, {backgroundColor: tokens.colors.accentTint}]}>
      <OrenaIcon name={item.topic === 'conversations' ? 'speak' : 'listen'} size={30} color={tokens.colors.accent} />
    </View>
  );
}

function nativeLibraryTerm(value: string, locale: keyof typeof NATIVE_LIBRARY_TERMS): string {
  if (value === 'listen') return (NATIVE_LIBRARY_TERMS[locale] as Record<string, string>).follow ?? 'Listen';
  return (NATIVE_LIBRARY_TERMS[locale] as Record<string, string>)[value] ?? value.replaceAll('-', ' ');
}

// YouTube embeds remain one supported playback adapter alongside curated audio.
function extractYouTubeVideoId(playback: {kind: string; provider: string; url: string} | undefined): string | null {
  if (!playback || playback.kind !== 'embed' || playback.provider !== 'youtube') return null;
  const match = /\/embed\/([A-Za-z0-9_-]{11})(?:[/?]|$)/.exec(playback.url);
  return match ? match[1]! : null;
}

const SEEK_SECONDS = 5;
const RATES = [0.75, 1, 1.25] as const;
const SLOW_RATE = 0.75;
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
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const libraryCopy = NATIVE_LIBRARY_COPY[locale] ?? NATIVE_LIBRARY_COPY.en;
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
      {card('dictation', libraryCopy.dictation, libraryCopy.dictationSub, 'write', !playbackReady)}
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
function PlayerCard({lesson, videoId, videoPlayer, videoSource, posterUrl, playbackReady, playing, muted, rate, elapsedMs, durationMs, onChangeState, onReady, onTogglePlay, onSeek, onToggleMute, onCycleRate, playerRef}: {
  lesson: MediaLesson; videoId: string | null; videoPlayer: VideoPlayer | null; videoSource: string | null; posterUrl: string | null;
  playbackReady: boolean; playing: boolean; muted: boolean; rate: number; elapsedMs: number; durationMs: number;
  onChangeState: (playing: boolean) => void; onReady: () => void; onTogglePlay: () => void; onSeek: (delta: number) => void;
  onToggleMute: () => void; onCycleRate: () => void; playerRef: MutableRefObject<YoutubeIframeRef | null>;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  // Poster removal is a rendering fact, not a clock reading. A curated excerpt
  // seeks before it draws -- the ZH lesson starts 16.12s in -- so any
  // currentTime test hides the poster while the frame is still black.
  // onFirstFrameRender is exactly the cover-image lifecycle signal.
  const [firstFrame, setFirstFrame] = useState(false);
  useEffect(() => { setFirstFrame(false); }, [videoSource]);
  // The asset's duration_ms is often absent for a provider embed, so the
  // player's own clock is the authority once it is ready.
  const assetDuration = Number(lesson.asset.duration_ms);
  const excerptStart = Number(lesson.catalog?.excerpt_start_ms ?? 0);
  const excerptEnd = Number(lesson.catalog?.excerpt_end_ms ?? 0);
  const excerptDuration = excerptEnd > excerptStart ? excerptEnd - excerptStart : 0;
  const duration = excerptDuration || (durationMs > 0 ? durationMs : assetDuration);
  const elapsed = excerptDuration ? Math.max(0, Math.min(duration, elapsedMs - excerptStart)) : elapsedMs;
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const fill = hasDuration ? Math.min(100, Math.round((elapsed / duration) * 100)) : 0;
  return (
    <Card style={styles.player}>
      {videoId ? (
        <View style={styles.videoFrame}>
          <YoutubePlayer
            ref={playerRef}
            height={190}
            videoId={videoId}
            play={playing}
            mute={muted}
            playbackRate={rate}
            onReady={onReady}
            onChangeState={(state: string) => { if (state === 'playing') onChangeState(true); else if (state === 'paused' || state === 'ended') onChangeState(false); }}
            // Android's WebView refuses programmatic playback unless inline media
            // is allowed and a user gesture is not demanded per play() call. The
            // transport is that gesture; without these, every transport control
            // was inert while the YouTube overlay still looked tappable.
            webViewProps={{allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false, androidLayerType: 'hardware'}}
            initialPlayerParams={{controls: true, modestbranding: true, rel: false, start: Math.floor(excerptStart / 1000), ...(excerptEnd > excerptStart ? {end: Math.ceil(excerptEnd / 1000)} : {})}}
          />
        </View>
      ) : videoPlayer ? (
        <View style={styles.videoFrame}>
          <VideoView
            player={videoPlayer}
            style={styles.nativeVideo}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen
            allowsPictureInPicture={false}
            onFirstFrameRender={() => setFirstFrame(true)}
          />
          {posterUrl && !firstFrame ? (
            <Image source={{uri: posterUrl}} style={styles.videoPoster} resizeMode="cover" accessibilityIgnoresInvertColors />
          ) : null}
        </View>
      ) : lesson.playback.kind === 'audio' ? (
        <View style={[styles.audioFrame, {backgroundColor: tokens.colors.accentTint}]}>
          <OrenaIcon name="listen" size={42} color={tokens.colors.accent} />
          <Text style={[styles.audioLabel, {color: tokens.colors.mutedText}]}>{lesson.catalog?.topic ?? lesson.asset.source_provider}</Text>
        </View>
      ) : (
        <PanelCopy>{t('listening.playback_unavailable')}</PanelCopy>
      )}
      <View style={styles.playerTrack}>
        <View accessibilityRole="progressbar" accessibilityLabel={lesson.asset.title || ''} style={[styles.playerBar, {backgroundColor: tokens.colors.surfaceSunken}]}>
          <View style={[styles.playerFill, {width: `${fill}%`, backgroundColor: tokens.colors.accent}]} />
        </View>
        <Text style={[styles.playerTime, {color: tokens.colors.faintText}]}>{stamp(elapsed)}</Text>
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
          <IconButton icon="skipBack" label={t('listening.skip_back')} onPress={() => onSeek(-SEEK_SECONDS)} disabled={!playbackReady} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? t('listening.pause') : t('listening.play')}
            disabled={!playbackReady}
            onPress={onTogglePlay}
            style={[styles.playButton, {backgroundColor: tokens.colors.accent, opacity: playbackReady ? 1 : 0.45}]}
          >
            <OrenaIcon name={playing ? 'pause' : 'play'} size={22} color={tokens.colors.onAccent} />
          </Pressable>
          <IconButton icon="skipForward" label={t('listening.skip_forward')} onPress={() => onSeek(SEEK_SECONDS)} disabled={!playbackReady} />
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
function FollowWorkspace({lesson, segments, selectedId, playingId, following, original, meaning, maxHeight, onToggleOriginal, onToggleMeaning, onSelect, onShadow, onOpenSpeaking, onFollowPlaying, index, onPrevious, onReplay, onNext}: {
  lesson: MediaLesson; segments: Segment[]; selectedId: string; playingId: string | null; following: boolean;
  original: boolean; meaning: boolean; maxHeight: number;
  onToggleOriginal: () => void; onToggleMeaning: () => void; onSelect: (id: string) => void;
  onShadow: () => void; onOpenSpeaking: () => void; onFollowPlaying: () => void;
  index: number; onPrevious: () => void; onReplay: () => void; onNext: () => void;
}) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const translations = useMemo(() => new Map((lesson.translations || []).map((item) => [item.segment_id, item.translated_meaning])), [lesson.translations]);
  const status = lesson.translation?.status;
  const notRequired = status === 'not_required';
  const preparing = !status;
  const degraded = status === 'unavailable' || status === 'too_large';
  const statusMessage = preparing ? t('listen.preparing') : status === 'unavailable' ? t('listen.translation_unavailable') : null;
  const meaningBlocked = preparing || notRequired || degraded;
  const words = segments.reduce((total, segment) => total + listeningUnits(segment.original_text, lesson.asset.source_language).length, 0);

  /**
   * Smart-follow. installSmartFollow() in listening.js scrolls the transcript
   * container -- not the page -- to keep the playing line in view, and stops
   * doing it the moment the learner takes over. Here the row offsets are
   * measured as they lay out, because a segment row's height depends on how its
   * text wraps, so a fixed row height would drift further out with every line.
   */
  const listRef = useRef<ScrollView | null>(null);
  const rowOffsets = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!following || !playingId) return;
    const offset = rowOffsets.current[playingId];
    if (offset === undefined) return;
    listRef.current?.scrollTo({y: Math.max(0, offset - maxHeight / 3), animated: true});
  }, [following, playingId, maxHeight]);

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

      <ScrollView ref={listRef} style={{maxHeight}} nestedScrollEnabled contentContainerStyle={styles.segmentList}>
        {segments.map((segment) => {
          const isSelected = segment.segment_id === selectedId;
          const isPlaying = segment.segment_id === playingId;
          const inline = meaning && !notRequired && !degraded ? translations.get(segment.segment_id) : '';
          return (
            <View
              key={segment.segment_id}
              onLayout={(event) => { rowOffsets.current[segment.segment_id] = event.nativeEvent.layout.y; }}
              style={[
                styles.segmentRow,
                // The line being spoken is marked even when the learner has
                // scrolled away to read somewhere else.
                isPlaying && !isSelected && {borderColor: tokens.colors.borderStrong},
                isSelected && {backgroundColor: tokens.colors.accentTint, borderColor: tokens.colors.accent},
              ]}
            >
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
function ActiveWorkspace({lesson, segments, selectedId, session, validation, persistence, maxHeight, dictation, onSelect, onDraft, onCheck, onReveal, onRetry, onHint, onSlowReplay, onShadow, onSaveWord, index, onPrevious, onReplay, onNext}: {
  lesson: MediaLesson; segments: Segment[]; selectedId: string; session: Record<string, SegmentPractice>;
  validation: string; persistence: string; maxHeight: number; dictation: boolean;
  onSelect: (id: string) => void; onDraft: (value: string) => void; onCheck: () => void; onReveal: () => void; onRetry: () => void; onHint: () => void;
  onSlowReplay: () => void; onShadow: () => void; onSaveWord: (word: string) => void;
  index: number; onPrevious: () => void; onReplay: () => void; onNext: () => void;
}) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const hintCopy = DICTATION_HINT_COPY[locale] ?? DICTATION_HINT_COPY.en;
  const actionCopy = DICTATION_ACTION_COPY[locale] ?? DICTATION_ACTION_COPY.en;
  const segment = segments.find((item) => item.segment_id === selectedId);
  const practice = session[selectedId];
  const visible = practice?.presentation === 'checked' || practice?.presentation === 'revealed';
  const lastAttempt = practice?.presentation === 'checked' ? practice.attempts[practice.attempts.length - 1] ?? null : null;
  const hintLevel = Number(practice?.hint_level ?? 0);
  const expectedUnits = segment ? listeningUnits(segment.original_text, lesson.asset.source_language) : [];
  const diff = lastAttempt && segment ? reconstructionDiff(lastAttempt.answer, segment.original_text, lesson.asset.source_language) : [];
  const difficultWords = [...new Set(diff.filter((item) => item.status === 'missing' || item.status === 'wrong').map((item) => item.expected).filter(Boolean))];
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
            {dictation ? <OrenaButton label={actionCopy.slow} variant="outline" onPress={onSlowReplay} /> : null}
            {dictation && hintLevel < 3 && !visible ? <OrenaButton label={hintCopy.hint} variant="outline" onPress={onHint} /> : null}
            {visible ? <OrenaButton label={t('listen.retry')} variant="outline" onPress={onRetry} /> : null}
          </View>
          {dictation && hintLevel > 0 && !visible ? (
            <View style={[styles.hintPanel, {backgroundColor: tokens.colors.surfaceSunken, borderColor: tokens.colors.border}]}>
              <Text style={[styles.strong, {color: tokens.colors.text}]}>{hintCopy.used}</Text>
              <Text style={{color: tokens.colors.mutedText}}>{hintCopy.count}: {expectedUnits.length}</Text>
              {hintLevel >= 2 ? <Text style={{color: tokens.colors.mutedText}}>{hintCopy.first}: {expectedUnits[0] ?? '—'}</Text> : null}
              {hintLevel >= 3 && lesson.catalog?.vocabulary?.length ? <Text style={{color: tokens.colors.mutedText}}>{hintCopy.vocabulary}: {lesson.catalog.vocabulary.join(', ')}</Text> : null}
            </View>
          ) : null}
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
          {dictation && lastAttempt ? <View style={styles.diffRow}>{diff.map((item, position) => <Text key={`${item.status}-${position}`} style={[styles.diffChip, {color: item.status === 'correct' ? tokens.colors.accent : item.status === 'extra' ? tokens.colors.faintText : tokens.colors.danger, borderColor: tokens.colors.border}]}>{item.actual || item.expected}</Text>)}</View> : null}
          {dictation && difficultWords.length ? <View style={styles.diffRow}>{difficultWords.map((word) => <OrenaButton key={word} label={`${actionCopy.save}: ${word}`} compact variant="outline" onPress={() => onSaveWord(word)} />)}</View> : null}
          {dictation && hintLevel > 0 ? <Text style={{color: tokens.colors.mutedText}}>{hintCopy.used}: {hintLevel >= 4 ? hintCopy.full : `${hintLevel}/3`}</Text> : null}
          <Text style={{color: tokens.colors.text}}><Text style={styles.strong}>{t('listen.original')}</Text> {segment.original_text}</Text>
          {translations.get(segment.segment_id) ? <Text style={{color: tokens.colors.mutedText}}>{translations.get(segment.segment_id)}</Text> : null}
          {dictation && lastAttempt?.result.exact ? <View style={styles.activeActions}>{index < segments.length - 1 ? <OrenaButton label={actionCopy.next} compact onPress={onNext} /> : null}<OrenaButton label={actionCopy.shadow} compact variant="outline" onPress={onShadow} /></View> : null}
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
function StudioBar({onOpenSpeaking, onLeave}: {onOpenSpeaking: () => void; onLeave: () => void}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <View style={styles.studioBar}>
      <Text accessibilityRole="header" style={[styles.studioTitle, {color: tokens.colors.heading}]}>{t('listen.studio_title')}</Text>
      <Text style={[styles.lead, {color: tokens.colors.mutedText}]}>{t('listen.studio_lead')}</Text>
      <View style={styles.studioActions}>
        <OrenaButton label={t('listen.open_speaking')} variant="outline" compact onPress={onOpenSpeaking} />
        <OrenaButton label={t('listen.leave_studio')} variant="outline" compact onPress={onLeave} />
      </View>
    </View>
  );
}

/**
 * `segmentStrip()`: the segments as cards along a track. On a phone the
 * reference scrolls the strip instead of stepping it -- the arrows would take a
 * third of the row from the cards -- so `.o-strip .o-icon-button{display:none}`
 * and the track scrolls.
 */
function SegmentStrip({segments, selectedId, onSelect}: {segments: Segment[]; selectedId: string; onSelect: (id: string) => void}) {
  const {tokens} = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {segments.map((segment, index) => {
        const active = segment.segment_id === selectedId;
        return (
          <Pressable
            key={segment.segment_id}
            accessibilityRole="button"
            accessibilityLabel={segment.original_text}
            accessibilityState={{selected: active}}
            onPress={() => onSelect(segment.segment_id)}
            style={[styles.stripCard, {
              borderColor: active ? tokens.colors.accent : tokens.colors.border,
              backgroundColor: active ? tokens.colors.accentTint : tokens.colors.surface,
            }]}
          >
            <View style={styles.stripHead}>
              <Text style={[styles.stripIndex, {color: active ? tokens.colors.accent : tokens.colors.text}]}>{index + 1}</Text>
              <Text style={[styles.segmentTime, {color: tokens.colors.faintText}]}>{stamp(segment.start_ms)}</Text>
            </View>
            <Text numberOfLines={3} style={[styles.stripText, {color: tokens.colors.mutedText}]}>{segment.original_text}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** `.o-round-button`: the three large circular practice actions. */
function RoundAction({icon, label, onPress, disabled = false, emphasis = false, active = false}: {
  icon: OrenaIconName; label: string; onPress: () => void; disabled?: boolean; emphasis?: boolean; active?: boolean;
}) {
  const {tokens} = useTheme();
  const face = active ? tokens.colors.danger : emphasis ? tokens.colors.accent : tokens.colors.surface;
  return (
    <View style={styles.practiceAction}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{disabled, selected: active}}
        disabled={disabled}
        onPress={onPress}
        style={({pressed}) => [styles.roundButton, {
          backgroundColor: face,
          borderColor: emphasis || active ? 'transparent' : tokens.colors.border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        }, tokens.elevation.control]}
      >
        <OrenaIcon name={icon} size={26} color={emphasis || active ? tokens.colors.onAccent : tokens.colors.mutedText} />
      </Pressable>
      <Text style={[styles.practiceActionLabel, {color: tokens.colors.mutedText, fontWeight: emphasis ? '600' : '400'}]}>{label}</Text>
    </View>
  );
}

/**
 * `attemptRow()`: a round nobody has recorded is one line — number, label, mic —
 * and carries no score slot, because an unrecorded round has nothing that could
 * be scored. A recorded take gets a player, and the verdict and score positions
 * the reference draws, held open and saying plainly that this take is not
 * evaluated. Filling them would mean inventing an assessment of the learner's
 * speech, which this product does not produce.
 */
function AttemptRow({take, index, onRecord, onPlay, playing}: {
  take: ShadowTake | undefined; index: number; onRecord: () => void; onPlay: () => void; playing: boolean;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  if (!take) {
    return (
      <View style={[styles.take, styles.takePending, {borderColor: tokens.colors.border}]}>
        <Text style={[styles.takeIndex, {color: tokens.colors.faintText}]}>{index + 1}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('shadow.start_round').replace('{n}', String(index + 1))}
          onPress={onRecord}
          style={styles.takeStart}
        >
          <Text style={[styles.takeStartLabel, {color: tokens.colors.text}]}>{t('shadow.start_round').replace('{n}', String(index + 1))}</Text>
          <OrenaIcon name="speak" size={18} color={tokens.colors.mutedText} />
        </Pressable>
      </View>
    );
  }
  return (
    <View style={[styles.take, {borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface}]}>
      <Text style={[styles.takeIndex, {color: tokens.colors.faintText}]}>{index + 1}</Text>
      <View style={styles.takeBody}>
        <Text style={[styles.takeWhen, {color: tokens.colors.faintText}]}>{t('shadow.just_now')}</Text>
        <View style={styles.takePlayer}>
          <IconButton icon={playing ? 'pause' : 'play'} label={t('shadow.listen_to_me')} onPress={onPlay} />
          <Text style={[styles.takeTime, {color: tokens.colors.mutedText}]}>{stamp(take.ms)}</Text>
        </View>
        <Text style={[styles.takeVerdict, {color: tokens.colors.faintText}]}>{t('shadow.key_sounds_pending')}</Text>
      </View>
      <View style={styles.takeScore}>
        <Text style={[styles.scoreRing, {color: tokens.colors.faintText, borderColor: tokens.colors.border}]}>—</Text>
        <Text style={[styles.takeScoreLabel, {color: tokens.colors.faintText}]}>{t('shadow.score_pending')}</Text>
      </View>
    </View>
  );
}

/**
 * The Shadowing Studio, ported from `shadowingWorkspace()`. The reference makes
 * this a room of its own rather than a panel: one segment at a time, set large,
 * with the takes underneath it.
 */
function ShadowingStudio({segment, segments, selectedId, meaning, takes, rounds, recording, status, playingTake, summary, persistence, onSelect, onReplay, onToggleRecord, onPlayTake}: {
  segment: Segment | undefined; segments: Segment[]; selectedId: string; meaning: string;
  takes: readonly ShadowTake[]; rounds: number; recording: boolean; status: string;
  playingTake: number | null; summary: ShadowingSummary; persistence: string;
  onSelect: (id: string) => void; onReplay: () => void; onToggleRecord: () => void; onPlayTake: (index: number) => void;
}) {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const index = segments.findIndex((item) => item.segment_id === selectedId);
  return (
    <>
      <SegmentStrip segments={segments} selectedId={selectedId} onSelect={onSelect} />
      <Card style={styles.practiceCard}>
        <View style={styles.practiceHead}>
          <OrenaLabel>{t('listen.now_practicing')}</OrenaLabel>
          <Text style={[styles.practiceCount, {color: tokens.colors.faintText}]}>{index + 1} / {segments.length}</Text>
        </View>
        {segment ? (
          <>
            <Text style={[styles.practiceLine, {color: tokens.colors.text}, locale === 'zh' && styles.cjk]}>{segment.original_text}</Text>
            {meaning ? <Text style={[styles.segmentNowMeaning, {color: tokens.colors.mutedText}]}>{meaning}</Text> : null}
            <View style={styles.practiceActions}>
              <RoundAction icon="listen" label={t('shadow.listen')} onPress={onReplay} />
              <RoundAction icon="speak" label={t('shadow.hold_to_repeat')} onPress={onToggleRecord} emphasis active={recording} />
              <RoundAction icon="play" label={t('shadow.listen_to_me')} onPress={() => onPlayTake(takes.length - 1)} disabled={takes.length === 0} />
            </View>
            {status ? <Text accessibilityLiveRegion="polite" style={[styles.statusLine, {color: tokens.colors.mutedText, textAlign: 'center'}]}>{status}</Text> : null}
          </>
        ) : null}
      </Card>

      <Card style={styles.panelCard}>
        <View style={styles.panelHead}>
          <OrenaLabel>{t('shadow.your_attempts')}</OrenaLabel>
          <Text style={[styles.practiceCount, {color: tokens.colors.faintText}]}>
            {t('shadow.round_of').replace('{n}', String(Math.min(takes.length + 1, rounds))).replace('{total}', String(rounds))}
          </Text>
        </View>
        <View style={styles.takeList}>
          {Array.from({length: rounds}, (_, position) => (
            <AttemptRow
              key={position}
              take={takes[position]}
              index={position}
              onRecord={onToggleRecord}
              onPlay={() => onPlayTake(position)}
              playing={playingTake === position}
            />
          ))}
        </View>
        <PanelCopy>{t('shadow.score_note')}</PanelCopy>
      </Card>

      {persistence ? <Text accessibilityLiveRegion="polite" style={[styles.statusLine, {color: tokens.colors.faintText}]}>{persistence}</Text> : null}

      <Card style={styles.panelCard}>
        <OrenaLabel>{t('shadow.progress_title')}</OrenaLabel>
        <PanelCopy>{summary.practiced_segments} / {summary.total_segments} {t('shadow.segments_label')}</PanelCopy>
        <View style={[styles.goalTrack, {backgroundColor: tokens.colors.surfaceSunken}]}>
          <View style={[styles.goalFill, {
            width: `${summary.total_segments ? Math.round((summary.practiced_segments / summary.total_segments) * 100) : 0}%`,
            backgroundColor: tokens.colors.accent,
          }]} />
        </View>
      </Card>

      {/* The reference's shortcuts card is dropped on a phone: there is no keyboard. */}
      <Card style={styles.panelCard}>
        <OrenaLabel>{t('listen.tips')}</OrenaLabel>
        <PanelCopy>{t('listen.tip1')}</PanelCopy>
        <PanelCopy>{t('listen.tip2')}</PanelCopy>
      </Card>
    </>
  );
}

export default function ListeningScreen({client: providedClient, resumeStorage = secureListeningResumeStorage, mediaResumeStorage = secureMediaResumeStorage, audioService}: ListeningScreenProps) {
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
  const [library, setLibrary] = useState<ListeningLibrary | null>(null);
  const [libraryState, setLibraryState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [libraryView, setLibraryView] = useState<'discover' | 'my-media'>('discover');
  const [libraryTopic, setLibraryTopic] = useState('');
  const [libraryLevel, setLibraryLevel] = useState('');
  const [libraryTag, setLibraryTag] = useState('');
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
  /**
   * `playingSegmentId` and `manualSelection` from listening.js's controller.
   * While the learner has not taken over, the selection follows the playhead;
   * the moment they tap a line it stops, and "jump to what is playing" hands
   * control back.
   */
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [manualSelection, setManualSelection] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  /**
   * Shadowing takes, keyed by asset:segment. They are the web's `shadowTakes`
   * Map: session-scoped, device-only, and dropped when the learner leaves.
   */
  const [takesByKey, setTakesByKey] = useState<Record<string, ShadowTake[]>>({});
  const [roundsByKey, setRoundsByKey] = useState<Record<string, number>>({});
  const [recording, setRecording] = useState(false);
  const [recordStatus, setRecordStatus] = useState('');
  const [playingTake, setPlayingTake] = useState<number | null>(null);
  const recordStartedAt = useRef(0);
  const audio = useMemo(() => audioService ?? new TransientAudioService(), [audioService]);
  const operation = useRef(0);
  const rehydrating = useRef(false);
  const attemptedReadyHandle = useRef<string | null>(null);
  const importMedia = useImportMedia(client, sessionCookie);
  const translateMedia = useTranslateMedia(client, sessionCookie);
  // The support language is what a meaning is rendered into -- the learner's own
  // language, not the one they are studying. `supportLanguage()` in the web.
  const profileQuery = useLearnerProfile(client, sessionCookie);
  // The server resolves the support language and returns it; native reads
  // that answer rather than assuming a language of its own.
  const supportLanguage = profileQuery.data?.support_language
    || profileQuery.data?.native_language
    || '';
  const progressQuery = useListeningProgress(client, sessionCookie, lesson?.asset.asset_id ?? '');
  const shadowingQuery = useShadowingProgress(client, sessionCookie, lesson?.asset.asset_id ?? '');
  const saveShadowing = useSaveShadowingProgress(client, sessionCookie);
  const saveProgress = useSaveListeningProgress(client, sessionCookie);
  const videoId = useMemo(() => extractYouTubeVideoId(lesson?.playback), [lesson]);
  // The web reaches curated audio and curated video through one adapter, so
  // native decides with the same shared rule rather than a second opinion.
  const directKind = directMediaKind(lesson?.playback);
  const audioUrl = directKind === 'audio' ? lesson!.playback.url : null;
  const videoUrl = directKind === 'video' ? lesson!.playback.url : null;
  const posterUrl = posterSource(lesson?.catalog?.poster_url);
  const lessonAudioPlayer = useAudioPlayer(audioUrl ? {uri: audioUrl} : null, {updateInterval: 250});
  const lessonAudioStatus = useAudioPlayerStatus(lessonAudioPlayer);
  const lessonVideoPlayer = useVideoPlayer(videoUrl ? {uri: videoUrl} : null, (player) => {
    // The media clock drives segment highlighting, so it has to tick at the
    // same cadence the audio adapter reports.
    player.timeUpdateEventInterval = 0.25;
    player.muted = false;
  });
  const videoTime = useEvent(lessonVideoPlayer, 'timeUpdate', {currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0});
  const videoPlaying = useEvent(lessonVideoPlayer, 'playingChange', {isPlaying: false, oldIsPlaying: false});
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const cuedAudioLesson = useRef('');
  const cuedVideoLesson = useRef('');
  const mediaStatus = useMediaImportStatus(mediaResumeHandle, mediaStore, sessionCookie);

  const segments = useMemo(() => lesson?.transcript?.segments ?? [], [lesson]);
  const playbackReady = segments.length > 0 && playbackAvailable(lesson?.playback);
  const selectedIndex = segments.findIndex((segment) => segment.segment_id === selectedId);
  const selected = segments[selectedIndex] ?? segments[0];
  const translationFor = (segmentId: string) => (lesson?.translations || []).find((item) => item.segment_id === segmentId)?.translated_meaning ?? '';

  useEffect(() => {
    if (!client || !sessionCookie) return;
    const learningLanguage: 'en' | 'zh' = locale === 'zh' ? 'zh' : 'en';
    let mounted = true;
    setLibraryState('loading');
    void client.listeningLibrary(learningLanguage, {sessionCookie}).then((value) => {
      if (!mounted) return;
      setLibrary(value);
      setLibraryState('ready');
    }).catch(() => { if (mounted) setLibraryState('error'); });
    return () => { mounted = false; };
  }, [client, locale, sessionCookie]);

  useEffect(() => {
    if (!audioUrl) return;
    setPlaying(lessonAudioStatus.playing);
    setCurrentTime(lessonAudioStatus.currentTime || 0);
    setDurationMs(Math.round((lessonAudioStatus.duration || 0) * 1000));
  }, [audioUrl, lessonAudioStatus.currentTime, lessonAudioStatus.duration, lessonAudioStatus.playing]);

  useEffect(() => {
    if (!audioUrl || !lesson?.catalog || lessonAudioStatus.duration <= 0) return;
    const key = `${lesson.catalog.lesson_id}:${lesson.catalog.excerpt_start_ms}`;
    if (cuedAudioLesson.current === key) return;
    cuedAudioLesson.current = key;
    void lessonAudioPlayer.seekTo(lesson.catalog.excerpt_start_ms / 1000);
  }, [audioUrl, lesson, lessonAudioPlayer, lessonAudioStatus.duration]);

  useEffect(() => {
    if (!audioUrl || !lesson?.catalog || !lessonAudioStatus.playing) return;
    if (lessonAudioStatus.currentTime * 1000 < lesson.catalog.excerpt_end_ms) return;
    lessonAudioPlayer.pause();
    void lessonAudioPlayer.seekTo(lesson.catalog.excerpt_start_ms / 1000);
  }, [audioUrl, lesson, lessonAudioPlayer, lessonAudioStatus.currentTime, lessonAudioStatus.playing]);

  useEffect(() => {
    if (!videoUrl) return;
    setPlaying(videoPlaying.isPlaying);
    setCurrentTime(videoTime.currentTime || 0);
    setDurationMs(Math.round((lessonVideoPlayer.duration || 0) * 1000));
  }, [videoUrl, videoTime.currentTime, videoPlaying.isPlaying, lessonVideoPlayer]);

  // A curated excerpt starts where the editor said it starts, which for the ZH
  // lesson is 16s into the file, not at zero.
  useEffect(() => {
    if (!videoUrl || !lesson?.catalog || lessonVideoPlayer.duration <= 0) return;
    const key = `${lesson.catalog.lesson_id}:${lesson.catalog.excerpt_start_ms}`;
    if (cuedVideoLesson.current === key) return;
    cuedVideoLesson.current = key;
    lessonVideoPlayer.currentTime = lesson.catalog.excerpt_start_ms / 1000;
  }, [videoUrl, lesson, lessonVideoPlayer, videoTime.currentTime]);

  useEffect(() => {
    if (!videoUrl || !lesson?.catalog || !videoPlaying.isPlaying) return;
    if (videoTime.currentTime * 1000 < lesson.catalog.excerpt_end_ms) return;
    lessonVideoPlayer.pause();
    lessonVideoPlayer.currentTime = lesson.catalog.excerpt_start_ms / 1000;
  }, [videoUrl, lesson, lessonVideoPlayer, videoTime.currentTime, videoPlaying.isPlaying]);

  /**
   * `translateReadyPayload()`. The import acquires the media; this translates
   * the transcript it produced, and merges the outcome in. It is deliberately a
   * second call: a slow or failing translation must not cost the learner a
   * transcript that already works, so failure records `unavailable` on the
   * lesson rather than discarding it.
   */
  const requestTranslation = useCallback((ready: MediaLesson, target: string) => {
    if (!ready.transcript?.segments.length) return;
    const asset = ready.asset;
    translateMedia.mutate({
      target_language: target,
      asset: {
        asset_id: asset.asset_id, source_url: asset.source_url, source_provider: asset.source_provider,
        source_type: asset.source_type, title: asset.title, source_language: asset.source_language,
        processing_state: asset.processing_state, duration_ms: asset.duration_ms ?? null,
        transcript_available: asset.transcript_available,
      },
      transcript: {
        asset_id: ready.transcript.asset_id,
        source_language: ready.transcript.source_language,
        segments: ready.transcript.segments.map((segment) => ({
          segment_id: segment.segment_id, order: segment.order,
          start_ms: segment.start_ms, end_ms: segment.end_ms, original_text: segment.original_text,
        })),
      },
    }, {
      onSuccess: (translated) => setLesson((current) => current && current.asset.asset_id === asset.asset_id
        ? {...current, asset: {...current.asset, ...translated.asset}, translations: translated.translations, translation: translated.translation}
        : current),
      onError: () => setLesson((current) => current && current.asset.asset_id === asset.asset_id
        ? {...current, translation: {status: 'unavailable' as const, target_language: target}}
        : current),
    });
  }, [translateMedia]);

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
  /**
   * `setPlayingSegment()`: the playhead names the line being spoken, and while
   * the learner has not taken the selection over, the selection follows it.
   */
  useEffect(() => {
    if (!segments.length) return;
    const hit = segmentAt(segments, currentTime * 1000);
    if (!hit || hit === playingSegmentId) return;
    setPlayingSegmentId(hit);
    if (!manualSelection && mode !== 'active' && mode !== 'dictation') setSelectedId(hit);
  }, [currentTime, segments, playingSegmentId, manualSelection, mode]);

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
    setPlayingSegmentId(null); setManualSelection(false); setDurationMs(0);
    // Import acquires the media and its timing; the meaning is a separate call,
    // exactly as importUrl() then translateReadyPayload() does on the web.
    importMedia.mutate({source_url: normalized, target_language: supportLanguage, include_word_timing: true, include_translation: false}, {onSuccess: async (next) => {
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
      // The web keeps a per-device list of prepared lessons so returning to the
      // same material does not mean finding the URL again.
      await rememberMediaLesson({learning_language: locale, source_url: normalized, title: next.asset.title || '', provider: next.asset.source_provider || '', selected_segment_id: segment, mode: nextMode});
      refreshHistory();
      // Speaking's prompt is a segment of this lesson, so it needs the whole
      // payload, not just the line. setSharedMediaSession() is that handoff.
      setSharedMediaSession({learning_language: locale, payload: next, selected_segment_id: segment, mode: nextMode});
      requestTranslation(next, supportLanguage);
    }, onError: () => { if (current === operation.current) { rehydrating.current = false; setNotice(t('listening.unavailable')); } }});
  }, [client, importMedia, locale, mediaStore, mode, refreshHistory, requestTranslation, resume, resumeStorage, sessionCookie, supportLanguage, t]);

  const openCuratedLesson = useCallback(async (item: ListeningLibraryLessonMetadata | string, restored: ListeningResume | null = null) => {
    if (!client || !sessionCookie) return;
    setNotice(null);
    try {
      const lessonId = typeof item === 'string' ? item : item.lesson_id;
      const next = await client.listeningLibraryLesson(lessonId, supportLanguage, {sessionCookie});
      if (!next.transcript?.segments.length) throw new Error('Curated lesson has no transcript');
      const pinyin = next.catalog?.pinyin_by_segment ?? {};
      const prepared = {...next, transcript: {...next.transcript, segments: next.transcript.segments.map((segment) => ({...segment, pinyin: pinyin[segment.segment_id] ?? ''}))}};
      const segment = prepared.transcript.segments.some((entry) => entry.segment_id === restored?.segmentId) ? restored!.segmentId : prepared.transcript.segments[0]!.segment_id;
      const nextMode = restored?.mode ?? 'follow';
      setLesson(prepared); setSelectedId(segment); setMode(nextMode); setProgress([]); setSession({}); setValidation(''); setManualSelection(false); setResume(null);
      setSharedMediaSession({learning_language: locale, payload: prepared, selected_segment_id: segment, mode: nextMode});
      await writeListeningResume({assetId: prepared.asset.asset_id, segmentId: segment, mode: nextMode, sourceUrl: prepared.asset.source_url, lessonId}, resumeStorage);
      await rememberMediaLesson({learning_language: locale, source_url: prepared.asset.source_url, lesson_id: lessonId, title: prepared.asset.title || '', provider: prepared.asset.source_provider || '', selected_segment_id: segment, mode: nextMode});
      refreshHistory();
    } catch {
      setNotice(NATIVE_LIBRARY_COPY[locale]?.failed ?? NATIVE_LIBRARY_COPY.en.failed);
    }
  }, [client, locale, refreshHistory, resumeStorage, sessionCookie, supportLanguage]);

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
    // Taking a line is taking over: smart-follow stops until the learner asks
    // for it back.
    setSelectedId(segmentId); setValidation(''); setManualSelection(true);
    const segment = segments.find((item) => item.segment_id === segmentId);
    if (segment) {
      if (audioUrl) void lessonAudioPlayer.seekTo(segment.start_ms / 1000);
      else void playerRef.current?.seekTo(segment.start_ms / 1000, true);
    }
    selectSharedMediaSegment(locale, segmentId);
    if (lesson) void writeListeningResume({assetId: lesson.asset.asset_id, segmentId, mode, sourceUrl: lesson.asset.source_url, lessonId: lesson.catalog?.lesson_id}, resumeStorage);
  };
  const changeMode = (nextMode: ListeningMode) => {
    setMode(nextMode); setValidation('');
    setSharedMediaMode(locale, nextMode);
    if (lesson) void writeListeningResume({assetId: lesson.asset.asset_id, segmentId: selectedId, mode: nextMode, sourceUrl: lesson.asset.source_url, lessonId: lesson.catalog?.lesson_id}, resumeStorage);
  };
  const seek = (delta: number) => {
    if (audioUrl) void lessonAudioPlayer.seekTo(Math.max(0, lessonAudioStatus.currentTime + delta));
    else if (videoUrl) lessonVideoPlayer.currentTime = Math.max(0, videoTime.currentTime + delta);
    else void playerRef.current?.getCurrentTime().then((seconds) => playerRef.current?.seekTo(Math.max(0, seconds + delta), true));
  };
  const replayCurrent = () => {
    if (!selected) return;
    if (audioUrl) void lessonAudioPlayer.seekTo(selected.start_ms / 1000);
    else if (videoUrl) lessonVideoPlayer.currentTime = selected.start_ms / 1000;
    else void playerRef.current?.seekTo(selected.start_ms / 1000, true);
  };
  const step = (delta: number) => { const next = segments[selectedIndex + delta]; if (next) select(next.segment_id); };
  // `followPlaying()`: hand the selection back to the playhead.
  const followPlaying = () => {
    setManualSelection(false); setValidation('');
    if (playingSegmentId) setSelectedId(playingSegmentId);
  };
  /**
   * Slow replay used to call setRate(0.75) and then apply the real rate only on
   * the audio adapter, so over curated video the UI said 0.75x while the video
   * kept playing at full speed. Every rate change goes through here instead.
   * YouTube takes it declaratively from `rate` via the player prop.
   */
  const applyPlaybackRate = (next: number) => {
    setRate(next);
    if (audioUrl) lessonAudioPlayer.playbackRate = next;
    else if (videoUrl) lessonVideoPlayer.playbackRate = next;
  };
  const cycleRate = () => {
    applyPlaybackRate(RATES[(RATES.indexOf(rate as typeof RATES[number]) + 1) % RATES.length]!);
  };
  const toggleLessonPlayback = () => {
    if (audioUrl) { if (lessonAudioStatus.playing) lessonAudioPlayer.pause(); else lessonAudioPlayer.play(); }
    else if (videoUrl) { if (videoPlaying.isPlaying) lessonVideoPlayer.pause(); else lessonVideoPlayer.play(); }
    else setPlaying((value) => !value);
  };
  const toggleLessonMute = () => {
    const next = !muted;
    setMuted(next);
    if (audioUrl) lessonAudioPlayer.muted = next;
    else if (videoUrl) lessonVideoPlayer.muted = next;
  };
  const currentTakeKey = takeKey(lesson?.asset.asset_id, selected?.segment_id);
  const takes = takesByKey[currentTakeKey] ?? [];

  /**
   * One round: record, then keep the file somewhere the next round will not
   * delete, then tell the server how many rounds this segment has had. Only the
   * count is sent -- the recording never leaves the device.
   */
  const toggleRecord = async () => {
    if (recording) {
      const stopped = await audio.stopRecording();
      setRecording(false);
      if (stopped.state !== 'recorded') { setRecordStatus(t('shadow.take_failed')); return; }
      const uri = audio.getRecordingUri();
      const kept = uri ? keepTake(uri, Date.now() - recordStartedAt.current) : null;
      if (!kept) { setRecordStatus(t('shadow.take_failed')); return; }
      const next = [...(takesByKey[currentTakeKey] ?? []), kept];
      setTakesByKey((current) => ({...current, [currentTakeKey]: next}));
      setRoundsByKey((current) => ({...current, [currentTakeKey]: next.length}));
      setRecordStatus(t('shadow.recorded'));
      if (lesson && selected) {
        setRecordStatus(t('shadow.rounds_saving'));
        saveShadowing.mutate({asset_id: lesson.asset.asset_id, segment_id: selected.segment_id, completed_rounds: next.length}, {
          onSuccess: () => setRecordStatus(t('shadow.rounds_saved')),
          onError: () => setRecordStatus(t('shadow.rounds_failed')),
        });
      }
      return;
    }
    setPlaying(false);
    const started = await audio.startRecording();
    if (started.state !== 'recording') {
      setRecordStatus(started.state === 'denied' || started.state === 'restricted' ? t('shadow.mic_denied') : t('shadow.take_failed'));
      return;
    }
    recordStartedAt.current = Date.now();
    setRecording(true);
    setRecordStatus(t('shadow.recording'));
  };

  const playTake = (index: number) => {
    const take = takes[index];
    if (!take) return;
    setPlayingTake(index);
    void audio.playUri(take.uri).finally(() => setPlayingTake(null));
  };

  // Leaving the studio drops the takes from the device, which is the guarantee
  // the web makes by never persisting them at all.
  const discardTakes = useCallback(() => {
    setTakesByKey((current) => {
      releaseTakes(Object.values(current).flat());
      return {};
    });
    setRecordStatus('');
  }, []);
  useEffect(() => () => { void audio.release(); }, [audio]);

  const openSpeaking = () => {
    if (!lesson || !selected) return;
    router.push({pathname: '/(app)/speaking', params: {mode: 'shadowing', assetId: lesson.asset.asset_id, segmentId: selected.segment_id, sourceUrl: lesson.asset.source_url, referenceText: selected.original_text}} as never);
  };

  const saveDictationWord = async (word: string) => {
    if (!lesson || !selected || !client || !sessionCookie) return;
    const actionCopy = DICTATION_ACTION_COPY[locale] ?? DICTATION_ACTION_COPY.en;
    try {
      await client.saveLibraryVocabulary({word, phonetic: '', part_of_speech: '', definition: 'Dictation word to review', translation_vi: '', source_fragment: selected.original_text, source_kind: 'feedback', focus_note: `Listening Dictation · ${lesson.asset.title}`}, {sessionCookie});
      setNotice(actionCopy.saved);
    } catch {
      setNotice(actionCopy.saveFailed);
    }
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
        hint_level: presentation === 'revealed' ? 4 : existing.hint_level ?? 0,
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
    const libraryCopy = NATIVE_LIBRARY_COPY[locale] ?? NATIVE_LIBRARY_COPY.en;
    const filterCopy = DISCOVERY_FILTER_COPY[locale] ?? DISCOVERY_FILTER_COPY.en;
    const tagCopy = TAG_FILTER_COPY[locale] ?? TAG_FILTER_COPY.en;
    const libraryItems = (library?.items ?? []).filter((item) => (!libraryTopic || item.topic === libraryTopic || (item.subtopics ?? []).includes(libraryTopic)) && (!libraryLevel || item.level === libraryLevel) && (!libraryTag || item.content_tags.includes(libraryTag)));
    return (
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.page, {backgroundColor: tokens.colors.background}]}>
        <Masthead name={t('listening.title')} purpose={libraryCopy.purpose} />
        <View accessibilityRole="tablist" style={[styles.primaryTabs, {backgroundColor: tokens.colors.surfaceSunken, borderColor: tokens.colors.border}]}>
          <Tab label={libraryCopy.discover} active={libraryView === 'discover'} onPress={() => setLibraryView('discover')} />
          <Tab label={libraryCopy.myMedia} active={libraryView === 'my-media'} onPress={() => setLibraryView('my-media')} />
        </View>
        {libraryView === 'discover' ? (
          <View style={styles.libraryStack}>
            <Text accessibilityRole="header" style={[styles.libraryHeading, {color: tokens.colors.heading}]}>{libraryCopy.recommended}</Text>
            <View style={styles.filterGroup}>
              <ContextLabel>{filterCopy.topics}</ContextLabel>
              <View style={styles.filterRow}>
                {['', ...(library?.topics ?? [])].map((topic) => <Pressable key={topic || 'all-topics'} accessibilityRole="button" accessibilityState={{selected: libraryTopic === topic}} onPress={() => setLibraryTopic(topic)} style={[styles.filterChip, {borderColor: libraryTopic === topic ? tokens.colors.accent : tokens.colors.border, backgroundColor: libraryTopic === topic ? tokens.colors.accentTint : tokens.colors.surface}]}><Text style={{color: libraryTopic === topic ? tokens.colors.accent : tokens.colors.mutedText}}>{topic ? nativeLibraryTerm(topic, locale) : filterCopy.allTopics}</Text></Pressable>)}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <ContextLabel>{tagCopy.tags}</ContextLabel>
              <View style={styles.filterRow}>
                {['', ...(library?.tags ?? library?.filters.tags ?? [])].map((tag) => <Pressable key={tag || 'all-tags'} accessibilityRole="button" accessibilityState={{selected: libraryTag === tag}} onPress={() => setLibraryTag(tag)} style={[styles.filterChip, {borderColor: libraryTag === tag ? tokens.colors.accent : tokens.colors.border, backgroundColor: libraryTag === tag ? tokens.colors.accentTint : tokens.colors.surface}]}><Text style={{color: libraryTag === tag ? tokens.colors.accent : tokens.colors.mutedText}}>{tag ? `#${nativeLibraryTerm(tag, locale)}` : tagCopy.allTags}</Text></Pressable>)}
              </View>
            </View>
            <View style={styles.filterGroup}>
              <ContextLabel>{filterCopy.level}</ContextLabel>
              <View style={styles.filterRow}>
                {['', ...(library?.filters.levels ?? [])].map((level) => <Pressable key={level || 'all-levels'} accessibilityRole="button" accessibilityState={{selected: libraryLevel === level}} onPress={() => setLibraryLevel(level)} style={[styles.filterChip, {borderColor: libraryLevel === level ? tokens.colors.accent : tokens.colors.border, backgroundColor: libraryLevel === level ? tokens.colors.accentTint : tokens.colors.surface}]}><Text style={{color: libraryLevel === level ? tokens.colors.accent : tokens.colors.mutedText}}>{level || filterCopy.allLevels}</Text></Pressable>)}
              </View>
            </View>
            {libraryState === 'loading' ? <PanelCopy>{libraryCopy.loading}</PanelCopy> : null}
            {libraryState === 'error' ? <PanelCopy>{libraryCopy.failed}</PanelCopy> : null}
            {libraryItems.map((item) => (
              <Card key={item.lesson_id} style={styles.libraryCard}>
                <LibraryArtwork item={item} />
                <View style={styles.libraryBody}>
                  <View style={styles.libraryMeta}><Chip>{nativeLibraryTerm(item.topic, locale)}</Chip><Chip>{item.level}</Chip><Chip>{stamp(item.duration_ms)}</Chip></View>
                  <Text style={[styles.libraryTitle, {color: tokens.colors.heading}]}>{item.title}</Text>
                  <Text style={[styles.libraryDescription, {color: tokens.colors.mutedText}]}>{item.description}</Text>
                  <Text style={[styles.libraryModes, {color: tokens.colors.accent}]}>{item.content_tags.slice(0, 3).map((tag) => `#${nativeLibraryTerm(tag, locale)}`).join('  ')}</Text>
                  <Text style={[styles.libraryModes, {color: tokens.colors.faintText}]}>{tagCopy.source}: {item.source.creator || item.source.provider}</Text>
                  <Text style={[styles.libraryModes, {color: tokens.colors.faintText}]}>{item.available_modes.map((availableMode) => nativeLibraryTerm(availableMode, locale)).join(' · ')}</Text>
                  <OrenaButton label={libraryCopy.start} compact onPress={() => { void openCuratedLesson(item); }} />
                </View>
              </Card>
            ))}
            {notice ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text> : null}
          </View>
        ) : <>
        {(resume || (pending && mediaResume)) ? (
          <Panel>
            <PanelCopy>{t('listening.resume_found')}</PanelCopy>
            <OrenaButton label={t('listening.resume')} onPress={() => { if (pending && mediaResume) { setSourceUrl(pending.sourceUrl); attemptedReadyHandle.current = null; rehydrating.current = false; if (mediaResume.resumable) setMediaResumeHandle(mediaResume.resumeHandle); else { rehydrating.current = true; prepare(pending.sourceUrl); } } else if (resume?.lessonId) { void openCuratedLesson(resume.lessonId, resume); } else if (resume) { setSourceUrl(resume.sourceUrl); prepare(resume.sourceUrl); } }} />
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
        {history.some((item) => !item.lesson_id) ? (
          <View style={styles.introBlock}>
            <ContextLabel>{t('listen.recent_title')}</ContextLabel>
            {history.filter((item) => !item.lesson_id).map((item) => <RowButton key={item.source_url} label={item.title || item.source_url} sub={item.provider || undefined} icon="arrowRight" onPress={() => { setSourceUrl(item.source_url); prepare(item.source_url); }} />)}
          </View>
        ) : null}
        <View style={styles.introBlock}>
          <ContextLabel>{t('listen.need_title')}</ContextLabel>
          <PanelCopy>{t('listen.need1')}</PanelCopy>
          <PanelCopy>{t('listen.need2')}</PanelCopy>
          <PanelCopy>{t('listen.need3')}</PanelCopy>
        </View>
        <GoalPanel />
        </>}
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
            lesson={lesson} videoId={videoId} playbackReady={playbackReady} playing={playing} muted={muted} rate={rate}
            elapsedMs={currentTime * 1000} durationMs={durationMs}
            onChangeState={setPlaying}
            onReady={() => { void playerRef.current?.getDuration().then((seconds) => setDurationMs(Math.round(seconds * 1000))); if ((lesson.catalog?.excerpt_start_ms ?? 0) > 0) void playerRef.current?.seekTo((lesson.catalog?.excerpt_start_ms ?? 0) / 1000, true); }}
            onTogglePlay={toggleLessonPlayback} onSeek={seek}
            onToggleMute={toggleLessonMute} onCycleRate={cycleRate} playerRef={playerRef}
            videoPlayer={videoUrl ? lessonVideoPlayer : null} videoSource={videoUrl} posterUrl={posterUrl}
          />
        </View>
      )}
      <ScrollView style={{flex: 1}} contentContainerStyle={styles.frameScroll}>
        {mode === 'shadowing' ? (
          <StudioBar onOpenSpeaking={openSpeaking} onLeave={() => { discardTakes(); changeMode('follow'); }} />
        ) : (
          <ListeningHeader mode={mode} playbackReady={playbackReady} focus={focus} onFocus={() => setFocus((value) => !value)} onMode={changeMode} />
        )}
        {notices.length ? <View style={styles.notices}>{notices}</View> : null}
        {mode === 'follow' ? (
          <FollowWorkspace
            lesson={lesson} segments={segments} selectedId={selected?.segment_id ?? ''}
            playingId={playingSegmentId} following={!manualSelection}
            original={original} meaning={meaning} maxHeight={transcriptHeight}
            onToggleOriginal={() => setOriginal((value) => !value)} onToggleMeaning={() => setMeaning((value) => !value)}
            onSelect={select} onShadow={() => changeMode('shadowing')} onOpenSpeaking={openSpeaking} onFollowPlaying={followPlaying}
            index={selectedIndex} onPrevious={() => step(-1)} onReplay={replayCurrent} onNext={() => step(1)}
          />
        ) : null}
        {mode === 'active' || mode === 'dictation' ? (
          <ActiveWorkspace
            lesson={lesson} segments={segments} selectedId={selected?.segment_id ?? ''} session={session}
            validation={validation} persistence={progressQuery.isError ? t('listening.progress_unavailable') : saveProgress.isPending ? t('listening.checking') : ''}
            maxHeight={transcriptHeight} dictation={mode === 'dictation'}
            onSelect={select}
            onDraft={(value) => setSession((current) => ({...current, [selected!.segment_id]: {presentation: current[selected!.segment_id]?.presentation ?? 'checked', draft: value, attempts: current[selected!.segment_id]?.attempts ?? [], hint_level: current[selected!.segment_id]?.hint_level ?? 0}}))}
            onCheck={() => commit('checked')} onReveal={() => commit('revealed')}
            onHint={() => setSession((current) => ({...current, [selected!.segment_id]: {presentation: current[selected!.segment_id]?.presentation ?? 'checked', draft: current[selected!.segment_id]?.draft ?? '', attempts: current[selected!.segment_id]?.attempts ?? [], hint_level: Math.min(3, (current[selected!.segment_id]?.hint_level ?? 0) + 1)}}))}
            onRetry={() => setSession((current) => ({...current, [selected!.segment_id]: {presentation: 'checked', draft: '', attempts: current[selected!.segment_id]?.attempts ?? [], hint_level: 0}}))}
            onSlowReplay={() => { applyPlaybackRate(SLOW_RATE); replayCurrent(); }}
            onShadow={() => changeMode('shadowing')}
            onSaveWord={(word) => { void saveDictationWord(word); }}
            index={selectedIndex} onPrevious={() => step(-1)} onReplay={replayCurrent} onNext={() => step(1)}
          />
        ) : null}
        {mode === 'shadowing' ? (
          <ShadowingStudio
            segment={selected} segments={segments} selectedId={selected?.segment_id ?? ''}
            meaning={selected ? translationFor(selected.segment_id) : ''}
            takes={takes} rounds={roundCount(takes.length)} recording={recording}
            status={recordStatus} playingTake={playingTake}
            summary={shadowingSummary(roundsByKey, segments.length)}
            persistence={shadowingQuery.isError ? t('shadow.rounds_failed') : ''}
            onSelect={select} onReplay={replayCurrent}
            onToggleRecord={() => { void toggleRecord(); }} onPlayTake={playTake}
          />
        ) : null}
        {mode !== 'shadowing' && selected ? (
          <CurrentSegmentPanel segment={selected} meaning={translationFor(selected.segment_id)} mode={mode} showOriginal={original} showMeaning={meaning} onReplay={replayCurrent} />
        ) : null}
        {mode === 'follow' && original ? <VocabularyFocusPanel hits={vocabularyHits} /> : null}
        <GoalPanel />
        <SourcePanel lesson={lesson} />
        <SavedLessonsPanel lessons={history.filter((item) => !item.lesson_id)} onOpen={(url) => { setSourceUrl(url); prepare(url); }} onNew={restart} />
      </ScrollView>
      <TransportBar
        playing={playing} muted={muted} rate={rate} subtitles={original}
        onSeek={seek} onPrevious={() => step(-1)} onNext={() => step(1)}
        onTogglePlay={toggleLessonPlayback} onToggleMute={toggleLessonMute}
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
  nativeVideo: {height: 190, width: '100%', backgroundColor: '#000'},
  videoPoster: {position: 'absolute', top: 0, left: 0, right: 0, height: 190},
  audioFrame: {height: 150, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 10},
  audioLabel: {fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600'},
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
  primaryTabs: {flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1, borderRadius: 999},
  libraryStack: {gap: 14},
  libraryHeading: {fontSize: 22, lineHeight: 28, fontWeight: '700'},
  filterGroup: {gap: 7},
  filterRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  filterChip: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7},
  libraryCard: {padding: 0, overflow: 'hidden'},
  libraryArtwork: {height: 112, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  libraryPoster: {width: '100%', height: '100%'},
  libraryBody: {padding: 16, gap: 10},
  libraryMeta: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  libraryTitle: {fontSize: 19, lineHeight: 24, fontWeight: '700'},
  libraryDescription: {fontSize: 14, lineHeight: 21},
  libraryModes: {fontSize: 12, lineHeight: 18},

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
  hintPanel: {padding: 12, borderWidth: 1, borderRadius: 12, gap: 5},
  activeResult: {paddingHorizontal: 12, gap: 6},
  diffRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  diffChip: {borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, fontWeight: '600'},
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
  // `.o-strip-card{width:150px}` at the phone breakpoint, and the track scrolls.
  strip: {gap: 8, paddingVertical: 2},
  stripCard: {width: 150, padding: 10, borderWidth: 1, borderRadius: 15, gap: 6},
  stripHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  stripIndex: {fontSize: 15, fontWeight: '700'},
  stripText: {fontSize: 12, lineHeight: 17},
  // `.o-practice{padding:18px 14px;gap:14px}`
  practiceCard: {paddingVertical: 18, paddingHorizontal: 14, gap: 14},
  practiceHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  practiceCount: {fontSize: 12},
  // `.o-practice-line{font-size:clamp(19px,5.4vw,24px)}`
  practiceLine: {fontSize: 22, lineHeight: 32, fontWeight: '500'},
  // `.o-practice-actions{gap:clamp(20px,7vw,52px)}`
  practiceActions: {flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 28},
  practiceAction: {alignItems: 'center', gap: 6, maxWidth: 96},
  roundButton: {width: 62, height: 62, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  practiceActionLabel: {fontSize: 12, textAlign: 'center'},
  takeList: {gap: 8},
  // `.o-take{padding:14px;gap:10px}`
  take: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 1, borderRadius: 15},
  takePending: {borderStyle: 'dashed'},
  takeIndex: {width: 18, fontSize: 13, fontWeight: '600'},
  takeStart: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32},
  takeStartLabel: {fontSize: 14, fontWeight: '500'},
  takeBody: {flex: 1, gap: 4},
  takeWhen: {fontSize: 11},
  takePlayer: {flexDirection: 'row', alignItems: 'center', gap: 8},
  takeTime: {fontSize: 12, fontVariant: ['tabular-nums']},
  takeVerdict: {fontSize: 11, lineHeight: 16},
  // `.o-take-score{min-width:62px}` — the reference keeps the score column on a
  // phone; it only narrows. It stays empty because nothing here scores speech.
  takeScore: {minWidth: 62, alignItems: 'center', gap: 4},
  scoreRing: {width: 42, height: 42, borderRadius: 999, borderWidth: 1, textAlign: 'center', lineHeight: 40, fontSize: 14},
  takeScoreLabel: {fontSize: 10, textAlign: 'center'},

  transport: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1},
  transportMain: {flexDirection: 'row', alignItems: 'center', gap: 4},

  goalRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  goalTrack: {height: 6, borderRadius: 999, overflow: 'hidden'},
  goalFill: {height: '100%', borderRadius: 999},
  goalEdit: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  goalInput: {flex: 1, borderWidth: 1, borderRadius: 15, padding: 10, minHeight: 44},
});
