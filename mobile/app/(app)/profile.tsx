import {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import type {FeatureAccess} from '../../src/api/contracts/product';
import type {LearnerProfileInput} from '../../src/api/contracts/learning';
import {useSession} from '../../src/auth/SessionHarness';
import {LocaleSelector} from '../../src/components/LocaleSelector';
import {ThemeSelector} from '../../src/components/ThemeSelector';
import {useI18n} from '../../src/i18n/I18nProvider';
import {requestPurchaseHandoff} from '../../src/features/profile/purchaseHandoff';
import {useLearnerProfile, useSaveLearnerProfile, useSetLearningLanguage} from '../../src/query/useLearnerProfile';
import {useProductMe} from '../../src/query/useProductMe';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {Button, Chip, Label, Panel} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/profile.js and orena/profile.css.
 *
 * The web is one settings card (`.o-card.o-set`) holding each preference
 * group in sequence, plus a separate entitlements/about card -- this keeps
 * that two-panel shape rather than a Panel per group.
 */

const featureLabels: Record<string, string> = {
  'writing.evaluate': 'profile.feature_writing_evaluate', 'writing.improve': 'profile.feature_writing_improve', 'library.grammar': 'profile.feature_library_grammar', 'dictionary.lookup': 'profile.feature_dictionary_lookup', 'vocabulary.save': 'profile.feature_vocabulary_save', 'analytics.basic': 'profile.feature_analytics_basic', 'analytics.advanced': 'profile.feature_analytics_advanced', 'practice.personalized': 'profile.feature_practice_personalized', 'export.report': 'profile.feature_export_report',
};

function accessCopy(t: (id: never) => string, item: FeatureAccess): string {
  if (item.usage_state !== 'known' || item.entitlement_state === 'disabled' || item.entitlement_state === 'unavailable') return t('profile.entitlement_unavailable' as never);
  if (item.entitlement_state === 'exhausted') return t('profile.entitlement_exhausted' as never);
  return t('profile.entitlement_enabled' as never);
}

export default function ProfileScreen() {
  const {t} = useI18n(); const {sessionCookie, session} = useSession(); const {tokens, setPreset} = useTheme(); const router = useRouter();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const signedOut = session.status === 'signed-out'; const profile = useLearnerProfile(client, sessionCookie); const product = useProductMe(client, sessionCookie); const save = useSaveLearnerProfile(client, sessionCookie); const language = useSetLearningLanguage(client, sessionCookie);
  const [draft, setDraft] = useState<LearnerProfileInput | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const value = draft ?? (profile.data ? {goal: profile.data.goal, style: profile.data.style, pinyin: profile.data.pinyin, native_language: profile.data.native_language, theme_preset: profile.data.theme_preset} : null);
  const activePreset = value?.theme_preset;
  useEffect(() => { if (activePreset) setPreset(activePreset); }, [activePreset, setPreset]);
  if (signedOut || !sessionCookie) return <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('profile.title')}</Text><Text accessibilityRole="alert" style={{color: tokens.colors.mutedText}}>{t('profile.signed_out' as never)}</Text><Button label={t('nav.back_home' as never)} onPress={() => router.replace('/(app)')} /></SafeAreaView>;
  if (!client || profile.isError || product.isError) return <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('profile.title')}</Text><Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('profile.unavailable')}</Text></SafeAreaView>;
  if (profile.isPending || product.isPending || !value) return <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('profile.loading')}</Text></SafeAreaView>;
  const choose = <T extends string>(label: string, items: readonly T[], selected: T, update: (item: T) => void, translate: (item: T) => string) => (
    <View style={styles.group}>
      <Label>{label}</Label>
      <View style={styles.choices}>
        {items.map((item) => (
          <Pressable key={item} accessibilityRole="radio" accessibilityLabel={`${label}: ${translate(item)}`} accessibilityState={{selected: selected === item}} onPress={() => update(item)} style={[styles.choice, {borderColor: selected === item ? tokens.colors.accent : tokens.colors.border, backgroundColor: selected === item ? tokens.colors.surfaceSunken : 'transparent'}]}>
            <Text style={{color: tokens.colors.text, fontWeight: selected === item ? '700' : '400'}}>{translate(item)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
  const update = <K extends keyof LearnerProfileInput>(key: K, item: LearnerProfileInput[K]) => setDraft({...value, [key]: item}); const submit = () => { setNotice(null); void save.mutateAsync(value).then(() => setNotice(t('profile.saved'))).catch(() => setNotice(t('profile.save_failed'))); }; const changeLanguage = (next: 'en' | 'zh') => { setNotice(null); void language.mutateAsync(next).then(() => setNotice(t('profile.language_saved'))).catch(() => setNotice(t('profile.language_failed'))); }; const purchase = () => { if (requestPurchaseHandoff().status === 'unsupported') setNotice(t('profile.purchase_unavailable' as never)); };
  const account = product.data;
  const planName = account.plan ? (account.plan.id === 'premium' ? t('profile.plan_premium' as never) : t('profile.plan_free' as never)) : t('profile.plan_unavailable' as never);
  const planState = account.available === false ? t('profile.plan_unavailable' as never) : account.plan_state === 'active' ? t('profile.plan_active' as never) : account.plan_state === 'unknown' ? t('profile.plan_unknown' as never) : t('profile.plan_default' as never);
  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('profile.title')}</Text>

      <Panel>
        <View accessibilityRole="summary">
          <Label>{t('profile.entitlements' as never)}</Label>
          <Text style={[styles.planName, {color: tokens.colors.heading}]}>{planName}</Text>
          <Text style={{color: tokens.colors.mutedText}}>{planState}</Text>
          {Object.entries(account.features).map(([key, item]) => (
            <View key={key} style={styles.feature}>
              <Text style={[styles.featureName, {color: tokens.colors.text}]}>{t((featureLabels[key] ?? 'profile.feature_unknown') as never)}</Text>
              <Chip>{accessCopy(t, item)}</Chip>
            </View>
          ))}
        </View>
        <Button label={t('profile.purchase' as never)} variant="outline" onPress={purchase} />
      </Panel>

      <Panel>
        {choose(t('profile.goal'), ['everyday', 'work', 'exam', 'voice'], value.goal, (item) => update('goal', item as LearnerProfileInput['goal']), (item) => t(`goal.${item}` as never))}
        {choose(t('profile.style'), ['guided', 'examples', 'concise', 'deep'], value.style, (item) => update('style', item as LearnerProfileInput['style']), (item) => t(`style.${item}` as never))}
        {choose(t('profile.native_language'), ['vi', 'en', 'zh'], value.native_language, (item) => update('native_language', item as LearnerProfileInput['native_language']), (item) => t(`language.${item}` as never))}
        {choose(t('profile.pinyin'), ['auto', 'on', 'off'], value.pinyin, (item) => update('pinyin', item as LearnerProfileInput['pinyin']), (item) => item)}
        {choose(t('profile.theme'), ['editorial', 'sage', 'clay', 'blueprint'], value.theme_preset, (item) => update('theme_preset', item as LearnerProfileInput['theme_preset']), (item) => item)}
        {choose(t('profile.learning_language'), ['en', 'zh'], profile.data.language, changeLanguage, (item) => t(`language.${item}` as never))}
      </Panel>

      <LocaleSelector />
      <ThemeSelector />
      {notice && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text>}
      <Button label={save.isPending ? t('profile.saving') : t('profile.save')} disabled={save.isPending || language.isPending} onPress={submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  title: {fontSize: 20, fontWeight: '700'},
  group: {gap: 8, marginTop: 4},
  choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  choice: {borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10},
  planName: {fontSize: 17, fontWeight: '700', marginTop: 4},
  feature: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10},
  featureName: {fontWeight: '600', flex: 1, minWidth: 0},
});
