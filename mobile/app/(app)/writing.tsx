import {useMemo, useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {MAX_CONTENT_WIDTH} from '../../src/theme/tokens';
import {useEvaluateWriting} from '../../src/query/useWritingEvaluation';
import {consumeWritingHandoff, type WritingHandoff} from '../../src/features/writing/writingHandoff';
import {setReviewHandoff} from '../../src/features/review/reviewHandoff';
import type {EvaluationInput, PracticeContext} from '../../src/api/contracts/learning';

function contextFromTask(handoff: WritingHandoff): PracticeContext | undefined {
  if (handoff.kind === 'practice') { const r = handoff.task.personalization; return {intent: r.intent, focus_category: r.focus_category, focus_label: r.focus_label, focus_family: r.focus_family, focus_status: r.focus_status, task_type: r.task_type, topic: r.topic, target_level: r.target_level, action_label: r.action_label, reason: r.reason, evidence: r.evidence, focus_instruction: r.focus_instruction}; }
  if (handoff.kind === 'grammar') return handoff.task.practice_context;
  return undefined;
}

export default function WritingScreen() {
  const {t} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter();
  const [handoff] = useState(consumeWritingHandoff); const [text, setText] = useState(handoff?.kind === 'revise' ? handoff.text : '');
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []); const evaluate = useEvaluateWriting(client, sessionCookie);
  if (!handoff) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('writing.no_task')}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/(app)')} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={styles.buttonText}>{t('writing.back_home')}</Text></Pressable></View>;
  const title = handoff.kind === 'practice' ? handoff.task.title : handoff.kind === 'grammar' ? handoff.task.title : t('writing.revise_title');
  const prompt = handoff.kind === 'practice' ? handoff.task.prompt : handoff.kind === 'grammar' ? handoff.task.prompt : handoff.prompt;
  const targetLevel = handoff.kind === 'practice' ? handoff.task.target_level : handoff.kind === 'grammar' ? handoff.task.target_level : handoff.targetLevel;
  const learningLanguage = handoff.kind === 'practice' ? handoff.task.personalization.language : handoff.kind === 'grammar' ? handoff.learningLanguage : handoff.learningLanguage;
  const submit = () => { const context = contextFromTask(handoff); const input: EvaluationInput = {prompt, text, target_cefr: targetLevel, ...(handoff.kind === 'revise' ? {parent_essay_id: handoff.essayId} : {}), ...(context ? {practice_context: context} : {}), ...(learningLanguage ? {learning_language: learningLanguage} : {})}; evaluate.mutate(input, {onSuccess: (result) => { setReviewHandoff(result, input); router.push('/(app)/review'); }}); };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}><ScrollView contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{title}</Text><Text style={[styles.prompt, {color: tokens.colors.mutedText}]}>{prompt}</Text><TextInput accessibilityLabel={t('writing.response_label')} multiline value={text} onChangeText={setText} placeholder={t('writing.response_placeholder')} placeholderTextColor={tokens.colors.mutedText} style={[styles.input, {color: tokens.colors.text, borderColor: tokens.colors.mutedText, backgroundColor: tokens.colors.surface}]} textAlignVertical="top" />{evaluate.isError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('writing.submit_failed')}</Text>}<Pressable accessibilityRole="button" disabled={evaluate.isPending || text.trim().length < 10} onPress={submit} style={[styles.button, {backgroundColor: tokens.colors.accent, opacity: evaluate.isPending || text.trim().length < 10 ? 0.6 : 1}]}><Text style={styles.buttonText}>{evaluate.isPending ? t('writing.submitting') : t('writing.submit')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.replace('/(app)')}><Text style={{color: tokens.colors.accent}}>{t('writing.back_home')}</Text></Pressable></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({container: {flexGrow: 1, padding: 24, gap: 12, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center'}, title: {fontSize: 28, fontWeight: '700'}, prompt: {fontSize: 16, lineHeight: 24}, input: {minHeight: 220, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 17}, button: {padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8}, buttonText: {color: '#fff', fontWeight: '700'}});
