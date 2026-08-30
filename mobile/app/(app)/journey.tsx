import {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {useJourneyDashboard, useJourneyOutcomes} from '../../src/query/useJourney';

export default function JourneyScreen() {
  const {t} = useI18n(); const {tokens} = useTheme(); const {sessionCookie} = useSession();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const dashboard = useJourneyDashboard(client, sessionCookie); const outcomes = useJourneyOutcomes(client, sessionCookie);
  const data = dashboard.data; const outcomeItems = outcomes.data?.items ?? [];
  if (!client || !sessionCookie) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('journey.title')}</Text><Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('journey.unavailable')}</Text></View>;
  if (dashboard.isPending || outcomes.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('journey.loading')}</Text></View>;
  if (dashboard.isError || outcomes.isError || !data || !outcomes.data) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('journey.title')}</Text><Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('journey.unavailable')}</Text></View>;
  const metric = (label: string, value: number) => <View style={[styles.metric, {backgroundColor: tokens.colors.surface}]}><Text style={{color: tokens.colors.mutedText}}>{label}</Text><Text style={[styles.metricValue, {color: tokens.colors.text}]}>{String(value)}</Text></View>;
  return <ScrollView contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('journey.title')}</Text><View style={styles.metrics}>{metric(t('journey.essays'), data.essay_count)}{metric(t('journey.revisions'), data.revision_count)}{metric(t('journey.score'), data.skill_score)}</View><View style={[styles.card, {backgroundColor: tokens.colors.surface}]}><Text style={[styles.heading, {color: tokens.colors.text}]}>{t('journey.focus')}</Text><Text style={{color: tokens.colors.text}}>{data.error_memory[0]?.category || t('journey.empty')}</Text><Text style={{color: tokens.colors.mutedText}}>{data.cefr}</Text></View><View style={[styles.card, {backgroundColor: tokens.colors.surface}]}><Text style={[styles.heading, {color: tokens.colors.text}]}>{t('journey.outcomes')}</Text>{outcomeItems.length === 0 ? <Text style={{color: tokens.colors.mutedText}}>{t('journey.empty')}</Text> : outcomeItems.slice(0, 8).map((item) => <Text key={item.essay_id} style={{color: tokens.colors.text}}>{item.focus_label || item.status}</Text>)}</View></ScrollView>;
}
const styles = StyleSheet.create({container: {flexGrow: 1, padding: 24, gap: 12}, title: {fontSize: 28, fontWeight: '700'}, metrics: {flexDirection: 'row', gap: 8}, metric: {flex: 1, padding: 12, borderRadius: 12, gap: 4}, metricValue: {fontSize: 22, fontWeight: '700'}, card: {padding: 16, borderRadius: 12, gap: 8}, heading: {fontSize: 18, fontWeight: '700'}});
