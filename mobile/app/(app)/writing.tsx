import {useMemo, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useEvaluateWriting, useGenerateTask} from '../../src/query/useWritingEvaluation';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {consumeWritingHandoff, type WritingHandoff} from '../../src/features/writing/writingHandoff';
import {setReviewHandoff} from '../../src/features/review/reviewHandoff';
import type {EvaluationInput, PracticeContext} from '../../src/api/contracts/learning';
import {Button, Chip, EditorCard, Label, Metric, Panel, PromptCard, Split} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/write.js and language.js's per-language
 * config. The web editor is contenteditable with a bold/italic/underline/list
 * toolbar; RN's TextInput has no inline rich-text surface without a heavy
 * third-party editor, so that toolbar, the word-role legend, the guidance
 * scaffold disclosure, the error watchlist, and the audience field are not
 * reproduced here -- residual, not claimed as done. What was a real
 * functional gap rather than a styling one: native could only reach this
 * screen via a handoff (Home's recommendation, a Grammar practice link, or
 * Revise), with no way to start a self-directed session the way the web's
 * mode/level/topic/length setup panel lets a learner do directly. That is
 * added below via the same POST /api/tasks/generate the web calls.
 */

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

type LocalTask = {title: string; prompt: string; checklist: string[]; targetLevel: string};

function contextFromTask(handoff: WritingHandoff): PracticeContext | undefined {
  if (handoff.kind === 'practice') { const r = handoff.task.personalization; return {intent: r.intent, focus_category: r.focus_category, focus_label: r.focus_label, focus_family: r.focus_family, focus_status: r.focus_status, task_type: r.task_type, topic: r.topic, target_level: r.target_level, action_label: r.action_label, reason: r.reason, evidence: r.evidence, focus_instruction: r.focus_instruction}; }
  if (handoff.kind === 'grammar') return handoff.task.practice_context;
  return undefined;
}

export default function WritingScreen() {
  const {t} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter();
  const [handoff] = useState(consumeWritingHandoff); const [text, setText] = useState(handoff?.kind === 'revise' ? handoff.text : '');
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []); const evaluate = useEvaluateWriting(client, sessionCookie);
  const profile = useLearnerProfile(client, sessionCookie, !handoff);
  const learningLanguageFallback: 'en' | 'zh' = profile.data?.language ?? 'en';
  const generate = useGenerateTask(client, sessionCookie);
  const [localTask, setLocalTask] = useState<LocalTask | null>(null);
  const [mode, setMode] = useState('opinion');
  const [level, setLevel] = useState('');
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  if (!handoff && !localTask) {
    const activeLevel = level || DEFAULT_LEVEL[learningLanguageFallback];
    const lengths = LENGTHS_BY_LANGUAGE[learningLanguageFallback];
    const activeLength = length ?? lengths[0]!;
    const modeKeys = MODE_KEYS_BY_LANGUAGE[learningLanguageFallback];
    const startFree = () => setLocalTask({title: t('writing.mode_free' as never), prompt: t('writing.free_context' as never), checklist: [], targetLevel: activeLevel});
    const startCustom = () => { const value = customPrompt.trim(); if (!value) return; setLocalTask({title: t('writing.mode_custom' as never), prompt: value, checklist: [], targetLevel: activeLevel}); };
    const startGenerated = () => {
      generate.mutate(
        {task_type: mode as 'opinion' | 'email' | 'review' | 'story' | 'toeic' | 'hsk', topic: topic.trim() || 'random', target_cefr: activeLevel, word_target: activeLength},
        {onSuccess: (task) => setLocalTask({title: task.title, prompt: task.prompt, checklist: task.checklist, targetLevel: task.target_level})},
      );
    };
    return (
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Panel>
          <Label>{t('writing.setup_panel' as never)}</Label>

          <Label>{t('writing.mode' as never)}</Label>
          <View style={styles.pillRow}>
            {modeKeys.map((key) => (
              <Pressable key={key} accessibilityRole="radio" accessibilityState={{selected: mode === key}} onPress={() => setMode(key)} style={[styles.pill, {borderColor: mode === key ? tokens.colors.accent : tokens.colors.border, backgroundColor: mode === key ? tokens.colors.surfaceSunken : 'transparent'}]}>
                <Text style={{color: tokens.colors.text, fontWeight: mode === key ? '700' : '400'}}>{t(`writing.mode_${key}` as never)}</Text>
              </Pressable>
            ))}
          </View>

          {mode === 'custom' ? (
            <>
              <Label>{t('writing.custom_prompt' as never)}</Label>
              <TextInput
                accessibilityLabel={t('writing.custom_prompt' as never)}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                placeholder={t('writing.custom_placeholder' as never)}
                placeholderTextColor={tokens.colors.mutedText}
                multiline
                style={[styles.customInput, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]}
              />
            </>
          ) : mode !== 'free' ? (
            <>
              <Label>{t('writing.level' as never)}</Label>
              <View style={styles.pillRow}>
                {LEVELS_BY_LANGUAGE[learningLanguageFallback].map((value) => (
                  <Pressable key={value} accessibilityRole="radio" accessibilityState={{selected: activeLevel === value}} onPress={() => setLevel(value)} style={[styles.pill, {borderColor: activeLevel === value ? tokens.colors.accent : tokens.colors.border, backgroundColor: activeLevel === value ? tokens.colors.surfaceSunken : 'transparent'}]}>
                    <Text style={{color: tokens.colors.text, fontWeight: activeLevel === value ? '700' : '400'}}>{value}</Text>
                  </Pressable>
                ))}
              </View>

              <Label>{t('writing.topic' as never)}</Label>
              <TextInput
                accessibilityLabel={t('writing.topic' as never)}
                value={topic}
                onChangeText={setTopic}
                placeholder={t('writing.topic_placeholder' as never)}
                placeholderTextColor={tokens.colors.mutedText}
                style={[styles.customInput, styles.topicInput, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong, backgroundColor: tokens.colors.surfaceSunken}]}
              />

              <Label>{t('writing.length_target' as never)}</Label>
              <View style={styles.pillRow}>
                {lengths.map((value) => (
                  <Pressable key={value} accessibilityRole="radio" accessibilityState={{selected: activeLength === value}} onPress={() => setLength(value)} style={[styles.pill, {borderColor: activeLength === value ? tokens.colors.accent : tokens.colors.border, backgroundColor: activeLength === value ? tokens.colors.surfaceSunken : 'transparent'}]}>
                    <Text style={{color: tokens.colors.text, fontWeight: activeLength === value ? '700' : '400'}}>{`~${value}`}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {generate.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('writing.create_failed' as never)}</Text> : null}
          <Button
            label={generate.isPending ? t('writing.creating' as never) : t('writing.create' as never)}
            disabled={generate.isPending || (mode === 'custom' && !customPrompt.trim())}
            onPress={() => { if (mode === 'free') startFree(); else if (mode === 'custom') startCustom(); else startGenerated(); }}
          />
        </Panel>
        <Button label={t('writing.back_home')} onPress={() => router.replace('/(app)')} variant="outline" />
      </ScrollView>
    );
  }

  const active: {title: string; prompt: string; targetLevel: string; learningLanguage: 'en' | 'zh'; checklist: string[]; label: string} = handoff
    ? {
        title: handoff.kind === 'practice' ? handoff.task.title : handoff.kind === 'grammar' ? handoff.task.title : t('writing.revise_title'),
        prompt: handoff.kind === 'practice' ? handoff.task.prompt : handoff.kind === 'grammar' ? handoff.task.prompt : handoff.prompt,
        targetLevel: handoff.kind === 'practice' ? handoff.task.target_level : handoff.kind === 'grammar' ? handoff.task.target_level : handoff.targetLevel,
        learningLanguage: handoff.kind === 'practice' ? handoff.task.personalization.language : handoff.kind === 'grammar' ? handoff.learningLanguage : handoff.learningLanguage,
        checklist: handoff.kind === 'practice' ? handoff.task.checklist : [],
        label: handoff.kind === 'revise' ? t('writing.revise_title') : t('writing.practice_source'),
      }
    : {title: localTask!.title, prompt: localTask!.prompt, targetLevel: localTask!.targetLevel, learningLanguage: learningLanguageFallback, checklist: localTask!.checklist, label: t('writing.setup_panel' as never)};

  const submit = () => {
    const context = handoff ? contextFromTask(handoff) : undefined;
    const input: EvaluationInput = {prompt: active.prompt, text, target_cefr: active.targetLevel, ...(handoff?.kind === 'revise' ? {parent_essay_id: handoff.essayId} : {}), ...(context ? {practice_context: context} : {}), learning_language: active.learningLanguage};
    evaluate.mutate(input, {onSuccess: (result) => { setReviewHandoff(result, input); router.push('/(app)/review'); }});
  };
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ready = text.trim().length >= 10;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Split aside={
          <Panel>
            <Label>{t('writing.brief_detail' as never)}</Label>
            <View style={styles.asideRows}>
              <Metric label={t('home.target')} value={active.targetLevel} />
              {handoff?.kind === 'practice' ? <Metric label={t('home.focus')} value={handoff.task.personalization.focus_label} /> : null}
            </View>
            {active.checklist.length > 0 ? (
              <View style={styles.checklist}>
                {active.checklist.map((item) => (
                  <Text key={item} style={[styles.checkItem, {color: tokens.colors.mutedText}]}>{`• ${item}`}</Text>
                ))}
              </View>
            ) : null}
            <Button label={t('writing.back_home')} onPress={() => router.replace('/(app)')} variant="outline" compact />
          </Panel>
        }>
          <PromptCard
            label={active.label}
            title={active.title}
            body={active.prompt}
            actions={<Chip>{`${active.targetLevel}`}</Chip>}
          />
          <EditorCard
            foot={<>
              <Text style={[styles.footText, {color: tokens.colors.mutedText}]}>{`${words} ${t('writing.words' as never)}`}</Text>
              <Button
                label={evaluate.isPending ? t('writing.submitting') : t('writing.submit')}
                onPress={submit}
                disabled={evaluate.isPending || !ready}
              />
            </>}
          >
            <TextInput
              accessibilityLabel={t('writing.response_label')}
              multiline
              value={text}
              onChangeText={setText}
              placeholder={t('writing.response_placeholder')}
              placeholderTextColor={tokens.colors.faintText}
              style={[styles.input, {color: tokens.colors.text}]}
              textAlignVertical="top"
            />
          </EditorCard>
          {evaluate.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('writing.submit_failed')}</Text> : null}
        </Split>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({asideRows: {flexDirection: 'row', flexWrap: 'wrap', gap: 16}, checklist: {gap: 6}, checkItem: {fontSize: 14, lineHeight: 21}, footText: {fontSize: 14}, container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 20, fontWeight: '700'}, prompt: {fontSize: 15, lineHeight: 24}, input: {minHeight: 260, padding: 20, fontSize: 15, lineHeight: 24}, button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 8}, buttonText: {fontSize: 14, fontWeight: '700'}, pillRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, pill: {paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, borderWidth: 1}, customInput: {borderWidth: 1, borderRadius: 15, padding: 12, minHeight: 96}, topicInput: {minHeight: 48}});
