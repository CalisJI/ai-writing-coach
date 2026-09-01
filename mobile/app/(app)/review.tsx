import {useMemo, useState} from 'react';
import {LayoutAnimation, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, UIManager, View, useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import type {MessageId} from '../../src/i18n/messages';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useGrammarPractice} from '../../src/query/useWritingEvaluation';
import {useImproveWriting, useLinguisticAnnotations, usePracticeOutcome, useReviewCue} from '../../src/query/useReview';
import {useContextualDictionary, useSaveLibraryVocabulary} from '../../src/query/useReadingLibrary';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {consumeReviewHandoff} from '../../src/features/review/reviewHandoff';
import {setGrammarWritingHandoff, setRevisionWritingHandoff} from '../../src/features/writing/writingHandoff';
import {
  benchmarkLabel, categoryReason, categoryRule, changedSegments, confidenceBand,
  findEvidenceRanges, learnerTextSpans, metricsFrom, normalizedEvidenceItems,
  normalizedPosAnnotations, scoreBandKey, sentenceContext, weakestMetric,
  type EvidenceItem, type PosAnnotation, type PosGroup,
} from '../../src/features/review/reviewDomain';
import {countUnits, guidanceMode, RUBRIC_CATEGORIES} from '../../src/features/writing/writingDomain';
import {feedbackBudget} from '../../src/features/review/reviewDomain';
import {Button, Chip, Label, Panel, PanelCopy} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/review.js, on the web's own phone
 * breakpoint: one column, the document card first, then the evidence panels
 * that were the desktop aside.
 *
 * The screen's claim is that every judgement quotes the learner's own text, so
 * the learner's draft is on the page (Draft / Review tabs), the evidence is
 * marked inside it, and the panels quote the same characters.
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

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** review.js's o-issue / o-strength rows: compact at rest, evidence when opened. */
function EvidenceRow({index, band, name, chip, children}: {
  index?: number; band?: 'high' | 'medium' | 'low'; name: string; chip?: string; children: React.ReactNode;
}) {
  const {tokens} = useTheme();
  const [open, setOpen] = useState(false);
  const bandColor = band === 'high' ? tokens.colors.danger : band === 'low' ? tokens.colors.mutedText : tokens.colors.attention;
  return (
    <View style={[styles.evidenceRow, {borderColor: tokens.colors.border}]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        accessibilityLabel={name}
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen((value) => !value); }}
        style={styles.evidenceHead}
      >
        {index === undefined
          ? <Text style={[styles.tick, {color: tokens.colors.positive}]}>✓</Text>
          : <Text style={[styles.mark, {color: tokens.colors.onAccent, backgroundColor: bandColor}]}>{index}</Text>}
        <Text style={[styles.evidenceName, {color: tokens.colors.heading}]}>{name}</Text>
        {chip ? <Chip>{chip}</Chip> : null}
        <Text style={{color: tokens.colors.mutedText}}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>
      {open ? <View style={styles.evidenceBody}>{children}</View> : null}
    </View>
  );
}

const POS_GROUPS: readonly PosGroup[] = ['noun', 'verb', 'modifier', 'connector', 'reference', 'number'];

export default function ReviewScreen() {
  const {t, locale} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession(); const router = useRouter();
  const {width} = useWindowDimensions();
  const compact = width < 1024;
  const [handoff] = useState(consumeReviewHandoff);
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const grammar = useGrammarPractice(client, sessionCookie);
  const essayId = handoff?.result.id ?? 0;
  const outcome = usePracticeOutcome(client, sessionCookie, essayId);
  const reviewCue = useReviewCue(client, sessionCookie, essayId);
  const profile = useLearnerProfile(client, sessionCookie, Boolean(sessionCookie));
  const dictionary = useContextualDictionary(client, sessionCookie);
  const saveWord = useSaveLibraryVocabulary(client, sessionCookie);
  const improve = useImproveWriting(client, sessionCookie);
  const annotations = useLinguisticAnnotations(client, sessionCookie);

  const [tab, setTab] = useState<'review' | 'draft'>('review');
  const [lensOn, setLensOn] = useState(false);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<string[]>([]);

  if (!handoff) {
    return (
      <View style={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <PanelCopy>{t('review.empty_body' as MessageId)}</PanelCopy>
        <Button label={t('review.go_write' as MessageId)} onPress={() => router.replace('/(app)/writing')} />
      </View>
    );
  }

  const {result, input} = handoff;
  const learningLanguage: 'en' | 'zh' = input.learning_language ?? 'en';
  const learnerText = input.text || '';
  const fields = record(result);
  const overall = num(result.overall);
  const level = input.target_cefr || '';

  /* adaptive.js decides how much evidence this learner sees at once; review.js
     reads the same budget before it renders any of it. */
  const budget = feedbackBudget(guidanceMode(profile.data?.style, learningLanguage, level));
  const errors = normalizedEvidenceItems(result.errors);
  const strengthEvidence = normalizedEvidenceItems(result.strength_evidence);
  const visibleErrors = errors.slice(0, budget.visibleEvidence);
  const visibleStrengths = strengthEvidence.slice(0, 3);
  const units = countUnits(learnerText, learningLanguage);

  const posItems: PosAnnotation[] = lensOn && annotations.data?.found
    ? normalizedPosAnnotations(learnerText, annotations.data.annotations)
    : [];
  const spans = learnerTextSpans(learnerText, findEvidenceRanges(learnerText, visibleErrors, visibleStrengths), posItems);

  const focusMetric = weakestMetric(metricsFrom(fields));
  const benchmark = benchmarkLabel(fields);
  const scoreKey = scoreBandKey(result.overall);
  const summaryText = focusMetric && strengthEvidence[0]
    ? fill(t('review.summary_focus' as MessageId), {
        strong: categoryLabel(t, strengthEvidence[0].category ?? 'strength'),
        focus: categoryLabel(t, focusMetric.key),
      })
    : t('review.summary_plain' as MessageId);

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
  const isFallback = str(fields.evaluator).trim().toLowerCase() === 'fallback-demo';

  const beginRevision = () => {
    setRevisionWritingHandoff(result.id, learnerText, input.prompt, input.target_cefr, learningLanguage);
    router.push('/(app)/writing');
  };

  const lookUp = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setNotice(null);
    dictionary.mutate({text: value.slice(0, 180), source_language: learningLanguage, target_language: locale, context: learnerText.slice(0, 2400) || value});
  };

  const saveToLibrary = (word: string, item: EvidenceItem, kind: 'feedback' | 'strength') => {
    const value = word.trim().slice(0, 180);
    if (!value) return;
    const explanation = locale === 'zh' ? (item.explanation_zh ?? item.explanation_vi ?? '') : (item.explanation_en ?? item.explanation_vi ?? '');
    saveWord.mutate(
      {word: value, definition: explanation || categoryReason(item.category, locale === 'zh' ? 'zh' : 'en'), source_essay_id: result.id, source_fragment: item.fragment ?? '', source_kind: kind, focus_note: explanation},
      {onSuccess: () => setSavedWords((current) => [...current, value]), onError: () => setNotice(t('review.save_failed' as MessageId))},
    );
  };

  const toggleLens = () => {
    if (lensOn) { setLensOn(false); return; }
    setLensOn(true);
    if (!annotations.data && essayId) annotations.mutate(essayId, {onError: () => { setLensOn(false); setNotice(t('review.pos_unavailable' as MessageId)); }});
  };

  /* The feedback the learner can keep. Built from the same evidence shown on
     screen, so the shared text and the page never disagree. The web writes a
     .txt download; native hands the same content to the share sheet. */
  const shareFeedback = () => {
    const lines = [
      `${t('review.summary_title' as MessageId)}: ${result.overall} ${scoreKey ? t(scoreKey as MessageId) : ''}`.trim(),
      '',
      input.prompt ? `${t('write.prompt' as MessageId)}: ${input.prompt}` : '',
      '',
      learnerText,
      '',
      `${t('review.priority_issues' as MessageId)}:`,
      ...visibleErrors.map((item, index) => {
        const band = confidenceBand(item);
        return `  ${index + 1}. ${categoryLabel(t, item.category ?? 'expression')} [${t(`review.confidence_${band}` as MessageId)}]\n     “${item.fragment ?? ''}”\n     ${item.suggestion ? `→ ${item.suggestion}` : ''}\n     ${categoryReason(item.category, locale === 'zh' ? 'zh' : 'en')}`;
      }),
      '',
      `${t('review.strengths_title' as MessageId)}:`,
      ...visibleStrengths.map((item) => `  · ${categoryLabel(t, item.category ?? 'strength')} — “${item.fragment ?? ''}”`),
    ];
    void Share.share({message: lines.join('\n'), title: `${t('review.download_name' as MessageId)}-${result.id}`})
      .catch(() => setNotice(t('review.share_failed' as MessageId)));
  };

  const comparePolished = () => {
    setNotice(null);
    setCompareOpen(true);
    improve.mutate({text: learnerText, target_cefr: input.target_cefr, mode: 'polish'}, {onError: () => { setCompareOpen(false); setNotice(t('review.compare_failed' as MessageId)); }});
  };

  const posColor: Record<PosGroup, string> = {
    noun: tokens.colors.roleNoun, verb: tokens.colors.roleVerb, modifier: tokens.colors.roleAdjective,
    connector: tokens.colors.roleAdverb, reference: tokens.colors.informational, number: tokens.colors.attention,
    other: tokens.colors.text,
  };

  const diffFor = (item: EvidenceItem) => {
    const before = item.fragment || sentenceContext(learnerText, item.fragment ?? '');
    if (!before || !item.suggestion) return null;
    return changedSegments(before, item.suggestion, learningLanguage);
  };

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      {/* Prompt block */}
      <Panel>
        <Label>{t('write.prompt' as MessageId)}</Label>
        <Text style={[styles.promptText, {color: tokens.colors.heading}]}>{input.prompt || t('write.no_prompt' as MessageId)}</Text>
        <View style={styles.row}>
          {level ? <Chip>{level}</Chip> : null}
          <Button label={t('write.view_rubric' as MessageId)} variant="outline" compact onPress={() => setRubricOpen(true)} />
        </View>
      </Panel>

      {isFallback ? (
        <Panel>
          <Text accessibilityRole="alert" style={{color: tokens.colors.attention}}>{t('review.fallback_notice' as MessageId)}</Text>
        </Panel>
      ) : null}

      {/* Document card: the learner's own text, with the evidence marked in it. */}
      <Panel>
        <View accessibilityRole="tablist" style={styles.tabRow}>
          <Pressable accessibilityRole="tab" accessibilityLabel={t('review.tab_draft' as MessageId)} accessibilityState={{selected: tab === 'draft'}} onPress={() => setTab('draft')} style={[styles.tab, tab === 'draft' && {borderColor: tokens.colors.accent, backgroundColor: tokens.colors.surfaceSunken}]}>
            <Text style={{color: tokens.colors.text, fontWeight: tab === 'draft' ? '700' : '400'}}>{t('review.tab_draft' as MessageId)}</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityLabel={t('review.tab_review' as MessageId)} accessibilityState={{selected: tab === 'review'}} onPress={() => setTab('review')} style={[styles.tab, tab === 'review' && {borderColor: tokens.colors.accent, backgroundColor: tokens.colors.surfaceSunken}]}>
            <Text style={{color: tokens.colors.text, fontWeight: tab === 'review' ? '700' : '400'}}>{t('review.tab_review' as MessageId)}</Text>
          </Pressable>
          <Text style={{color: tokens.colors.mutedText}}>{`${units} ${t('writing.words' as MessageId)}`}</Text>
          <Button label={t('review.edit_draft' as MessageId)} variant="outline" compact onPress={beginRevision} />
        </View>

        <Text style={[styles.docBody, {color: tokens.colors.text}]}>
          {tab === 'draft'
            ? learnerText
            : spans.map((span, index) => (
                <Text
                  key={index}
                  style={[
                    span.evidence === 'error' ? {backgroundColor: tokens.colors.dangerSurface, color: tokens.colors.danger} : null,
                    span.evidence === 'strength' ? {color: tokens.colors.positive} : null,
                    span.group ? {color: posColor[span.group]} : null,
                  ]}
                >
                  {span.text}
                </Text>
              ))}
        </Text>

        {/* Word-role lens */}
        <View style={[styles.lens, {borderColor: tokens.colors.border}]}>
          <View style={{flex: 1, minWidth: 0}}>
            <Label>{t('review.pos_kicker' as MessageId)}</Label>
            <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t('review.pos_title' as MessageId)}</Text>
            <Text accessibilityLiveRegion="polite" style={{color: tokens.colors.mutedText}}>
              {annotations.isPending ? t('review.pos_loading' as MessageId) : lensOn ? t('review.pos_on' as MessageId) : t('review.pos_off' as MessageId)}
            </Text>
            {lensOn && posItems.length > 0 ? (
              <View style={styles.legendRow}>
                {POS_GROUPS.map((group) => (
                  <View key={group} style={styles.legendItem}>
                    <View style={[styles.legendDot, {backgroundColor: posColor[group]}]} />
                    <Text style={{color: tokens.colors.mutedText}}>{t(`review.pos_group_${group}` as MessageId)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          <Button
            label={lensOn ? t('review.pos_hide' as MessageId) : t('review.pos_show' as MessageId)}
            variant="outline"
            compact
            disabled={annotations.isPending}
            onPress={toggleLens}
          />
        </View>

        {learningLanguage === 'zh' && profile.data?.pinyin !== 'off' ? (
          <View style={styles.group}>
            <Label>{t('review.pinyin_title' as MessageId)}</Label>
            <PanelCopy>{t('review.pinyin_desc' as MessageId)}</PanelCopy>
          </View>
        ) : null}

        <View style={compact ? styles.docFootCompact : styles.docFoot}>
          <Button label={t('review.download_feedback' as MessageId)} variant="outline" onPress={shareFeedback} />
          <Button label={t('review.revise_title' as MessageId)} onPress={beginRevision} />
        </View>
      </Panel>

      {notice ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text> : null}

      {/* Summary */}
      <Panel>
        <Label>{t('review.summary_title' as MessageId)}</Label>
        <Text style={[styles.score, {color: tokens.colors.heading}]}>{overall !== null ? String(result.overall) : '—'}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{[scoreKey ? t(scoreKey as MessageId) : '', benchmark].filter(Boolean).join(' · ')}</Text>
        <PanelCopy>{summaryText}</PanelCopy>
        <Button label={t('review.view_full_rubric' as MessageId)} variant="outline" compact onPress={() => setRubricOpen(true)} />
      </Panel>

      {/* Priority issues */}
      <Panel>
        <Label>{t('review.priority_issues' as MessageId)}</Label>
        <PanelCopy>{t('review.priority_help' as MessageId)}</PanelCopy>
        {visibleErrors.length === 0 ? <PanelCopy>{t('review.no_issues' as MessageId)}</PanelCopy> : visibleErrors.map((item, index) => {
          const band = confidenceBand(item);
          const diff = diffFor(item);
          const canSave = Boolean(item.suggestion && item.suggestion.trim().length <= 180);
          const saved = savedWords.includes((item.suggestion ?? '').trim().slice(0, 180));
          return (
            <EvidenceRow key={`error-${index}`} index={index + 1} band={band} name={categoryLabel(t, item.category ?? 'expression')} chip={t(`review.confidence_${band}` as MessageId)}>
              <Text style={[styles.quote, {color: tokens.colors.text}]}>{`“${item.fragment || sentenceContext(learnerText, item.fragment ?? '') || t('review.evidence_unavailable' as MessageId)}”`}</Text>
              {diff ? (
                <View style={styles.diff}>
                  <View style={{flex: 1, minWidth: 0}}>
                    <Label>{t('common.before' as MessageId)}</Label>
                    <Text style={{color: tokens.colors.mutedText}}>
                      {diff.beforePrefix}<Text style={{color: tokens.colors.danger, textDecorationLine: 'line-through'}}>{diff.beforeChange}</Text>{diff.beforeSuffix}
                    </Text>
                  </View>
                  <View style={{flex: 1, minWidth: 0}}>
                    <Label>{t('common.better' as MessageId)}</Label>
                    <Text style={{color: tokens.colors.mutedText}}>
                      {diff.afterPrefix}<Text style={{color: tokens.colors.positive, fontWeight: '700'}}>{diff.afterChange}</Text>{diff.afterSuffix}
                    </Text>
                  </View>
                </View>
              ) : null}
              <Text style={[styles.evidenceCopy, {color: tokens.colors.mutedText}]}>{categoryReason(item.category, locale === 'zh' ? 'zh' : 'en')}</Text>
              {budget.showRule ? <Text style={[styles.evidenceCopy, {color: tokens.colors.mutedText}]}>{categoryRule(item.category, locale === 'zh' ? 'zh' : 'en')}</Text> : null}
              <View style={styles.row}>
                <Button label={t('review.lookup' as MessageId)} variant="outline" compact disabled={dictionary.isPending} onPress={() => lookUp(item.suggestion || item.fragment || '')} />
                {canSave ? <Button label={saved ? t('review.saved' as MessageId) : t('review.save_better' as MessageId)} variant="outline" compact disabled={saved || saveWord.isPending} onPress={() => saveToLibrary(item.suggestion!, item, 'feedback')} /> : null}
              </View>
            </EvidenceRow>
          );
        })}
        {dictionary.data?.available && dictionary.data.summary ? (
          <View style={styles.group}>
            <Label>{t('reading.meaning' as MessageId)}</Label>
            <PanelCopy>{dictionary.data.summary}</PanelCopy>
          </View>
        ) : null}
        {dictionary.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.dictionary_failed' as MessageId)}</Text> : null}
      </Panel>

      {/* Strengths */}
      {visibleStrengths.length > 0 ? (
        <Panel>
          <Label>{t('review.strengths_title' as MessageId)}</Label>
          {visibleStrengths.map((item, index) => {
            const canSave = Boolean(item.fragment && item.fragment.trim().length <= 180);
            const saved = savedWords.includes((item.fragment ?? '').trim().slice(0, 180));
            return (
              <EvidenceRow key={`strength-${index}`} name={categoryLabel(t, item.category ?? 'strength')}>
                <Text style={[styles.quote, {color: tokens.colors.text}]}>{`“${item.fragment ?? ''}”`}</Text>
                <Text style={[styles.evidenceCopy, {color: tokens.colors.mutedText}]}>{categoryReason(item.category, locale === 'zh' ? 'zh' : 'en')}</Text>
                <View style={styles.row}>
                  <Button label={t('review.lookup' as MessageId)} variant="outline" compact disabled={dictionary.isPending} onPress={() => lookUp(item.fragment ?? '')} />
                  {canSave ? <Button label={saved ? t('review.saved' as MessageId) : t('review.save_useful' as MessageId)} variant="outline" compact disabled={saved || saveWord.isPending} onPress={() => saveToLibrary(item.fragment!, item, 'strength')} /> : null}
                </View>
              </EvidenceRow>
            );
          })}
        </Panel>
      ) : null}

      {hasDelta ? (
        <Panel>
          <Label>{t('review.revision_delta_title' as MessageId)}</Label>
          <PanelCopy>{fill(t('review.revision_score_delta' as MessageId), {before: (beforeScore as number).toFixed(1), after: (overall as number).toFixed(1), gain: `${(deltaOverall as number) > 0 ? '+' : ''}${deltaOverall}`})}</PanelCopy>
          <PanelCopy>{fill(t('review.revision_issue_delta' as MessageId), {before: beforeCount, after: afterCount})}</PanelCopy>
          {removed.length > 0 ? (
            <View style={styles.group}>
              <Label>{t('review.revision_resolved' as MessageId)}</Label>
              {removed.slice(0, 3).map((item, index) => <Text key={index} style={[styles.quote, {color: tokens.colors.mutedText}]}>{`“${str(item.fragment) || str(item.quote)}”`}</Text>)}
            </View>
          ) : null}
          {added.length > 0 ? (
            <View style={styles.group}>
              <Label>{t('review.revision_new' as MessageId)}</Label>
              {added.slice(0, 3).map((item, index) => <Text key={index} style={[styles.quote, {color: tokens.colors.mutedText}]}>{`“${str(item.fragment) || str(item.quote)}”`}</Text>)}
            </View>
          ) : null}
        </Panel>
      ) : null}

      {outcomeItem ? (
        <Panel>
          <Label>{t(`outcome.${outcomeStatus}.kicker` as MessageId)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(`outcome.${outcomeStatus}.title` as MessageId)}</Text>
          <PanelCopy>{fill(t(`outcome.${outcomeStatus}.body` as MessageId), {previous: num(outcomeItem.previous_issue_count) ?? '—', count: num(outcomeItem.issue_count) ?? 0, focus: str(outcomeItem.focus_label) || t('common.current_focus' as MessageId)})}</PanelCopy>
        </Panel>
      ) : null}

      {cue ? (
        <Panel>
          <Label>{t('review.review_cue_kicker' as MessageId)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(cue.state === 'recurring' ? 'review.review_cue_title_recurring' as MessageId : 'review.review_cue_title_unresolved' as MessageId)}</Text>
          <PanelCopy>{fill(t('review.review_cue_body' as MessageId), {category: categoryLabel(t, cue.category ?? 'expression'), status: statusLabel(t, cue.status ?? ''), source: t(cue.source === 'error_memory' ? 'review.review_cue_source_error_memory' as MessageId : 'review.review_cue_source_practice_outcome' as MessageId)})}</PanelCopy>
          {cue.evidence ? <Text style={[styles.quote, {color: tokens.colors.text}]}>{`“${cue.evidence}”`}</Text> : null}
        </Panel>
      ) : null}

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
              onPress={() => grammar.mutate({grammarId: link.grammar_id, evidence: link.evidence}, {onSuccess: (task) => { setGrammarWritingHandoff(task, learningLanguage); router.push('/(app)/writing'); }})}
            />
          ))}
          {grammar.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('review.practice_failed')}</Text> : null}
        </Panel>
      ) : null}

      {/* What is next */}
      <Panel>
        <Label>{t('review.whats_next' as MessageId)}</Label>
        <PanelCopy>{t('review.whats_next_body' as MessageId)}</PanelCopy>
        <Button label={t('review.start_revision' as MessageId)} variant="outline" onPress={beginRevision} />
        <Button label={improve.isPending ? t('writing.creating' as MessageId) : t('review.strong_compare' as MessageId)} variant="outline" compact disabled={improve.isPending} onPress={comparePolished} />
      </Panel>

      <Modal visible={rubricOpen} animationType="slide" transparent onRequestClose={() => setRubricOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, {backgroundColor: tokens.colors.surface}]}>
            <Text accessibilityRole="header" style={[styles.modalTitle, {color: tokens.colors.heading}]}>{t('write.rubric_title' as MessageId)}</Text>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <PanelCopy>{t('write.rubric_intro' as MessageId)}</PanelCopy>
              {RUBRIC_CATEGORIES.map((key) => (
                <View key={key} style={styles.group}>
                  <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{categoryLabel(t, key)}</Text>
                  <Text style={{color: tokens.colors.mutedText}}>{t(`rubric.${key}` as MessageId)}</Text>
                </View>
              ))}
            </ScrollView>
            <Button label={t('write.rubric_close' as MessageId)} onPress={() => setRubricOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={compareOpen} animationType="slide" transparent onRequestClose={() => setCompareOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.modalCard, {backgroundColor: tokens.colors.surface}]}>
            <Text accessibilityRole="header" style={[styles.modalTitle, {color: tokens.colors.heading}]}>{t('review.strong_dialog' as MessageId)}</Text>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Label>{t('review.strong_kicker' as MessageId)}</Label>
              <PanelCopy>{t('review.strong_body' as MessageId)}</PanelCopy>
              {improve.isPending ? <PanelCopy>{t('writing.creating' as MessageId)}</PanelCopy> : null}
              {improve.data ? (
                <>
                  <View style={styles.group}>
                    <Label>{t('review.corrected' as MessageId)}</Label>
                    <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t('review.corrected_title' as MessageId)}</Text>
                    <Text style={[styles.docBody, {color: tokens.colors.text}]}>{improve.data.corrected_text}</Text>
                  </View>
                  <View style={styles.group}>
                    <Label>{t('review.strong' as MessageId)}</Label>
                    <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t('review.strong_title' as MessageId)}</Text>
                    <Text style={[styles.docBody, {color: tokens.colors.text}]}>{improve.data.upgraded_text}</Text>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <Button label={t('write.rubric_close' as MessageId)} onPress={() => setCompareOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  promptText: {fontSize: 17, lineHeight: 26, fontWeight: '600'},
  row: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10},
  group: {gap: 6},
  tabRow: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8},
  tab: {paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', minHeight: 44, justifyContent: 'center'},
  docBody: {fontSize: 15, lineHeight: 27},
  docFoot: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  docFootCompact: {gap: 10},
  lens: {borderWidth: 1, borderRadius: 15, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'},
  legendRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 6},
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  legendDot: {width: 9, height: 9, borderRadius: 999},
  score: {fontSize: 38, fontWeight: '700'},
  evidenceRow: {borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 4},
  evidenceHead: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44},
  evidenceName: {flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600'},
  evidenceBody: {gap: 8, paddingBottom: 12},
  evidenceCopy: {fontSize: 14, lineHeight: 21},
  mark: {width: 22, height: 22, borderRadius: 999, textAlign: 'center', lineHeight: 22, fontSize: 13, fontWeight: '700', overflow: 'hidden'},
  tick: {fontSize: 16, fontWeight: '700', width: 22, textAlign: 'center'},
  quote: {fontSize: 15, lineHeight: 23, fontStyle: 'italic'},
  diff: {gap: 10},
  modalScrim: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)'},
  modalCard: {padding: 24, gap: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%'},
  modalTitle: {fontSize: 20, fontWeight: '700'},
  modalBody: {gap: 12, paddingBottom: 8},
});
