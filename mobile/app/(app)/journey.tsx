import {useMemo, type ReactNode} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useJourneyDashboard, useJourneyOutcomes} from '../../src/query/useJourney';
import {Button, Chip, Label, Metric, Panel, PanelCopy} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/journey.js and orena/journey.css.
 *
 * The web is a full growth-pattern dashboard (focus cards with progress
 * gauges, a grammar/practice outcome history, a timeline, a target rail with
 * its own dialog) built on fields the mobile API does not expose in that
 * shape (pattern-level gauges, per-pattern trend deltas). Native's dashboard
 * hook returns essay_count/revision_count/skill_score/cefr/streak/
 * error_memory and a flat outcomes list, which is what Home's own metric
 * grid already uses -- this screen reuses the same Metric primitive for
 * consistency and adds the outcomes list the web calls "Practice outcomes".
 */
export default function JourneyScreen() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const dashboard = useJourneyDashboard(client, sessionCookie);
  const outcomes = useJourneyOutcomes(client, sessionCookie);
  const data = dashboard.data;
  const outcomeItems = outcomes.data?.items ?? [];

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
        <Text style={{color: tokens.colors.text}}>{data.error_memory[0]?.category || t('journey.empty')}</Text>
        <Chip>{data.cefr}</Chip>
      </Panel>
      <Panel>
        <Label>{t('journey.outcomes')}</Label>
        {outcomeItems.length === 0 ? (
          <PanelCopy>{t('journey.empty')}</PanelCopy>
        ) : outcomeItems.slice(0, 8).map((item) => (
          <View key={item.essay_id} style={styles.outcomeRow}>
            <Text style={[styles.outcomeLabel, {color: tokens.colors.text}]}>{item.focus_label || item.status}</Text>
            <Chip>{item.status}</Chip>
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
});
