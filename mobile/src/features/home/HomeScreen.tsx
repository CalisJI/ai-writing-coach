import {useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../api/client';
import {useSession} from '../../auth/SessionHarness';
import {useI18n} from '../../i18n/I18nProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {CONTENT_MAX} from '../../theme/layout';
import {Button, Hero, Label, Metric, Panel, PanelCopy, Split} from '../../components/orena';
import {useJourneyDashboard} from '../../query/useJourney';
import {useLibraryVocabulary} from '../../query/useReadingLibrary';
import {useLearnerProfile, useSaveLearnerProfile, useSetLearningLanguage} from '../../query/useLearnerProfile';
import {useNextPractice, usePracticeRecommendation} from '../../query/usePracticeRecommendation';
import {setPracticeHandoff} from './practiceHandoff';
import {OnboardingForm} from './OnboardingForm';
import type {PracticeRecommendation} from '../../api/contracts/learning';

function SignedOut() { const {t} = useI18n(); const {tokens} = useTheme(); const {signOut} = useSession(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('home.signed_out_title' as never)}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.signed_out_body' as never)}</Text><Pressable accessibilityRole="button" onPress={signOut} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('auth.sign_out')}</Text></Pressable></View>; }

function Unavailable({retry}: {retry?: () => void}) { const {t} = useI18n(); const {tokens} = useTheme(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('home.unavailable_title')}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.unavailable_body')}</Text>{retry && <Pressable accessibilityRole="button" onPress={retry} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('home.retry')}</Text></Pressable>}</View>; }

function LearningHome({recommendation, onStart, starting, failed, failedFields, dashboard, dueCount, onJourney, onLibrary}: {
  recommendation: PracticeRecommendation;
  onStart: () => void;
  starting: boolean;
  failed: boolean;
  failedFields?: readonly string[];
  dashboard?: {essay_count: number; revision_count: number; skill_score: number; cefr: string; streak: number};
  dueCount?: number;
  onJourney: () => void;
  onLibrary: () => void;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Hero
        greeting={t('home.greeting')}
        statement={recommendation.focus_label}
        lede={recommendation.reason}
        actions={<>
          <Button label={starting ? t('home.starting') : t('home.start_practice')} onPress={onStart} disabled={starting} />
          <Button label={t('home.open_journey' as never)} onPress={onJourney} variant="outline" />
        </>}
      />
      {failed && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('home.start_failed')}</Text>}
      {failed && __DEV__ && failedFields && failedFields.length > 0 && <Text style={{color: tokens.colors.mutedText}}>{`contract: ${failedFields.join(', ')}`}</Text>}

      <Split aside={<Panel>
        <Label>{t('home.library_title' as never)}</Label>
        <PanelCopy>{typeof dueCount === 'number' && dueCount > 0 ? `${dueCount} ${t('home.library_due' as never)}` : t('home.library_none' as never)}</PanelCopy>
        <Button label={t('home.open_library' as never)} onPress={onLibrary} variant="outline" compact />
      </Panel>}>
      <Panel>
        <Label>{t('home.recommendation_title')}</Label>
        <PanelCopy>{`${t('home.evidence')}: ${recommendation.evidence}`}</PanelCopy>
        <View style={styles.metrics}>
          <Metric label={t('home.target')} value={recommendation.target_level} />
          <Metric label={t('home.metric_status' as never)} value={recommendation.focus_status || recommendation.intent} />
        </View>
      </Panel>

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
          // No evidence is a truthful state, not a zeroed dashboard.
          <PanelCopy>{t('home.writing_empty' as never)}</PanelCopy>
        )}
      </Panel>
      </Split>

    </ScrollView>
  );
}

export function HomeScreen({client: providedClient}: {client?: ApiClient}) {
  const {t} = useI18n(); const {tokens} = useTheme(); const {session, sessionCookie} = useSession(); const router = useRouter();
  const client = useMemo(() => { if (providedClient) return providedClient; try { return createConfiguredApiClient(); } catch { return null; } }, [providedClient]);
  const profile = useLearnerProfile(client, sessionCookie); const exists = profile.data?.exists === true;
  const recommendation = usePracticeRecommendation(client, sessionCookie, exists); const save = useSaveLearnerProfile(client, sessionCookie); const language = useSetLearningLanguage(client, sessionCookie); const next = useNextPractice(client, sessionCookie);
  const dashboard = useJourneyDashboard(client, sessionCookie); const library = useLibraryVocabulary(client, sessionCookie);
  if (session.status !== 'authenticated' || !sessionCookie) return <SignedOut />;
  if (!client) return <Unavailable />;
  if (profile.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('home.loading')}</Text></View>;
  if (profile.isError) return <Unavailable retry={() => void profile.refetch()} />;
  if (!exists) return <OnboardingForm onSubmit={(value, learningLanguage) => { void language.mutateAsync(learningLanguage).then(() => save.mutateAsync(value)).catch(() => undefined); }} isSaving={language.isPending || save.isPending} failed={language.isError || save.isError} />;
  if (recommendation.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('home.loading')}</Text></View>;
  if (recommendation.isError || !recommendation.data) return <Unavailable retry={() => void recommendation.refetch()} />;
  return <LearningHome dashboard={dashboard.data} dueCount={library.data?.summary.due} onJourney={() => router.push('/(app)/journey')} onLibrary={() => router.push('/(app)/library')} recommendation={recommendation.data} starting={next.isPending} failed={next.isError} failedFields={next.error?.invalidFields} onStart={() => next.mutate(recommendation.data.target_level, {onSuccess: (task) => { setPracticeHandoff(task); router.push('/(app)/writing'); }})} />;
}

const styles = StyleSheet.create({metrics: {flexDirection: 'row', flexWrap: 'wrap', gap: 16}, container: {flex: 1, padding: 24, gap: 12, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'}, title: {fontSize: 28, fontWeight: '700'}, body: {fontSize: 16, lineHeight: 24}, card: {padding: 16, borderRadius: 18, gap: 8, borderWidth: 1}, cardTitle: {fontSize: 18, fontWeight: '700'}, button: {padding: 16, borderRadius: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 12}, buttonText: {fontSize: 14, fontWeight: '700'}});
