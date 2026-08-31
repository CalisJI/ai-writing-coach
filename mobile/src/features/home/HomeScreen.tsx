import {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../api/client';
import {useSession} from '../../auth/SessionHarness';
import {useI18n} from '../../i18n/I18nProvider';
import {useTheme} from '../../theme/ThemeProvider';
import {MAX_CONTENT_WIDTH} from '../../theme/tokens';
import {useLearnerProfile, useSaveLearnerProfile, useSetLearningLanguage} from '../../query/useLearnerProfile';
import {useNextPractice, usePracticeRecommendation} from '../../query/usePracticeRecommendation';
import {setPracticeHandoff} from './practiceHandoff';
import {OnboardingForm} from './OnboardingForm';
import type {PracticeRecommendation} from '../../api/contracts/learning';

function SignedOut() { const {t} = useI18n(); const {tokens} = useTheme(); const {signOut} = useSession(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('home.signed_out_title' as never)}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.signed_out_body' as never)}</Text><Pressable accessibilityRole="button" onPress={signOut} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={styles.buttonText}>{t('auth.sign_out')}</Text></Pressable></View>; }

function Unavailable({retry}: {retry?: () => void}) { const {t} = useI18n(); const {tokens} = useTheme(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('home.unavailable_title')}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.unavailable_body')}</Text>{retry && <Pressable accessibilityRole="button" onPress={retry} style={[styles.button, {backgroundColor: tokens.colors.accent}]}><Text style={styles.buttonText}>{t('home.retry')}</Text></Pressable>}</View>; }

function RecommendationCard({recommendation, onStart, starting, failed, failedFields}: {recommendation: PracticeRecommendation; onStart: () => void; starting: boolean; failed: boolean; failedFields?: readonly string[]}) { const {t} = useI18n(); const {tokens} = useTheme(); return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('home.title')}</Text><Text style={[styles.body, {color: tokens.colors.mutedText}]}>{t('home.greeting')}</Text><View style={[styles.card, {backgroundColor: tokens.colors.surface}]}><Text style={[styles.cardTitle, {color: tokens.colors.text}]}>{t('home.recommendation_title')}</Text><Text style={{color: tokens.colors.text}}>{t('home.focus')}: {recommendation.focus_label}</Text><Text style={{color: tokens.colors.text}}>{t('home.reason')}: {recommendation.reason}</Text><Text style={{color: tokens.colors.text}}>{t('home.evidence')}: {recommendation.evidence}</Text><Text style={{color: tokens.colors.text}}>{t('home.target')}: {recommendation.target_level}</Text></View>{failed && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('home.start_failed')}</Text>}{failed && __DEV__ && failedFields && failedFields.length > 0 && <Text style={{color: tokens.colors.mutedText}}>{`contract: ${failedFields.join(', ')}`}</Text>}<Pressable accessibilityRole="button" disabled={starting} onPress={onStart} style={[styles.button, {backgroundColor: tokens.colors.accent, opacity: starting ? 0.6 : 1}]}><Text style={styles.buttonText}>{starting ? t('home.starting') : t('home.start_practice')}</Text></Pressable></View>; }

export function HomeScreen({client: providedClient}: {client?: ApiClient}) {
  const {t} = useI18n(); const {tokens} = useTheme(); const {session, sessionCookie} = useSession(); const router = useRouter();
  const client = useMemo(() => { if (providedClient) return providedClient; try { return createConfiguredApiClient(); } catch { return null; } }, [providedClient]);
  const profile = useLearnerProfile(client, sessionCookie); const exists = profile.data?.exists === true;
  const recommendation = usePracticeRecommendation(client, sessionCookie, exists); const save = useSaveLearnerProfile(client, sessionCookie); const language = useSetLearningLanguage(client, sessionCookie); const next = useNextPractice(client, sessionCookie);
  if (session.status !== 'authenticated' || !sessionCookie) return <SignedOut />;
  if (!client) return <Unavailable />;
  if (profile.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('home.loading')}</Text></View>;
  if (profile.isError) return <Unavailable retry={() => void profile.refetch()} />;
  if (!exists) return <OnboardingForm onSubmit={(value, learningLanguage) => { void language.mutateAsync(learningLanguage).then(() => save.mutateAsync(value)).catch(() => undefined); }} isSaving={language.isPending || save.isPending} failed={language.isError || save.isError} />;
  if (recommendation.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('home.loading')}</Text></View>;
  if (recommendation.isError || !recommendation.data) return <Unavailable retry={() => void recommendation.refetch()} />;
  return <RecommendationCard recommendation={recommendation.data} starting={next.isPending} failed={next.isError} failedFields={next.error?.invalidFields} onStart={() => next.mutate(recommendation.data.target_level, {onSuccess: (task) => { setPracticeHandoff(task); router.push('/(app)/writing'); }})} />;
}

const styles = StyleSheet.create({container: {flex: 1, padding: 24, gap: 12, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center'}, title: {fontSize: 28, fontWeight: '700'}, body: {fontSize: 16, lineHeight: 24}, card: {padding: 16, borderRadius: 16, gap: 8}, cardTitle: {fontSize: 20, fontWeight: '700'}, button: {padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12}, buttonText: {color: '#fff', fontWeight: '700'}});
