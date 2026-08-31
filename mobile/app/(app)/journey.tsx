import {useMemo, type ReactNode} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import type {MessageId} from '../../src/i18n/messages';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useJourneyDashboard, useJourneyOutcomes} from '../../src/query/useJourney';
import {useLearningMemory} from '../../src/query/useHome';
import {Button, Chip, Label, Metric, Panel, PanelCopy} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/journey.js and orena/journey.css.
 *
 * journey.js's own comment: "Every card here is one record from
 * api.learningMemory()." That endpoint (writing_coach/becoming_memory.py's
 * get_learning_memory()) was already wired into the mobile client for
 * Home's insight computation, so this pass draws the current-focus trend
 * (older/newer occurrence counts -> focus progress), reliable strengths
 * (Stable/Mastered stage patterns) and recent-improvement (revision deltas)
 * cards from the same real data the web uses, replacing the placeholder
 * `error_memory[0]` line. Not reproduced: the web's SVG progress gauges (a
 * plain proportional bar stands in), the multi-point journey timeline
 * (started/first-win/momentum/upcoming), and the target-rail dialog with
 * its own "why this" / "how this works" copy and a start-target action --
 * each is its own subsystem, tracked as a residual in
 * MOBILE_VISUAL_PARITY_AUDIT.md rather than claimed as done.
 */

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

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

export default function JourneyScreen() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const dashboard = useJourneyDashboard(client, sessionCookie);
  const outcomes = useJourneyOutcomes(client, sessionCookie);
  const memory = useLearningMemory(client, sessionCookie);
  const data = dashboard.data;
  const outcomeItems = outcomes.data?.items ?? [];
  const focus = memory.data?.focus ?? null;
  const reliableStrengths = (memory.data?.strengths ?? []).filter((item) => item.stage === 'Stable' || item.stage === 'Mastered');
  const topWin = memory.data?.revision_wins[0] ?? null;

  const shell = (body: ReactNode) => (
    <View style={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('journey.title')}</Text>
      {body}
      <Button label={t('nav.back_home' as never)} onPress={() => router.replace('/(app)')} />
    </View>
  );

  // Not signed in is a different fact from the service being unavailable.
  if (!sessionCookie) return shell(<PanelCopy>{t('journey.signed_out' as never)}</PanelCopy>);
  if (!client) return shell(<Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('journey.unavailable')}</Text>);
  if (dashboard.isPending || outcomes.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('journey.loading')}</Text></View>;
  if (dashboard.isError || outcomes.isError || !data || !outcomes.data) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('journey.title')}</Text><Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('journey.unavailable')}</Text></View>;

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('journey.title')}</Text>
      <Panel>
        <View style={styles.metrics}>
          <Metric label={t('journey.essays')} value={String(data.essay_count)} />
          <Metric label={t('journey.revisions')} value={String(data.revision_count)} />
          <Metric label={t('journey.score')} value={String(data.skill_score)} />
          <Metric label={t('home.metric_streak' as never)} value={String(data.streak)} />
        </View>
      </Panel>
      <Panel>
        <Label>{t('journey.focus')}</Label>
        {focus ? (
          <>
            <Text style={[styles.focusCategory, {color: tokens.colors.text}]}>{categoryLabel(t, focus.category)}</Text>
            <View style={styles.chipRow}>
              <Chip>{statusLabel(t, focus.status ?? '')}</Chip>
              <Chip>{data.cefr}</Chip>
            </View>
            {typeof focus.older === 'number' && typeof focus.newer === 'number' ? (
              <View style={styles.trend}>
                <Label>{t('journey.focus_progress' as never)}</Label>
                <View style={[styles.progressTrack, {backgroundColor: tokens.colors.surfaceSunken}]}>
                  <View style={[styles.progressFill, {backgroundColor: tokens.colors.accent, width: `${focus.older > 0 ? Math.max(0, Math.min(100, Math.round(((focus.older - focus.newer) / focus.older) * 100))) : 0}%`}]} />
                </View>
                <Text style={{color: tokens.colors.mutedText}}>{`${t('journey.before' as never)} ${focus.older} · ${t('journey.now' as never)} ${focus.newer} · ${t('journey.occurrence' as never)}`}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={{color: tokens.colors.text}}>{t('journey.empty')}</Text>
        )}
      </Panel>
      {reliableStrengths.length > 0 ? (
        <Panel>
          <Label>{t('journey.reliable' as never)}</Label>
          <PanelCopy>{t('journey.reliable_note' as never)}</PanelCopy>
          {reliableStrengths.slice(0, 6).map((item) => (
            <View key={item.category} style={styles.outcomeRow}>
              <Text style={[styles.outcomeLabel, {color: tokens.colors.text}]}>{`${categoryLabel(t, item.category)} · ${masteryLabel(t, item.stage)}`}</Text>
              <Chip>{String(item.evidence_count)}</Chip>
            </View>
          ))}
        </Panel>
      ) : null}
      {topWin ? (
        <Panel>
          <Label>{t('journey.recent_improvement' as never)}</Label>
          <View style={styles.chipRow}>
            <Chip>{`${t('journey.score_delta' as never)}: ${topWin.overall_delta >= 0 ? '+' : ''}${topWin.overall_delta}`}</Chip>
            <Chip>{`${t('journey.issue_delta' as never)}: ${topWin.error_delta >= 0 ? '+' : ''}${topWin.error_delta}`}</Chip>
          </View>
          <PanelCopy>{fill(t('journey.across_drafts' as never), {count: topWin.revisions})}</PanelCopy>
        </Panel>
      ) : null}
      <Panel>
        <Label>{t('journey.outcomes')}</Label>
        {outcomeItems.length === 0 ? (
          <PanelCopy>{t('journey.empty')}</PanelCopy>
        ) : outcomeItems.slice(0, 8).map((item) => (
          <View key={item.essay_id} style={styles.outcomeRow}>
            <Text style={[styles.outcomeLabel, {color: tokens.colors.text}]}>{item.focus_label || statusLabel(t, item.status)}</Text>
            <Chip>{statusLabel(t, item.status)}</Chip>
          </View>
        ))}
      </Panel>
      <Button label={t('nav.back_home' as never)} onPress={() => router.replace('/(app)')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  title: {fontSize: 20, fontWeight: '700'},
  metrics: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  outcomeRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 6},
  outcomeLabel: {flex: 1, minWidth: 0, fontSize: 15},
  focusCategory: {fontSize: 17, fontWeight: '600'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  trend: {gap: 6, paddingTop: 4},
  progressTrack: {height: 8, borderRadius: 4, overflow: 'hidden'},
  progressFill: {height: 8, borderRadius: 4},
});
