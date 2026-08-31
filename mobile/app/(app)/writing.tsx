import {useMemo, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useEvaluateWriting} from '../../src/query/useWritingEvaluation';
import {consumeWritingHandoff, type WritingHandoff} from '../../src/features/writing/writingHandoff';
import {setReviewHandoff} from '../../src/features/review/reviewHandoff';
import type {EvaluationInput, PracticeContext} from '../../src/api/contracts/learning';
import {Button, Chip, EditorCard, Label, Metric, Panel, PromptCard, Split} from '../../src/components/orena';

function contextFromTask(handoff: WritingHandoff): PracticeContext | undefined {
  if (handoff.kind === 'practice') { const r = handoff.task.personalization; return {intent: r.intent, focus_category: r.focus_category, focus_label: r.focus_label, focus_family: r.focus_family, focus_status: r.focus_status, task_type: r.task_type, topic: r.topic, target_level: r.target_level, action_label: r.action_label, reason: r.reason, evidence: r.evidence, focus_instruction: r.focus_instruction}; }
  if (handoff.kind === 'grammar') return handoff.task.practice_context;
  return undefined;
}

export default function WritingScreen() {
  const {t} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter();
  const [handoff] = useState(consumeWritingHandoff); const [text, setText] = useState(handoff?.kind === 'revise' ? handoff.text : '');
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []); const evaluate = useEvaluateWriting(client, sessionCookie);
  if (!handoff) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('writing.no_task')}</Text><Button label={t('writing.back_home')} onPress={() => router.replace('/(app)')} /></View>;
  const title = handoff.kind === 'practice' ? handoff.task.title : handoff.kind === 'grammar' ? handoff.task.title : t('writing.revise_title');
  const prompt = handoff.kind === 'practice' ? handoff.task.prompt : handoff.kind === 'grammar' ? handoff.task.prompt : handoff.prompt;
  const targetLevel = handoff.kind === 'practice' ? handoff.task.target_level : handoff.kind === 'grammar' ? handoff.task.target_level : handoff.targetLevel;
  const learningLanguage = handoff.kind === 'practice' ? handoff.task.personalization.language : handoff.kind === 'grammar' ? handoff.learningLanguage : handoff.learningLanguage;
  const submit = () => { const context = contextFromTask(handoff); const input: EvaluationInput = {prompt, text, target_cefr: targetLevel, ...(handoff.kind === 'revise' ? {parent_essay_id: handoff.essayId} : {}), ...(context ? {practice_context: context} : {}), ...(learningLanguage ? {learning_language: learningLanguage} : {})}; evaluate.mutate(input, {onSuccess: (result) => { setReviewHandoff(result, input); router.push('/(app)/review'); }}); };
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ready = text.trim().length >= 10;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Split aside={
          <Panel>
            <Label>{t('writing.brief_detail' as never)}</Label>
            <View style={styles.asideRows}>
              <Metric label={t('home.target')} value={targetLevel} />
              {handoff.kind === 'practice' ? <Metric label={t('home.focus')} value={handoff.task.personalization.focus_label} /> : null}
            </View>
            {handoff.kind === 'practice' && handoff.task.checklist.length > 0 ? (
              <View style={styles.checklist}>
                {handoff.task.checklist.map((item) => (
                  <Text key={item} style={[styles.checkItem, {color: tokens.colors.mutedText}]}>{`• ${item}`}</Text>
                ))}
              </View>
            ) : null}
            <Button label={t('writing.back_home')} onPress={() => router.replace('/(app)')} variant="outline" compact />
          </Panel>
        }>
          <PromptCard
            label={handoff.kind === 'revise' ? t('writing.revise_title') : t('writing.practice_source')}
            title={title}
            body={prompt}
            actions={<Chip>{`${targetLevel}`}</Chip>}
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

const styles = StyleSheet.create({asideRows: {flexDirection: 'row', flexWrap: 'wrap', gap: 16}, checklist: {gap: 6}, checkItem: {fontSize: 14, lineHeight: 21}, footText: {fontSize: 14}, container: {flexGrow: 1, padding: 24, gap: 12, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 20, fontWeight: '700'}, prompt: {fontSize: 15, lineHeight: 24}, input: {minHeight: 260, padding: 20, fontSize: 15, lineHeight: 24}, button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 8}, buttonText: {fontSize: 14, fontWeight: '700'}});
