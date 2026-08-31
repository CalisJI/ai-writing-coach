import {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import type {MessageId} from '../../src/i18n/messages';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useGrammarPractice} from '../../src/query/useWritingEvaluation';
import {usePracticeOutcome, useReviewCue} from '../../src/query/useReview';
import {consumeReviewHandoff} from '../../src/features/review/reviewHandoff';
import {setGrammarWritingHandoff, setRevisionWritingHandoff} from '../../src/features/writing/writingHandoff';
import {Button, Chip, IssueRow, Label, Panel, PanelCopy, PromptCard, Split} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/review.js.
 *
 * review.js (1140 lines) also has an inline linguistic-annotation lens over
 * the learner's own text (a POS toggle backed by a dedicated
 * /api/essays/{id}/linguistic-annotations call), a pinyin overlay, a
 * "compare to a stronger version" dialog (/api/improve), and a
 * downloadable feedback file. None of those are reproduced -- each is its
 * own subsystem, not a styling gap -- and are tracked as a residual in
 * MOBILE_VISUAL_PARITY_AUDIT.md. What is ported: the score summary with its
 * band label, the confidence-banded findings list (now showing the pattern
 * name and confidence chip the web shows, with the learner's fragment as a
 * quoted blockquote rather than as the row's title), strengths, the
 * revision-evidence delta (before/after score and issue counts), the
 * practice-outcome and review-cue signal cards, and the grammar-transfer /
 * revise actions.
 */

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const records = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.map(record) : []);

function categoryLabel(t: (id: MessageId) => string, category: string): string {
  const key = `category.${(category || 'expression').toLowerCase().replace(/[- ]/g, '_')}` as MessageId;
  const translated = t(key);
  return translated === key ? category.replace(/_/g, ' ') : translated;
}

function statusLabel(t: (id: MessageId) => string, status: string): string {
  const key = `status.${status.toLowerCase()}` as MessageId;
  const translated = t(key);
  return translated === key ? status : translated;
}

function scoreBand(t: (id: MessageId) => string, overall: number): string {
  if (overall >= 90) return t('review.score_excellent' as MessageId);
  if (overall >= 78) return t('review.score_strong' as MessageId);
  if (overall >= 65) return t('review.score_good' as MessageId);
  if (overall >= 50) return t('review.score_fair' as MessageId);
  return t('review.score_weak' as MessageId);
}

function confidenceBand(confidence: unknown): 'high' | 'medium' | 'low' {
  const value = typeof confidence === 'number' ? confidence : NaN;
  if (!Number.isFinite(value)) return 'medium';
  if (value >= 0.8) return 'high';
  if (value >= 0.6) return 'medium';
  return 'low';
}

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

export default function ReviewScreen() {
  const {t, locale} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter(); const [handoff] = useState(consumeReviewHandoff);
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []); const grammar = useGrammarPractice(client, sessionCookie);
  const essayId = handoff?.result.id ?? 0;
  const outcome = usePracticeOutcome(client, sessionCookie, essayId);
  const reviewCue = useReviewCue(client, sessionCookie, essayId);
  if (!handoff) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('review.no_result')}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/(app)')} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('nav.back_home' as never)}</Text></Pressable></View>;
  const {result, input} = handoff;
  const fields = record(result);
  const overall = num(result.overall);
  const delta = record(fields.delta);
  const deltaOverall = num(delta.overall);
  const deltaIssues = record(delta.issues);
  const changed = records(deltaIssues.changed).filter((item) => str(record(item.before).fragment) && str(record(item.after).fragment));
  const removed = records(deltaIssues.removed);
  const added = records(deltaIssues.new);
  const persistent = records(deltaIssues.persistent);
  const hasDelta = deltaOverall !== null && overall !== null && Boolean(delta.issues);
  const beforeCount = persistent.length + removed.length + changed.length;
  const afterCount = persistent.length + added.length + changed.length;
  const beforeScore = hasDelta ? (overall as number) - (deltaOverall as number) : null;
  const cue = reviewCue.data?.available ? reviewCue.data : null;
  const outcomeItem = outcome.data?.found ? outcome.data.outcome : null;
  const outcomeStatus = outcomeItem ? str(outcomeItem.status) : '';

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

          {outcomeItem ? (
            <Panel>
              <Label>{t(`outcome.${outcomeStatus}.kicker` as never)}</Label>
              <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(`outcome.${outcomeStatus}.title` as never)}</Text>
              <PanelCopy>{fill(t(`outcome.${outcomeStatus}.body` as never), {previous: num(outcomeItem.previous_issue_count) ?? '—', count: num(outcomeItem.issue_count) ?? 0, focus: str(outcomeItem.focus_label) || t('common.current_focus' as never)})}</PanelCopy>
            </Panel>
          ) : null}

          {cue ? (
            <Panel>
              <Label>{t('review.review_cue_kicker' as never)}</Label>
              <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(cue.state === 'recurring' ? 'review.review_cue_title_recurring' as never : 'review.review_cue_title_unresolved' as never)}</Text>
              <PanelCopy>{fill(t('review.review_cue_body' as never), {category: categoryLabel(t, cue.category ?? 'expression'), status: statusLabel(t, cue.status ?? ''), source: t(cue.source === 'error_memory' ? 'review.review_cue_source_error_memory' as never : 'review.review_cue_source_practice_outcome' as never)})}</PanelCopy>
              {cue.evidence ? <Text style={{color: tokens.colors.text, fontStyle: 'italic'}}>{`“${cue.evidence}”`}</Text> : null}
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
          body={overall !== null ? scoreBand(t, overall) : undefined}
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
            const category = typeof error.category === 'string' ? error.category : 'expression';
            const bandKey = confidenceBand(error.confidence);
            return (
              <IssueRow
                key={error.id ?? `issue-${index}`}
                index={index + 1}
                band={bandKey}
                name={categoryLabel(t, category)}
                chip={t(`review.confidence_${bandKey}` as never)}
              >
                {typeof error.fragment === 'string' && error.fragment ? <Text style={[styles.quote, {color: tokens.colors.text}]}>{`“${error.fragment}”`}</Text> : null}
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

        {hasDelta ? (
          <Panel>
            <Label>{t('review.revision_delta_title' as never)}</Label>
            <PanelCopy>{fill(t('review.revision_score_delta' as never), {before: (beforeScore as number).toFixed(1), after: (overall as number).toFixed(1), gain: `${(deltaOverall as number) > 0 ? '+' : ''}${deltaOverall}`})}</PanelCopy>
            <PanelCopy>{fill(t('review.revision_issue_delta' as never), {before: beforeCount, after: afterCount})}</PanelCopy>
            {removed.length > 0 ? (
              <View style={styles.deltaGroup}>
                <Label>{t('review.revision_resolved' as never)}</Label>
                {removed.slice(0, 3).map((item, index) => <Text key={index} style={[styles.quote, {color: tokens.colors.mutedText}]}>{`“${str(item.fragment) || str(item.quote)}”`}</Text>)}
              </View>
            ) : null}
            {added.length > 0 ? (
              <View style={styles.deltaGroup}>
                <Label>{t('review.revision_new' as never)}</Label>
                {added.slice(0, 3).map((item, index) => <Text key={index} style={[styles.quote, {color: tokens.colors.mutedText}]}>{`“${str(item.fragment) || str(item.quote)}”`}</Text>)}
              </View>
            ) : null}
          </Panel>
        ) : null}
      </Split>
    </ScrollView>
  );
}

const styles = StyleSheet.create({evidence: {fontSize: 14, lineHeight: 21}, quote: {fontSize: 14, lineHeight: 21, fontStyle: 'italic'}, suggestion: {fontSize: 14, lineHeight: 21, fontWeight: '600'}, deltaGroup: {gap: 4}, container: {flexGrow: 1, padding: 24, gap: 12, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 20, fontWeight: '700'}, heading: {fontSize: 15, fontWeight: '700'}, card: {padding: 16, borderRadius: 20, gap: 6, borderWidth: 1}, button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center'}, buttonText: {fontSize: 14, fontWeight: '700'}});
