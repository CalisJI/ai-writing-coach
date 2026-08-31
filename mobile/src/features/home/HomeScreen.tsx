import {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../api/client';
import {useSession} from '../../auth/SessionHarness';
import {useI18n} from '../../i18n/I18nProvider';
import type {MessageId} from '../../i18n/messages';
import {useTheme} from '../../theme/ThemeProvider';
import {CONTENT_MAX} from '../../theme/layout';
import {Button, Chip, Label, Metric, Panel, PanelCopy} from '../../components/orena';
import {useJourneyDashboard, useJourneyOutcomes} from '../../query/useJourney';
import {useLibraryVocabulary} from '../../query/useReadingLibrary';
import {useEssays, useLearningMemory, useOpenEssay, useReadingSessionHistory} from '../../query/useHome';
import {useLearnerProfile, useSaveLearnerProfile, useSetLearningLanguage} from '../../query/useLearnerProfile';
import {useNextPractice, usePracticeRecommendation} from '../../query/usePracticeRecommendation';
import {setPracticeHandoff} from './practiceHandoff';
import {OnboardingForm} from './OnboardingForm';
import {setReviewHandoff} from '../review/reviewHandoff';
import {setReadingResumeHandoff} from '../reading/readingResumeHandoff';
import type {EssaySummary, EvaluationInput, JourneyDashboard, LearningMemory, PracticeRecommendation} from '../../api/contracts/learning';
import type {ReadingSessions} from '../../api/contracts/reading';
import {readListeningResume, type ListeningResume} from '../../features/listening/listeningResume';
import {listeningHabitSnapshot, type ListeningHabitSnapshot} from '../../features/listening/listeningHabit';

/**
 * Ported from static/becoming/screens/home.js and orena/home.css.
 *
 * home.js is 971 lines composing many small evidence-driven signal cards
 * around a hero. Everything actually invoked by its `renderHome()` is
 * reproduced here (hero, listening-habit, listening-resume, next-practice
 * plan, library-review-due, writing dashboard, journey stages + rail,
 * recent drafts, library preview); `crossSkillCueMarkup` (a fourth
 * cross-skill orchestration signal) and the Speaking branch of the
 * next-practice plan are not, since they need endpoints/history this pass
 * did not build (crossSkillCue, speakingAttempts) -- tracked as a residual
 * in MOBILE_VISUAL_PARITY_AUDIT.md, not claimed as done.
 */

// ---- pure helpers, mirrored from domain/feedback.js and screens/home.js ----

function sortedEssays(rows: readonly EssaySummary[]): EssaySummary[] {
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function essayTitle(row: EssaySummary | null | undefined, t: (id: MessageId) => string): string {
  const firstLine = (row?.prompt ?? '').split('\n').find(Boolean);
  return (firstLine ?? t('common.free_writing' as MessageId)).trim();
}

function categoryLabel(t: (id: MessageId) => string, category: string): string {
  const key = `category.${category.toLowerCase().replace(/[- ]/g, '_')}` as MessageId;
  const translated = t(key);
  return translated === key ? category.replace(/_/g, ' ') : translated;
}

function statusLabel(t: (id: MessageId) => string, status: string): string {
  const key = `status.${status.toLowerCase()}` as MessageId;
  const translated = t(key);
  return translated === key ? status : translated;
}

function masteryLabel(t: (id: MessageId) => string, stage: string): string {
  const key = `stage.${stage}` as MessageId;
  const translated = t(key);
  return translated === key ? stage : translated;
}

type Insight = {kicker: string; statement: string; context: string; evidence: string; action: string};

function homeInsight(t: (id: MessageId) => string, dashboard: JourneyDashboard | undefined, memory: LearningMemory | undefined): Insight {
  if (!dashboard || !dashboard.essay_count) {
    return {kicker: t('insight.begin.kicker' as MessageId), statement: t('insight.begin.statement' as MessageId), context: t('insight.begin.context' as MessageId), evidence: '', action: t('insight.begin.action' as MessageId)};
  }
  const focus = memory?.focus ?? null;
  const strength = memory?.strengths[0] ?? null;
  const win = memory?.revision_wins[0] ?? null;
  if (focus) {
    const category = categoryLabel(t, focus.category);
    if (focus.status === 'improving') {
      return {kicker: t('insight.moving.kicker' as MessageId), statement: t('insight.moving.statement' as MessageId), context: t('insight.moving.context' as MessageId), evidence: `${category}: ${focus.total ?? focus.series_count ?? 1}`, action: t('insight.moving.action' as MessageId)};
    }
    return {kicker: t('insight.focus.kicker' as MessageId), statement: t('insight.focus.statement' as MessageId), context: t('insight.focus.context' as MessageId), evidence: `${category} · ${focus.series_count ?? 1}`, action: t('insight.focus.action' as MessageId)};
  }
  if (strength) {
    return {kicker: t('insight.strength.kicker' as MessageId), statement: t('insight.strength.statement' as MessageId), context: t('insight.strength.context' as MessageId), evidence: `${categoryLabel(t, strength.category)} · ${masteryLabel(t, strength.stage)} · ${strength.evidence_count}`, action: t('insight.strength.action' as MessageId)};
  }
  if (win) {
    return {kicker: t('insight.win.kicker' as MessageId), statement: t('insight.win.statement' as MessageId), context: t('insight.win.context' as MessageId), evidence: `${win.overall_delta >= 0 ? '+' : ''}${win.overall_delta} · ${win.error_delta}`, action: t('insight.win.action' as MessageId)};
  }
  return {kicker: t('insight.collect.kicker' as MessageId), statement: t('insight.collect.statement' as MessageId), context: t('insight.collect.context' as MessageId), evidence: '', action: t('insight.collect.action' as MessageId)};
}

function metricOverview(dashboard: JourneyDashboard | undefined): {key: string; value: number}[] {
  return Object.entries(dashboard?.metrics ?? {})
    .filter(([, value]) => Number.isFinite(value))
    .map(([key, value]) => ({key, value}))
    .sort((a, b) => a.value - b.value)
    .slice(0, 4);
}

function dashboardEvidence(essays: readonly EssaySummary[], memory: LearningMemory | undefined) {
  const groups = new Map<number, EssaySummary[]>();
  for (const row of essays) { const key = row.series_id; if (!groups.has(key)) groups.set(key, []); groups.get(key)!.push(row); }
  const revisionSeries = [...groups.values()].filter((group) => group.some((row) => row.revision_no > 1)).length;
  const reliable = (memory?.strengths ?? []).filter((item) => ['Stable', 'Mastered'].includes(item.stage)).length;
  return {seriesCount: groups.size, revisionSeries, reliable};
}

const HOME_STAGES: readonly [string, MessageId, MessageId][] = [
  ['capture', 'home.stage_capture' as MessageId, 'home.stage_capture_note' as MessageId],
  ['draft', 'home.stage_draft' as MessageId, 'home.stage_draft_note' as MessageId],
  ['refine', 'home.stage_refine' as MessageId, 'home.stage_refine_note' as MessageId],
  ['finalize', 'home.stage_finalize' as MessageId, 'home.stage_finalize_note' as MessageId],
];

function homeStageIndex(currentEssay: EssaySummary | null): number {
  if (!currentEssay) return 0;
  if (currentEssay.revision_no > 1) return 3;
  if (Number.isFinite(currentEssay.overall)) return 2;
  return 1;
}

type NextPlan =
  | {kind: 'writing'}
  | {kind: 'reading'; sessionId: number}
  | {kind: 'listening'}
  | {kind: 'baseline'}
  | {kind: 'empty'};

function nextPracticePlan({recommendation, readingHistory, listeningResume}: {recommendation: PracticeRecommendation | undefined; readingHistory: ReadingSessions | undefined; listeningResume: ListeningResume | null}): NextPlan {
  if (recommendation && recommendation.intent !== 'baseline') return {kind: 'writing'};
  const reading = readingHistory?.items.find((item) => item.latest_attempt == null);
  if (reading) return {kind: 'reading', sessionId: reading.id};
  if (listeningResume) return {kind: 'listening'};
  if (recommendation?.intent === 'baseline') return {kind: 'baseline'};
  return {kind: 'empty'};
}

// ---- presentational components ----

function SignedOut() { const {t} = useI18n(); const {tokens} = useTheme(); const {signOut} = useSession(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('home.signed_out_title' as never)}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.signed_out_body' as never)}</Text><Pressable accessibilityRole="button" onPress={signOut} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('auth.sign_out')}</Text></Pressable></View>; }

function Unavailable({retry}: {retry?: () => void}) { const {t} = useI18n(); const {tokens} = useTheme(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('home.unavailable_title')}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.unavailable_body')}</Text>{retry && <Pressable accessibilityRole="button" onPress={retry} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('home.retry')}</Text></Pressable>}</View>; }

function LearningHome({recommendation, insight, personalized, currentEssay, onStart, starting, failed, failedFields, dashboard, essays, memory, dueCount, dueWord, listeningResume, listeningHabit, readingHistory, onJourney, onLibrary, onOpenReview, openReviewFailed, onReadResume, onListenResume, onLibraryReview, onListeningGoal, outcomes}: {
  recommendation: PracticeRecommendation;
  insight: Insight;
  personalized: boolean;
  currentEssay: EssaySummary | null;
  onStart: () => void;
  starting: boolean;
  failed: boolean;
  failedFields?: readonly string[];
  dashboard?: JourneyDashboard;
  essays: EssaySummary[];
  memory?: LearningMemory;
  dueCount?: number;
  dueWord: string | null;
  listeningResume: ListeningResume | null;
  listeningHabit: ListeningHabitSnapshot | null;
  readingHistory?: ReadingSessions;
  onJourney: () => void;
  onLibrary: () => void;
  onOpenReview: (essayId: number) => void;
  openReviewFailed: boolean;
  onReadResume: (sessionId: number) => void;
  onListenResume: () => void;
  onLibraryReview: () => void;
  onListeningGoal: () => void;
  outcomes: {status: string; issue_count: number; previous_issue_count: number | null; focus_label: string; revision_no: number} | null;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const nextPlan = nextPracticePlan({recommendation, readingHistory, listeningResume});
  const metrics = metricOverview(dashboard);
  const evidence = dashboardEvidence(essays, memory);
  const level = dashboard?.cefr ?? currentEssay?.cefr_estimate ?? currentEssay?.level_estimate ?? '—';
  const focus = memory?.focus ?? null;
  const stageIndex = homeStageIndex(currentEssay);
  const latestScored = sortedEssays(essays).find((row) => Number.isFinite(row.overall));
  const strength = memory?.strengths[0] ?? null;
  const win = memory?.revision_wins[0] ?? null;
  const reviewCue = memory?.review_cue ?? null;

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      {/* Hero */}
      <Panel>
        <Label>{insight.kicker}</Label>
        <Text accessibilityRole="header" style={[styles.statement, {color: tokens.colors.heading}]}>{insight.statement}</Text>
        <PanelCopy>{insight.context}</PanelCopy>
        <View style={styles.heroActions}>
          <Button label={starting ? t('home.starting') : (personalized ? t('home.start_practice') : insight.action)} onPress={onStart} disabled={starting} />
          <Button label={t('home.open_journey' as never)} onPress={onJourney} variant="outline" />
        </View>
        {openReviewFailed ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('home.open_review_failed' as never)}</Text> : null}
        {currentEssay ? (
          <View style={[styles.currentPiece, {borderTopColor: tokens.colors.border}]}>
            <Label>{t('home.current_piece_title' as never)}</Label>
            <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{essayTitle(currentEssay, t)}</Text>
            <View style={styles.chipRow}>
              {currentEssay.target_cefr ? <Chip>{currentEssay.target_cefr}</Chip> : null}
              {Number.isFinite(currentEssay.overall) ? <Chip>{String(currentEssay.overall)}</Chip> : null}
              <Button label={t('home.open_piece' as never)} variant="outline" compact onPress={() => onOpenReview(currentEssay.id)} />
            </View>
          </View>
        ) : (
          <PanelCopy>{t('home.no_current_piece' as never)}</PanelCopy>
        )}
      </Panel>

      {failed && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('home.start_failed')}</Text>}
      {failed && __DEV__ && failedFields && failedFields.length > 0 && <Text style={{color: tokens.colors.mutedText}}>{`contract: ${failedFields.join(', ')}`}</Text>}

      {/* Signal cards */}
      {listeningResume ? (
        <Panel>
          <Label>{t('home.listening_resume_title' as never)}</Label>
          <PanelCopy>{t('home.listening_resume_body' as never)}</PanelCopy>
          <Button label={t('home.listening_resume_action' as never)} variant="outline" compact onPress={onListenResume} />
        </Panel>
      ) : null}

      {listeningHabit && listeningHabit.status === 'ok' ? (
        <Panel>
          <Label>{t('home.listening_habit_title' as never)}</Label>
          <PanelCopy>{`${t('home.listening_habit_body' as never).replace('{today}', String(Math.floor(listeningHabit.todaySeconds / 60))).replace('{goal}', String(listeningHabit.dailyGoalMinutes))}`}</PanelCopy>
          <Text style={{color: tokens.colors.mutedText, fontSize: 13}}>{t('home.listening_habit_week' as never).replace('{week}', String(Math.floor(listeningHabit.weekSeconds / 60)))}</Text>
          <Button label={t('home.listening_habit_action' as never)} variant="outline" compact onPress={onListeningGoal} />
        </Panel>
      ) : null}

      <Panel>
        <Label>{t('home.next_plan_title' as never)}</Label>
        {nextPlan.kind === 'empty' ? <PanelCopy>{t('home.next_plan_empty' as never)}</PanelCopy> : (
          <>
            <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(`home.next_plan_${nextPlan.kind}_title` as never)}</Text>
            <PanelCopy>{t(`home.next_plan_${nextPlan.kind}_body` as never)}</PanelCopy>
            <Button
              label={t('home.next_plan_action' as never)}
              compact
              onPress={() => {
                if (nextPlan.kind === 'reading') onReadResume(nextPlan.sessionId);
                else if (nextPlan.kind === 'listening') onListenResume();
                else if (nextPlan.kind === 'writing' || nextPlan.kind === 'baseline') onStart();
              }}
            />
          </>
        )}
      </Panel>

      {dueWord ? (
        <Panel>
          <Label>{t('home.library_review_title' as never)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t('home.library_review_due' as never)}</Text>
          <PanelCopy>{t('home.library_review_body' as never).replace('{word}', dueWord)}</PanelCopy>
          <Button label={t('home.library_review_action' as never)} compact onPress={onLibraryReview} />
        </Panel>
      ) : null}

      {/* Writing dashboard */}
      <Panel>
        <Label>{t('home.dashboard_kicker' as never)}</Label>
        <Text accessibilityRole="header" style={[styles.dashboardTitle, {color: tokens.colors.heading}]}>{t('home.dashboard_title' as never)}</Text>
        <PanelCopy>{t('home.dashboard_body' as never)}</PanelCopy>
        <View style={[styles.focusBlock, {borderColor: tokens.colors.border, backgroundColor: tokens.colors.surfaceSunken}]}>
          <Label>{t('home.dashboard_focus' as never)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '700', fontSize: 17}}>{focus ? categoryLabel(t, focus.category) : t('home.dashboard_collecting' as never)}</Text>
          {focus ? <Text style={{color: tokens.colors.mutedText}}>{`${statusLabel(t, focus.status ?? '')} · ${focus.total ?? 0} ${t('common.evidence' as never)} · ${focus.series_count ?? 1} ${t('common.writing_series' as never)}`}</Text> : null}
          <Chip>{`${t('home.dashboard_level' as never)}: ${level}`}</Chip>
        </View>
        <View style={styles.metrics}>
          <Metric label={t('home.dashboard_series' as never)} value={String(evidence.seriesCount)} />
          <Metric label={t('home.dashboard_revisions' as never)} value={String(evidence.revisionSeries)} />
          <Metric label={t('home.dashboard_strengths' as never)} value={String(evidence.reliable)} />
        </View>
        <Label>{t('home.dashboard_dimensions' as never)}</Label>
        <PanelCopy>{t('home.dashboard_note' as never)}</PanelCopy>
        {metrics.length > 0 ? metrics.map((item) => (
          <View key={item.key} style={styles.dimensionRow}>
            <Text style={{color: tokens.colors.text, width: 120}}>{categoryLabel(t, item.key)}</Text>
            <View style={[styles.dimensionTrack, {backgroundColor: tokens.colors.surfaceSunken}]}><View style={[styles.dimensionFill, {width: `${Math.max(0, Math.min(100, item.value))}%`, backgroundColor: tokens.colors.accent}]} /></View>
            <Text style={{color: tokens.colors.mutedText, width: 32, textAlign: 'right'}}>{item.value.toFixed(0)}</Text>
          </View>
        )) : <PanelCopy>{t('home.dashboard_collecting' as never)}</PanelCopy>}
      </Panel>

      {/* Journey stages */}
      <Panel>
        <Label>{t('home.your_journey' as never)}</Label>
        <PanelCopy>{t('home.journey_lead' as never)}</PanelCopy>
        <View style={styles.stageRow}>
          {HOME_STAGES.map(([key, label, note], index) => (
            <View key={key} style={styles.stageItem}>
              <View style={[styles.stageDot, {backgroundColor: index < stageIndex ? tokens.colors.accent : index === stageIndex ? tokens.colors.surfaceSunken : 'transparent', borderColor: index <= stageIndex ? tokens.colors.accent : tokens.colors.border}]} />
              <Text style={{color: index <= stageIndex ? tokens.colors.heading : tokens.colors.mutedText, fontWeight: index === stageIndex ? '700' : '400', fontSize: 13}}>{t(label)}</Text>
              <Text style={{color: tokens.colors.mutedText, fontSize: 12}}>{t(note)}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.wellRow, {borderTopColor: tokens.colors.border}]}>
          <View>
            <Label>{t('home.latest_score' as never)}</Label>
            {latestScored ? <Text style={{color: tokens.colors.heading, fontSize: 28, fontWeight: '700'}}>{String(latestScored.overall)}</Text> : <PanelCopy>{t('home.latest_score_none' as never)}</PanelCopy>}
          </View>
          <Button label={t('home.view_insights' as never)} variant="outline" compact onPress={onJourney} />
        </View>
      </Panel>

      {/* Rail signals */}
      <Panel>
        <Label>{t('home.insight_title' as never)}</Label>
        <Text style={{color: tokens.colors.heading, fontStyle: 'italic'}}>{insight.statement}</Text>
        <PanelCopy>{insight.context}</PanelCopy>
      </Panel>

      {strength ? (
        <Panel>
          <Label>{t('home.review_cue_kicker' as never)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{categoryLabel(t, strength.category)}</Text>
          <PanelCopy>{`${masteryLabel(t, strength.stage)} · ${strength.evidence_count} ${t('common.evidence' as never)} · ${strength.series_count} ${t('common.writing_series' as never)}`}</PanelCopy>
        </Panel>
      ) : win ? (
        <Panel>
          <Label>{t('home.review_cue_kicker' as never)}</Label>
          <PanelCopy>{`${win.overall_delta >= 0 ? '+' : ''}${win.overall_delta} · ${win.error_delta >= 0 ? '+' : ''}${win.error_delta} · ${win.revisions}`}</PanelCopy>
        </Panel>
      ) : null}

      {reviewCue?.available ? (
        <Panel>
          <Label>{t('home.review_cue_kicker' as never)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(reviewCue.state === 'recurring' ? 'home.review_cue_title_recurring' as never : 'home.review_cue_title_unresolved' as never)}</Text>
          <PanelCopy>{t('home.review_cue_body' as never).replace('{category}', categoryLabel(t, reviewCue.category ?? 'expression')).replace('{status}', statusLabel(t, reviewCue.status ?? '')).replace('{source}', t(reviewCue.source === 'error_memory' ? 'home.review_cue_source_error_memory' as never : 'home.review_cue_source_practice_outcome' as never))}</PanelCopy>
          {reviewCue.evidence ? <Text style={{color: tokens.colors.text, fontStyle: 'italic'}}>{`“${reviewCue.evidence}”`}</Text> : null}
          {reviewCue.essay_id ? <Button label={t('home.review_cue_open' as never)} variant="outline" compact onPress={() => onOpenReview(reviewCue.essay_id!)} /> : null}
        </Panel>
      ) : null}

      {outcomes ? (
        <Panel>
          <Label>{t(`outcome.${outcomes.status}.kicker` as never)}</Label>
          <Text style={{color: tokens.colors.heading, fontWeight: '600'}}>{t(`outcome.${outcomes.status}.title` as never)}</Text>
          <PanelCopy>{t(`outcome.${outcomes.status}.body` as never).replace('{previous}', String(outcomes.previous_issue_count ?? '—')).replace('{count}', String(outcomes.issue_count)).replace('{focus}', outcomes.focus_label || t('common.current_focus' as never))}</PanelCopy>
        </Panel>
      ) : null}

      {dashboard && dashboard.streak > 0 ? (
        <Panel>
          <Label>{t('home.streak_title' as never)}</Label>
          <Text style={{color: tokens.colors.heading, fontSize: 28, fontWeight: '700'}}>{dashboard.streak} <Text style={{fontSize: 14, fontWeight: '400', color: tokens.colors.mutedText}}>{t('home.streak_days' as never)}</Text></Text>
          <PanelCopy>{t('home.streak_note' as never)}</PanelCopy>
        </Panel>
      ) : null}

      {/* Writing evidence (existing metric grid, kept for the R20-1 dashboard test contract) */}
      <Panel>
        <Label>{t('home.writing_title' as never)}</Label>
        {dashboard && dashboard.essay_count > 0 ? (
          <>
            <PanelCopy>{t('home.writing_body' as never)}</PanelCopy>
            <View style={styles.metrics}>
              <Metric label={t('home.metric_essays' as never)} value={String(dashboard.essay_count)} />
              <Metric label={t('home.metric_revisions' as never)} value={String(dashboard.revision_count)} />
              <Metric label={t('home.metric_signal' as never)} value={String(dashboard.skill_score)} />
              <Metric label={t('home.metric_level' as never)} value={dashboard.cefr} />
              <Metric label={t('home.metric_streak' as never)} value={String(dashboard.streak)} />
            </View>
          </>
        ) : (
          <PanelCopy>{t('home.writing_empty' as never)}</PanelCopy>
        )}
      </Panel>

      {/* Recent drafts */}
      <Panel>
        <View style={styles.headRow}>
          <Label>{t('home.recent_drafts' as never)}</Label>
          <Button label={t('home.open_journey' as never)} variant="outline" compact onPress={onJourney} />
        </View>
        {essays.length === 0 ? <PanelCopy>{t('home.writing_empty' as never)}</PanelCopy> : sortedEssays(essays).slice(0, 3).map((row) => (
          <Pressable key={row.id} accessibilityRole="button" onPress={() => onOpenReview(row.id)} style={[styles.recentRow, {borderColor: tokens.colors.border}]}>
            <Text style={{color: tokens.colors.text, fontWeight: '600', flex: 1}} numberOfLines={1}>{essayTitle(row, t)}</Text>
            <Text style={{color: tokens.colors.mutedText}}>{row.cefr_estimate ?? row.level_estimate ?? ''}{row.overall != null ? ` · ${row.overall}` : ''}</Text>
          </Pressable>
        ))}
      </Panel>

      {/* Library preview */}
      <Panel>
        <View style={styles.headRow}>
          <Label>{t('home.library_title' as never)}</Label>
          <PanelCopy>{typeof dueCount === 'number' && dueCount > 0 ? `${dueCount} ${t('home.library_due' as never)}` : t('home.library_none' as never)}</PanelCopy>
        </View>
        <Button label={t('home.open_library' as never)} onPress={onLibrary} variant="outline" compact />
      </Panel>
    </ScrollView>
  );
}

export function HomeScreen({client: providedClient}: {client?: ApiClient}) {
  const {t} = useI18n(); const {tokens} = useTheme(); const {session, sessionCookie} = useSession(); const router = useRouter();
  const client = useMemo(() => { if (providedClient) return providedClient; try { return createConfiguredApiClient(); } catch { return null; } }, [providedClient]);
  const profile = useLearnerProfile(client, sessionCookie); const exists = profile.data?.exists === true;
  const recommendation = usePracticeRecommendation(client, sessionCookie, exists); const save = useSaveLearnerProfile(client, sessionCookie); const language = useSetLearningLanguage(client, sessionCookie); const next = useNextPractice(client, sessionCookie);
  const dashboard = useJourneyDashboard(client, sessionCookie); const library = useLibraryVocabulary(client, sessionCookie);
  const outcomesQuery = useJourneyOutcomes(client, sessionCookie);
  const essaysQuery = useEssays(client, sessionCookie); const memory = useLearningMemory(client, sessionCookie); const readingHistory = useReadingSessionHistory(client, sessionCookie);
  const openEssay = useOpenEssay(client, sessionCookie);
  const openReview = (essayId: number) => {
    openEssay.mutate(essayId, {onSuccess: (essay) => {
      const input: EvaluationInput = {prompt: essay.prompt, text: essay.text, target_cefr: essay.target_cefr, learning_language: essay.language_code, ...(essay.parent_id ? {parent_essay_id: essay.parent_id} : {})};
      setReviewHandoff({...essay, app_cefr: essay.app_cefr ?? essay.cefr_estimate ?? ''}, input);
      router.push('/(app)/review');
    }});
  };
  const [listeningResume, setListeningResume] = useState<ListeningResume | null>(null);
  const [listeningHabit, setListeningHabit] = useState<ListeningHabitSnapshot | null>(null);
  useEffect(() => { let mounted = true; void readListeningResume().then((value) => { if (mounted) setListeningResume(value); }); void listeningHabitSnapshot().then((value) => { if (mounted) setListeningHabit(value); }); return () => { mounted = false; }; }, [exists]);

  if (session.status !== 'authenticated' || !sessionCookie) return <SignedOut />;
  if (!client) return <Unavailable />;
  if (profile.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('home.loading')}</Text></View>;
  if (profile.isError) return <Unavailable retry={() => void profile.refetch()} />;
  if (!exists) return <OnboardingForm onSubmit={(value, learningLanguage) => { void language.mutateAsync(learningLanguage).then(() => save.mutateAsync(value)).catch(() => undefined); }} isSaving={language.isPending || save.isPending} failed={language.isError || save.isError} />;
  if (recommendation.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('home.loading')}</Text></View>;
  if (recommendation.isError || !recommendation.data) return <Unavailable retry={() => void recommendation.refetch()} />;

  const essays = essaysQuery.data ?? [];
  const currentEssay = sortedEssays(essays)[0] ?? null;
  const insight = homeInsight(t, dashboard.data, memory.data);
  const personalized = recommendation.data.intent !== 'baseline';
  const dueItem = library.data?.items.find((item) => item.due);

  return (
    <LearningHome
      recommendation={recommendation.data}
      insight={insight}
      personalized={personalized}
      currentEssay={currentEssay}
      dashboard={dashboard.data}
      essays={essays}
      memory={memory.data}
      dueCount={library.data?.summary.due}
      dueWord={dueItem?.word ?? null}
      listeningResume={listeningResume}
      listeningHabit={listeningHabit}
      readingHistory={readingHistory.data}
      onJourney={() => router.push('/(app)/journey')}
      onLibrary={() => router.push('/(app)/library')}
      onOpenReview={openReview}
      openReviewFailed={openEssay.isError}
      onReadResume={(sessionId) => { setReadingResumeHandoff(sessionId); router.push('/(app)/reading'); }}
      onListenResume={() => router.push('/(app)/listening')}
      onLibraryReview={() => router.push('/(app)/library')}
      onListeningGoal={() => router.push('/(app)/listening')}
      outcomes={outcomesQuery.data?.latest ?? null}
      starting={next.isPending}
      failed={next.isError}
      failedFields={next.error?.invalidFields}
      onStart={() => next.mutate(recommendation.data.target_level, {onSuccess: (task) => { setPracticeHandoff(task); router.push('/(app)/writing'); }})}
    />
  );
}

const styles = StyleSheet.create({
  metrics: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  title: {fontSize: 20, fontWeight: '700'},
  body: {fontSize: 15, lineHeight: 24},
  button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 12},
  buttonText: {fontSize: 14, fontWeight: '700'},
  statement: {fontSize: 26, fontWeight: '600', lineHeight: 32, letterSpacing: -0.4},
  heroActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  currentPiece: {borderTopWidth: 1, paddingTop: 12, gap: 6},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center'},
  dashboardTitle: {fontSize: 20, fontWeight: '600'},
  focusBlock: {borderWidth: 1, borderRadius: 15, padding: 14, gap: 4},
  dimensionRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  dimensionTrack: {flex: 1, height: 6, borderRadius: 999, overflow: 'hidden'},
  dimensionFill: {height: '100%', borderRadius: 999},
  stageRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  stageItem: {flex: 1, minWidth: 80, gap: 4},
  stageDot: {width: 14, height: 14, borderRadius: 999, borderWidth: 2},
  wellRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12},
  headRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  recentRow: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1},
});
