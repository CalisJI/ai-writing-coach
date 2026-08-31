import {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useGrammarPractice} from '../../src/query/useWritingEvaluation';
import {consumeReviewHandoff} from '../../src/features/review/reviewHandoff';
import {setGrammarWritingHandoff, setRevisionWritingHandoff} from '../../src/features/writing/writingHandoff';
import {Button, Chip, IssueRow, Label, Panel, PanelCopy, PromptCard, Split} from '../../src/components/orena';

export default function ReviewScreen() {
  const {t, locale} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter(); const [handoff] = useState(consumeReviewHandoff);
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []); const grammar = useGrammarPractice(client, sessionCookie);
  if (!handoff) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('review.no_result')}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/(app)')} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('nav.back_home' as never)}</Text></Pressable></View>;
  const {result, input} = handoff;
  const band = (confidence: unknown): 'high' | 'medium' | 'low' => {
    const value = typeof confidence === 'number' ? confidence : 0;
    return value >= 0.85 ? 'high' : value >= 0.6 ? 'medium' : 'low';
  };
  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Split aside={
        <>
          {result.grammar_links.length > 0 ? (
            <Panel>
              <Label>{t('review.grammar')}</Label>
              {result.grammar_links.map((link) => (
                <Button
                  key={link.grammar_id}
                  label={link.title ?? link.grammar_id}
                  variant="outline"
                  compact
                  disabled={grammar.isPending}
                  onPress={() => grammar.mutate({grammarId: link.grammar_id, evidence: link.evidence}, {onSuccess: (task) => { setGrammarWritingHandoff(task, input.learning_language ?? 'en'); router.push('/(app)/writing'); }})}
                />
              ))}
              {grammar.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('review.practice_failed')}</Text> : null}
            </Panel>
          ) : null}
          <Panel>
            <Label>{t('review.revise')}</Label>
            <Button
              label={t('review.revise')}
              onPress={() => { setRevisionWritingHandoff(result.id, input.text, input.prompt, input.target_cefr, input.learning_language ?? 'en'); router.push('/(app)/writing'); }}
            />
          </Panel>
        </>
      }>
        <PromptCard
          label={t('review.summary')}
          title={result.summary_vi}
          actions={<>
            <Chip>{result.app_cefr}</Chip>
            <Chip>{String(result.overall)}</Chip>
          </>}
        />
        <Panel>
          <Label>{`${t('review.issues' as never)} (${result.errors.length})`}</Label>
          {result.errors.length === 0 ? (
            <PanelCopy>{t('review.no_issues' as never)}</PanelCopy>
          ) : result.errors.map((error, index) => {
            const explanation = locale === 'zh' ? (error.explanation_zh ?? error.explanation_vi ?? error.explanation) : (error.explanation_en ?? error.explanation_vi ?? error.explanation);
            const rule = locale === 'zh' ? (error.mini_rule_zh ?? error.mini_rule_vi ?? '') : (error.mini_rule_en ?? error.mini_rule_vi ?? '');
            return (
              <IssueRow
                key={error.id ?? `issue-${index}`}
                index={index + 1}
                band={band(error.confidence)}
                name={typeof error.fragment === 'string' ? error.fragment : ''}
                chip={typeof error.category === 'string' ? error.category : undefined}
              >
                {explanation ? <Text style={[styles.evidence, {color: tokens.colors.mutedText}]}>{explanation}</Text> : null}
                {rule ? <Text style={[styles.evidence, {color: tokens.colors.mutedText}]}>{rule}</Text> : null}
                {typeof error.suggestion === 'string' && error.suggestion ? (
                  <Text style={[styles.suggestion, {color: tokens.colors.positive}]}>{error.suggestion}</Text>
                ) : null}
              </IssueRow>
            );
          })}
        </Panel>
        {result.strengths_vi.length > 0 ? (
          <Panel>
            <Label>{t('review.strengths' as never)}</Label>
            {result.strengths_vi.map((item) => <PanelCopy key={item}>{item}</PanelCopy>)}
          </Panel>
        ) : null}
      </Split>
    </ScrollView>
  );
}

const styles = StyleSheet.create({evidence: {fontSize: 14, lineHeight: 21}, suggestion: {fontSize: 14, lineHeight: 21, fontWeight: '600'}, container: {flexGrow: 1, padding: 24, gap: 12, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 20, fontWeight: '700'}, heading: {fontSize: 15, fontWeight: '700'}, card: {padding: 16, borderRadius: 20, gap: 6, borderWidth: 1}, button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center'}, buttonText: {fontSize: 14, fontWeight: '700'}});
