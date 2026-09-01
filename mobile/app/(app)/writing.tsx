import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, UIManager, View, useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {isApiError} from '../../src/api/errors';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import type {MessageId} from '../../src/i18n/messages';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useEvaluateWriting, useGenerateTask} from '../../src/query/useWritingEvaluation';
import {useContextualDictionary} from '../../src/query/useReadingLibrary';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {useJourneyDashboard} from '../../src/query/useJourney';
import {consumeWritingHandoff, type WritingHandoff} from '../../src/features/writing/writingHandoff';
import {setReviewHandoff} from '../../src/features/review/reviewHandoff';
import {clearWritingDraft, emptyWritingDraft, readWritingDraft, writeWritingDraft, type WritingDraft} from '../../src/features/writing/writingDraft';
import {
  RUBRIC_CATEGORIES, SUPPORT_KEYS, WORD_ROLES, bandTier, countUnits, difficultyAdjustment,
  evaluationErrorKey, guidanceLabel, guidanceMode, normalizedWatchlist, savedLabel,
  watchlistTrend, writingScaffold, type SupportKey, type WordRole,
} from '../../src/features/writing/writingDomain';
import type {EvaluationInput, PracticeContext} from '../../src/api/contracts/learning';
import {Button, Chip, Label, Panel, PanelCopy} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/write.js and orena/writing.css, using the
 * web's own phone breakpoint (max-width:1023px) as the layout blueprint: one
 * column, the draft and the setup panel as collapsible disclosures, and the
 * primary action leaving the flow for a sticky bar under the thumb.
 *
 * Everything write.js renders is here except its contenteditable toolbar
 * (bold/italic/lists/links/block format). React Native has no contenteditable
 * and no rich-text surface without a third-party editor, so the draft is plain
 * text -- which is also exactly what the evaluator receives on the web, where
 * `submitForReview` sends `editor.innerText`. The formatting is a local
 * convenience the request never carried.
 */

// static/becoming/language.js's per-language config, the same values web reads.
const LEVELS_BY_LANGUAGE: Record<'en' | 'zh', readonly string[]> = {
  en: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  zh: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7-9'],
};
const DEFAULT_LEVEL: Record<'en' | 'zh', string> = {en: 'B2', zh: 'HSK4'};
const LENGTHS_BY_LANGUAGE: Record<'en' | 'zh', readonly number[]> = {
  en: [100, 120, 150, 180, 220, 280],
  zh: [40, 60, 80, 120, 180, 250],
};
const MODE_KEYS_BY_LANGUAGE: Record<'en' | 'zh', readonly string[]> = {
  en: ['free', 'opinion', 'email', 'review', 'story', 'toeic', 'custom'],
  zh: ['free', 'opinion', 'email', 'review', 'story', 'hsk', 'custom'],
};
const TOPIC_KEYS = ['random', 'daily_life', 'work', 'science', 'culture', 'community'] as const;

/** write.js's `canGenerate`: free and custom briefs are the learner's own. */
const GENERATABLE = (mode: string) => !['free', 'custom'].includes(mode);

type LocalTask = {title: string; prompt: string; checklist: string[]; targetLevel: string};

function contextFromTask(handoff: WritingHandoff): PracticeContext | undefined {
  if (handoff.kind === 'practice') { const r = handoff.task.personalization; return {intent: r.intent, focus_category: r.focus_category, focus_label: r.focus_label, focus_family: r.focus_family, focus_status: r.focus_status, task_type: r.task_type, topic: r.topic, target_level: r.target_level, action_label: r.action_label, reason: r.reason, evidence: r.evidence, focus_instruction: r.focus_instruction}; }
  if (handoff.kind === 'grammar') return handoff.task.practice_context;
  return undefined;
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** The web collapses both panels on a phone; the motion is ported, not the CSS. */
function Disclosure({title, children, initiallyOpen = true}: {title: string; children: React.ReactNode; initiallyOpen?: boolean}) {
  const {tokens} = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={styles.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((value) => !value); }}
        style={styles.disclosureToggle}
      >
        <Text style={[styles.disclosureTitle, {color: tokens.colors.heading}]}>{title}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? <View style={styles.disclosureBody}>{children}</View> : null}
    </View>
  );
}

/** write.js's `selectControl`, as the pill row native already uses elsewhere. */
function PillRow<T extends string | number>({values, current, onSelect, labelOf, accessibilityLabel}: {
  values: readonly T[]; current: T; onSelect: (value: T) => void; labelOf: (value: T) => string; accessibilityLabel: string;
}) {
  const {tokens} = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.pillRow}>
      {values.map((value) => {
        const selected = String(value) === String(current);
        return (
          <Pressable
            key={String(value)}
            accessibilityRole="radio"
            accessibilityState={{selected}}
            accessibilityLabel={labelOf(value)}
            onPress={() => onSelect(value)}
            style={[styles.pill, {borderColor: selected ? tokens.colors.accent : tokens.colors.border, backgroundColor: selected ? tokens.colors.surfaceSunken : 'transparent'}]}
          >
            <Text style={{color: tokens.colors.text, fontWeight: selected ? '700' : '400'}}>{labelOf(value)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WritingScreen() {
  const {t, locale} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter();
  const {width} = useWindowDimensions();
  const compact = width < 1024; // orena/writing.css's @media (max-width:1023px)
  const [handoff] = useState(consumeWritingHandoff);
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const evaluate = useEvaluateWriting(client, sessionCookie);
  const generate = useGenerateTask(client, sessionCookie);
  const dictionary = useContextualDictionary(client, sessionCookie);
  const profile = useLearnerProfile(client, sessionCookie, Boolean(sessionCookie));
  const dashboard = useJourneyDashboard(client, sessionCookie);

  const learningLanguage: 'en' | 'zh' = handoff?.kind === 'practice'
    ? handoff.task.personalization.language
    : handoff?.kind === 'grammar' || handoff?.kind === 'revise'
      ? handoff.learningLanguage
      : profile.data?.language ?? 'en';

  const [draft, setDraft] = useState<WritingDraft>(() => ({
    ...emptyWritingDraft,
    text: handoff?.kind === 'revise' ? handoff.text : '',
    parentEssayId: handoff?.kind === 'revise' ? handoff.essayId : null,
  }));
  const [localTask, setLocalTask] = useState<LocalTask | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [selection, setSelection] = useState('');
  const [, refreshSavedStamp] = useState(0);
  const hydrated = useRef(false);

  // A handoff carries its own text and must not be overwritten by an older draft.
  useEffect(() => {
    let mounted = true;
    void readWritingDraft().then((stored) => {
      if (!mounted || !stored) { hydrated.current = true; return; }
      setDraft((current) => handoff ? {...stored, text: current.text, parentEssayId: current.parentEssayId} : stored);
      hydrated.current = true;
    });
    return () => { mounted = false; };
  }, [handoff]);

  const save = useCallback((patch: Partial<WritingDraft>) => {
    setDraft((current) => {
      const next = {...current, ...patch};
      if (hydrated.current) void writeWritingDraft(next);
      return next;
    });
  }, []);

  /* The saved stamp is a relative time, so it goes stale on its own -- write.js
     refreshes it on a 30s interval and this does the same. */
  useEffect(() => {
    const ticker = setInterval(() => refreshSavedStamp((value) => value + 1), 30000);
    return () => clearInterval(ticker);
  }, []);

  const level = draft.level || DEFAULT_LEVEL[learningLanguage];
  const lengths = LENGTHS_BY_LANGUAGE[learningLanguage];
  const length = draft.length ?? lengths[0]!;
  const adaptiveMode = guidanceMode(profile.data?.style, learningLanguage, level);
  const scaffold = writingScaffold(adaptiveMode, learningLanguage);
  const watchlist = normalizedWatchlist(dashboard.data?.error_memory);
  const units = countUnits(draft.text, learningLanguage);
  const stamp = savedLabel(draft.savedAt);

  /* write.js's promptText(): the instruction is the brief a learner answers, and
     the raw prompt is only its fallback. */
  const active = handoff
    ? {
        title: handoff.kind === 'practice' ? handoff.task.title : handoff.kind === 'grammar' ? handoff.task.title : t('writing.revise_title'),
        prompt: handoff.kind === 'practice' ? (handoff.task.instruction.trim() || handoff.task.prompt) : handoff.kind === 'grammar' ? handoff.task.prompt : handoff.prompt,
        targetLevel: handoff.kind === 'practice' ? handoff.task.target_level : handoff.kind === 'grammar' ? handoff.task.target_level : handoff.targetLevel,
        checklist: handoff.kind === 'practice' ? handoff.task.checklist : [],
        focusLabel: handoff.kind === 'practice' ? handoff.task.personalization.focus_label : '',
        difficulty: handoff.kind === 'practice' ? difficultyAdjustment(handoff.task.personalization) : null,
      }
    : localTask
      ? {title: localTask.title, prompt: localTask.prompt, targetLevel: localTask.targetLevel, checklist: localTask.checklist, focusLabel: '', difficulty: null}
      : {title: '', prompt: draft.mode === 'custom' ? draft.prompt : '', targetLevel: level, checklist: [], focusLabel: '', difficulty: null};

  const createBrief = () => {
    setNotice(null);
    generate.mutate(
      {task_type: draft.mode as 'opinion' | 'email' | 'review' | 'story' | 'toeic' | 'hsk', topic: draft.topic || 'random', target_cefr: level, word_target: length},
      {
        onSuccess: (task) => {
          setLocalTask({title: task.title, prompt: task.prompt, checklist: task.checklist, targetLevel: task.target_level});
          save({prompt: task.prompt});
          setNotice(t((task.source === 'built-in' ? 'write.builtin_ready' : 'write.brief_ready') as MessageId));
        },
        onError: () => setNotice(t('write.brief_failed' as MessageId)),
      },
    );
  };

  const clearDraft = () => {
    if (!draft.text.trim()) return;
    Alert.alert(t('write.clear_draft' as MessageId), t('write.clear_confirm' as MessageId), [
      {text: t('write.clear_cancel' as MessageId), style: 'cancel'},
      {text: t('write.clear_draft' as MessageId), style: 'destructive', onPress: () => {
        save({text: '', savedAt: null, parentEssayId: null});
        void clearWritingDraft().then(() => writeWritingDraft({...draft, text: '', savedAt: null, parentEssayId: null}));
      }},
    ]);
  };

  const lookUpSelection = () => {
    const term = selection.trim().slice(0, 180);
    if (!term) return;
    setNotice(null);
    dictionary.mutate({text: term, source_language: learningLanguage, target_language: locale, context: draft.text.slice(0, 2400) || term});
  };

  const submit = () => {
    const text = draft.text.trim();
    if (text.length < 10) { setNotice(t('write.short_first' as MessageId)); return; }
    setNotice(null);
    const context = handoff ? contextFromTask(handoff) : undefined;
    const base: EvaluationInput = {
      prompt: active.prompt, text, target_cefr: active.targetLevel,
      ...(context ? {practice_context: context} : {}),
      learning_language: learningLanguage,
    };
    const finish = (result: Parameters<typeof setReviewHandoff>[0], input: EvaluationInput) => {
      save({text, parentEssayId: result.id, savedAt: Date.now()});
      setReviewHandoff(result, input);
      router.push('/(app)/review');
    };
    const withParent: EvaluationInput = draft.parentEssayId ? {...base, parent_essay_id: draft.parentEssayId} : base;
    evaluate.mutate(withParent, {
      onSuccess: (result) => finish(result, withParent),
      onError: (error) => {
        /* A locally remembered parent essay can go stale (deleted, or from a
           different learning-language scope). Recover by saving the learner's
           text as a fresh entry instead of losing it -- write.js does the same. */
        if (draft.parentEssayId && isApiError(error) && error.status === 404 && error.serverCategory === 'parent_essay_not_found') {
          save({parentEssayId: null});
          setNotice(t('write.parent_missing_retry' as MessageId));
          evaluate.mutate(base, {onSuccess: (result) => finish(result, base), onError: (retryError) => setNotice(t(evaluationErrorKey(isApiError(retryError) ? retryError.serverCategory : undefined) as MessageId))});
          return;
        }
        setNotice(t(evaluationErrorKey(isApiError(error) ? error.serverCategory : undefined) as MessageId));
      },
    });
  };

  const band = bandTier(active.targetLevel);
  const roleColor: Record<WordRole, string> = {
    verb: tokens.colors.roleVerb, noun: tokens.colors.roleNoun,
    adjective: tokens.colors.roleAdjective, adverb: tokens.colors.roleAdverb,
  };

  const promptCard = (
    <Panel>
      <Label>{t('write.prompt' as MessageId)}</Label>
      <Text style={[styles.promptText, {color: tokens.colors.heading}]}>{active.prompt || t('write.no_prompt' as MessageId)}</Text>
      {active.focusLabel ? <Text style={[styles.kicker, {color: tokens.colors.mutedText}]}>{`${t('write.memory_guided' as MessageId)} · ${active.focusLabel}`}</Text> : null}
      {active.difficulty ? <Text style={[styles.kicker, {color: tokens.colors.mutedText}]}>{fill(t(active.difficulty.key as MessageId), {delta: active.difficulty.delta})}</Text> : null}
      <View style={styles.promptFoot}>
        <Chip>{active.targetLevel}</Chip>
        {band ? <Text style={{color: tokens.colors.mutedText}}>{t(`band.${band}` as MessageId)}</Text> : null}
        {!handoff && GENERATABLE(draft.mode) ? (
          <Button label={generate.isPending ? t('writing.creating' as MessageId) : t('write.create_brief' as MessageId)} variant="outline" compact disabled={generate.isPending} onPress={createBrief} />
        ) : null}
        <Button label={t('write.view_rubric' as MessageId)} variant="outline" compact onPress={() => setRubricOpen(true)} />
      </View>
    </Panel>
  );

  const editorCard = (
    <Panel>
      <Disclosure title={t('write.your_draft' as MessageId)}>
        <TextInput
          accessibilityLabel={t('write.your_draft' as MessageId)}
          multiline
          value={draft.text}
          onChangeText={(value) => save({text: value, savedAt: Date.now()})}
          onSelectionChange={(event) => {
            const {start, end} = event.nativeEvent.selection;
            setSelection(end > start ? draft.text.slice(start, end) : '');
          }}
          placeholder={t('write.editor_placeholder' as MessageId)}
          placeholderTextColor={tokens.colors.faintText}
          style={[styles.input, {color: tokens.colors.text}]}
          textAlignVertical="top"
          spellCheck={learningLanguage === 'en'}
        />
        <View style={[styles.editorFoot, {borderTopColor: tokens.colors.border}]}>
          <Text style={{color: tokens.colors.mutedText}}>{`${units} ${t('writing.words' as MessageId)}`}</Text>
          <View style={styles.editorFootRight}>
            {selection.trim() ? (
              <Button label={dictionary.isPending ? t('reading.explaining' as MessageId) : t('write.lookup_selection' as MessageId)} variant="outline" compact disabled={dictionary.isPending} onPress={lookUpSelection} />
            ) : null}
            <Text style={{color: tokens.colors.mutedText}}>{stamp.n === undefined ? t(stamp.key as MessageId) : fill(t(stamp.key as MessageId), {n: stamp.n})}</Text>
          </View>
        </View>
        {dictionary.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.dictionary_failed' as MessageId)}</Text> : null}
        {dictionary.data ? (
          dictionary.data.available && dictionary.data.summary
            ? <View style={styles.lookupResult}><Label>{t('reading.meaning' as MessageId)}</Label><PanelCopy>{dictionary.data.summary}</PanelCopy></View>
            : <PanelCopy>{t('write.lookup_empty' as MessageId)}</PanelCopy>
        ) : null}
      </Disclosure>
    </Panel>
  );

  const setupPanel = (
    <Panel>
      <Disclosure title={t('write.setup_panel' as MessageId)} initiallyOpen={!compact}>
        <Label>{t('write.mode_short' as MessageId)}</Label>
        <PillRow
          accessibilityLabel={t('write.mode_short' as MessageId)}
          values={MODE_KEYS_BY_LANGUAGE[learningLanguage]}
          current={draft.mode}
          labelOf={(value) => t(`writing.mode_${value}` as MessageId)}
          onSelect={(value) => { setLocalTask(null); save({mode: value, prompt: '', savedAt: draft.savedAt}); }}
        />

        <Label>{t('write.level' as MessageId)}</Label>
        <PillRow
          accessibilityLabel={t('write.level' as MessageId)}
          values={LEVELS_BY_LANGUAGE[learningLanguage]}
          current={level}
          labelOf={(value) => `${value} · ${bandTier(value) ? t(`band.${bandTier(value)}` as MessageId) : ''}`.trim()}
          onSelect={(value) => save({level: value})}
        />

        <Label>{t('write.length_target' as MessageId)}</Label>
        <PillRow
          accessibilityLabel={t('write.length_target' as MessageId)}
          values={lengths}
          current={length}
          labelOf={(value) => `~${value}`}
          onSelect={(value) => { setLocalTask(null); save({length: value}); }}
        />

        <Label>{t('write.topic' as MessageId)}</Label>
        <PillRow
          accessibilityLabel={t('write.topic' as MessageId)}
          values={TOPIC_KEYS}
          current={(TOPIC_KEYS as readonly string[]).includes(draft.topic) ? draft.topic : 'random'}
          labelOf={(value) => t(`reading.topic_${value}` as MessageId)}
          onSelect={(value) => { setLocalTask(null); save({topic: value}); }}
        />

        <Label>{t('write.audience' as MessageId)}</Label>
        <TextInput
          accessibilityLabel={t('write.audience' as MessageId)}
          value={draft.audience}
          onChangeText={(value) => save({audience: value.slice(0, 80)})}
          placeholder={t('write.audience_placeholder' as MessageId)}
          placeholderTextColor={tokens.colors.mutedText}
          style={[styles.control, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]}
        />

        {draft.mode === 'custom' ? (
          <>
            <Label>{t('write.custom_prompt' as MessageId)}</Label>
            <TextInput
              accessibilityLabel={t('write.custom_prompt' as MessageId)}
              value={draft.prompt}
              onChangeText={(value) => save({prompt: value})}
              placeholder={t('write.custom_placeholder' as MessageId)}
              placeholderTextColor={tokens.colors.mutedText}
              multiline
              style={[styles.control, styles.controlArea, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]}
            />
          </>
        ) : null}

        <View style={[styles.divider, {backgroundColor: tokens.colors.border}]} />

        <Disclosure title={t('write.support' as MessageId)}>
          {SUPPORT_KEYS.map((key: SupportKey) => (
            <View key={key} style={styles.checkRow}>
              <Switch
                accessibilityLabel={t(`write.support_${key}` as MessageId)}
                value={draft.support[key]}
                onValueChange={(value) => save({support: {...draft.support, [key]: value}})}
                trackColor={{true: tokens.colors.accent, false: tokens.colors.surfaceSunken}}
              />
              <Text style={{color: tokens.colors.text, flex: 1, minWidth: 0}}>{t(`write.support_${key}` as MessageId)}</Text>
            </View>
          ))}
          <Text style={[styles.note, {color: tokens.colors.faintText}]}>{t('write.info_support' as MessageId)}</Text>
        </Disclosure>

        <View style={styles.asideGroup}>
          <Label>{t('write.word_roles' as MessageId)}</Label>
          {WORD_ROLES.map((role) => (
            <View key={role} style={styles.legendRow}>
              <View style={[styles.legendDot, {backgroundColor: roleColor[role]}]} />
              <Text style={{color: tokens.colors.text}}>{t(`write.role_${role}` as MessageId)}</Text>
            </View>
          ))}
        </View>

        <Disclosure title={t('write.guidance_short' as MessageId)} initiallyOpen={false}>
          <Text style={[styles.note, {color: tokens.colors.mutedText}]}>{`${guidanceLabel(adaptiveMode)} · ${scaffold.title}`}</Text>
          {scaffold.items.map((item, index) => (
            <Text key={item} style={{color: tokens.colors.mutedText}}>{`${index + 1}. ${item}`}</Text>
          ))}
        </Disclosure>

        {watchlist.length > 0 ? (
          <Disclosure title={t('write.watchlist' as MessageId)} initiallyOpen={false}>
            {watchlist.map((item) => (
              <Text key={item.category} style={{color: tokens.colors.mutedText}}>
                {`${t(`category.${item.category}` as MessageId)} · ${item.total} · ${t(`write.trend_${watchlistTrend(item)}` as MessageId)}`}
              </Text>
            ))}
            <Text style={[styles.note, {color: tokens.colors.faintText}]}>{t('write.watchlist_note' as MessageId)}</Text>
          </Disclosure>
        ) : null}

        {learningLanguage === 'zh' && profile.data?.pinyin !== 'off' ? (
          <View style={styles.asideGroup}>
            <Label>{t('write.pinyin' as MessageId)}</Label>
            <PanelCopy>{t('write.pinyin_body' as MessageId)}</PanelCopy>
          </View>
        ) : null}
      </Disclosure>
    </Panel>
  );

  const reviewButton = (
    <Button label={evaluate.isPending ? t('writing.submitting' as MessageId) : t('write.review_draft' as MessageId)} onPress={submit} disabled={evaluate.isPending} />
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
        {promptCard}
        {editorCard}
        {notice ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text> : null}
        {/* orena/writing.css hides .o-write-actions on a phone and moves the
            primary action into the sticky bar below. */}
        {!compact ? (
          <View style={styles.actions}>
            <Button label={t('write.clear_draft' as MessageId)} variant="outline" onPress={clearDraft} />
            {reviewButton}
          </View>
        ) : null}
        {setupPanel}
        <Button label={t('writing.back_home' as MessageId)} variant="outline" onPress={() => router.replace('/(app)')} />
      </ScrollView>

      {compact ? (
        <View style={[styles.sticky, {borderTopColor: tokens.colors.border, backgroundColor: tokens.colors.background}]}>
          {reviewButton}
        </View>
      ) : null}

      <Modal visible={rubricOpen} animationType="slide" transparent onRequestClose={() => setRubricOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, {backgroundColor: tokens.colors.surface}]}>
            <Text accessibilityRole="header" style={[styles.modalTitle, {color: tokens.colors.heading}]}>{t('write.rubric_title' as MessageId)}</Text>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <PanelCopy>{t('write.rubric_intro' as MessageId)}</PanelCopy>
              {RUBRIC_CATEGORIES.map((key) => (
                <View key={key} style={styles.rubricRow}>
                  <View style={[styles.legendDot, {backgroundColor: tokens.colors.accent, marginTop: 7}]} />
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(`category.${key}` as MessageId)}</Text>
                    <Text style={{color: tokens.colors.mutedText}}>{t(`rubric.${key}` as MessageId)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Button label={t('write.rubric_close' as MessageId)} onPress={() => setRubricOpen(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  promptText: {fontSize: 17, lineHeight: 26, fontWeight: '600'},
  kicker: {fontSize: 13, lineHeight: 19},
  promptFoot: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10},
  input: {minHeight: 220, paddingVertical: 12, fontSize: 15, lineHeight: 24},
  editorFoot: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, paddingTop: 10, flexWrap: 'wrap'},
  editorFootRight: {flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap'},
  lookupResult: {gap: 6, paddingTop: 8},
  actions: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14},
  sticky: {borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24},
  disclosure: {gap: 10},
  disclosureToggle: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 44},
  disclosureTitle: {fontSize: 17, fontWeight: '600'},
  disclosureBody: {gap: 10},
  pillRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  pill: {paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, borderWidth: 1, minHeight: 44, justifyContent: 'center'},
  control: {borderWidth: 1, borderRadius: 15, padding: 12, minHeight: 44},
  controlArea: {minHeight: 96},
  divider: {height: 1, marginVertical: 6},
  checkRow: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44},
  note: {fontSize: 13, lineHeight: 19},
  asideGroup: {gap: 10},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 11},
  legendDot: {width: 9, height: 9, borderRadius: 999},
  modalScrim: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  modalCard: {padding: 24, gap: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%'},
  modalTitle: {fontSize: 20, fontWeight: '700'},
  modalBody: {gap: 12, paddingBottom: 8},
  rubricRow: {flexDirection: 'row', gap: 11, alignItems: 'flex-start'},
});
