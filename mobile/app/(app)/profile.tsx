import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import type {FeatureAccess} from '../../src/api/contracts/product';
import type {LearnerProfileInput} from '../../src/api/contracts/learning';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {requestPurchaseHandoff} from '../../src/features/profile/purchaseHandoff';
import {deriveGrowthRank, featureUsage, nextStage, type RankMemory} from '../../src/features/profile/growthRank';
import {useLearnerProfile, useSaveLearnerProfile, useSetLearningLanguage} from '../../src/query/useLearnerProfile';
import {useLearningMemory} from '../../src/query/useHome';
import {useProductMe} from '../../src/query/useProductMe';
import {useTheme, type ThemePreference} from '../../src/theme/ThemeProvider';
import {PALETTE_PRESETS, tokensFor, type PalettePreset} from '../../src/theme/tokens';
import {CONTENT_MAX} from '../../src/theme/layout';
import {Button, Card, Label, PanelCopy} from '../../src/components/orena';
import {OrenaIcon} from '../../src/components/OrenaIcon';
import {ErrorState, LoadingState, SignedOutState} from '../../src/components/states';

/**
 * Ported from static/becoming/screens/profile.js and orena/profile.css.
 *
 * The reference is one settings card of titled groups -- Learning, Experience,
 * Appearance, Account, Session -- where every row has the same shape: a name, a
 * line explaining what it does, and its control. Beside it sits the growth-rank
 * frame. Native had bare stacked pill groups with no explanations, no account
 * facts, no session actions, no palette swatches, and an entitlement list that
 * reduced real usage numbers to one coarse word.
 *
 * Two things this screen must not do, and does not. The growth rank carries
 * `internal_growth_rank` and says on screen that it is not a CEFR level. And a
 * feature whose usage the server did not report says exactly that, rather than
 * rendering as zero remaining -- which would tell a learner they had run out
 * when the server simply did not say.
 */

const featureLabels: Record<string, string> = {
  'writing.evaluate': 'profile.feature_writing_evaluate', 'writing.improve': 'profile.feature_writing_improve',
  'library.grammar': 'profile.feature_library_grammar', 'dictionary.lookup': 'profile.feature_dictionary_lookup',
  'vocabulary.save': 'profile.feature_vocabulary_save', 'analytics.basic': 'profile.feature_analytics_basic',
  'analytics.advanced': 'profile.feature_analytics_advanced', 'practice.personalized': 'profile.feature_practice_personalized',
  'export.report': 'profile.feature_export_report',
};

/** `.o-set-group`: a titled block of rows. */
function SettingGroup({title, children}: {title: string; children: ReactNode}) {
  const {tokens} = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, {color: tokens.colors.heading}]}>{title}</Text>
      <View style={[styles.groupBody, {borderColor: tokens.colors.border}]}>{children}</View>
    </View>
  );
}

/**
 * `settingRow()`: name and explanation, then the control. The reference puts the
 * control to the right; on a phone it sits under its own label instead of being
 * squeezed beside it, which is what the breakpoint does to the same row.
 */
function SettingRow<T extends string>({label, desc, options, value, onChange, render}: {
  label: string; desc?: string; options: readonly T[]; value: T;
  onChange: (next: T) => void; render: (option: T) => string;
}) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.row, {borderTopColor: tokens.colors.border}]}>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, {color: tokens.colors.text}]}>{label}</Text>
        {desc ? <Text style={[styles.rowDesc, {color: tokens.colors.mutedText}]}>{desc}</Text> : null}
      </View>
      <View style={styles.rowControl}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${render(option)}`}
              accessibilityState={{selected}}
              onPress={() => onChange(option)}
              style={[styles.choice, {
                borderColor: selected ? tokens.colors.accent : tokens.colors.border,
                backgroundColor: selected ? tokens.colors.accentTint : tokens.colors.surface,
              }]}
            >
              <Text style={{color: selected ? tokens.colors.accent : tokens.colors.text, fontWeight: selected ? '600' : '400'}}>{render(option)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** `factRow()`: a row whose right side is a fact rather than a choice. */
function FactRow({label, value, note}: {label: string; value: string; note?: string}) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.row, styles.factRow, {borderTopColor: tokens.colors.border}]}>
      <Text style={[styles.rowLabel, {color: tokens.colors.text}]}>{label}</Text>
      <View style={styles.factValue}>
        <Text style={[styles.factStrong, {color: tokens.colors.heading}]}>{value}</Text>
        {note ? <Text style={[styles.rowDesc, {color: tokens.colors.faintText, textAlign: 'right'}]}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** `actionRow()`: a row that goes somewhere, ending in a chevron. */
function ActionRow({label, desc, onPress}: {label: string; desc?: string; onPress: () => void}) {
  const {tokens} = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({pressed}) => [styles.row, styles.actionRow, {borderTopColor: tokens.colors.border, backgroundColor: pressed ? tokens.colors.surfaceSunken : 'transparent'}]}
    >
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, {color: tokens.colors.text}]}>{label}</Text>
        {desc ? <Text style={[styles.rowDesc, {color: tokens.colors.mutedText}]}>{desc}</Text> : null}
      </View>
      <OrenaIcon name="arrowRight" size={18} color={tokens.colors.faintText} />
    </Pressable>
  );
}

/**
 * `themeChoice()`: each palette shows its own colours rather than its name in
 * the current one. The swatch is built from the token layer, so it is the accent
 * the learner would actually get.
 */
function PaletteChoice({preset, selected, onPress}: {preset: PalettePreset; selected: boolean; onPress: () => void}) {
  const {t} = useI18n();
  const {tokens, scheme} = useTheme();
  const swatch = tokensFor(scheme, preset);
  return (
    <Pressable
      accessibilityRole="radio" accessibilityLabel={t(`theme.${preset}` as never)} accessibilityState={{selected}}
      onPress={onPress}
      style={[styles.palette, {borderColor: selected ? swatch.colors.accent : tokens.colors.border, backgroundColor: tokens.colors.surface}]}
    >
      <View style={styles.swatch}>
        <View style={[styles.swatchChip, {backgroundColor: swatch.colors.accent}]} />
        <View style={[styles.swatchChip, {backgroundColor: swatch.colors.surfaceSunken, borderWidth: 1, borderColor: tokens.colors.border}]} />
        <View style={[styles.swatchChip, {backgroundColor: swatch.colors.roleNoun}]} />
      </View>
      <Text style={[styles.paletteName, {color: selected ? swatch.colors.accent : tokens.colors.text}]}>{t(`theme.${preset}` as never)}</Text>
    </Pressable>
  );
}

/** `growthRankFrame()`: the stage, the evidence behind it, and what is next. */
function RankFrame({memory}: {memory: RankMemory}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const rank = deriveGrowthRank(memory);
  const after = nextStage(rank.stage);
  return (
    <Card style={styles.rank}>
      <View style={styles.rankHead}>
        <View style={[styles.medallion, {borderColor: tokens.colors.accent, backgroundColor: tokens.colors.accentTint}]}>
          <Text style={[styles.medallionText, {color: tokens.colors.accent}]}>{String(rank.stageIndex + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.rankCopy}>
          <Label>{t('prof.rank_kicker' as never)}</Label>
          <Text style={[styles.rankStage, {color: tokens.colors.heading}]}>{t(`prof.rank_${rank.stage.toLowerCase()}` as never)}</Text>
        </View>
      </View>
      {/* Said plainly: a stage word beside a progress bar otherwise reads as a
          proficiency claim, which this is not. */}
      <PanelCopy>{t('prof.rank_note' as never)}</PanelCopy>
      <Text style={{color: tokens.colors.mutedText}}>
        {t('prof.rank_evidence' as never)
          .replace('{series}', String(rank.evidence.series))
          .replace('{wins}', String(rank.evidence.wins))
          .replace('{strengths}', String(rank.evidence.reliableStrengths))}
      </Text>
      <View style={[styles.track, {backgroundColor: tokens.colors.surfaceSunken}]}>
        <View style={[styles.trackFill, {width: `${Math.round(rank.progress * 100)}%`, backgroundColor: tokens.colors.accent}]} />
      </View>
      <Text style={[styles.rowDesc, {color: tokens.colors.faintText}]}>
        {after ? t('prof.rank_next' as never).replace('{next}', t(`prof.rank_${after.toLowerCase()}` as never)) : t('prof.rank_top' as never)}
      </Text>
    </Card>
  );
}

export default function ProfileScreen() {
  const {t} = useI18n();
  const {sessionCookie, session, signOut} = useSession();
  const {tokens, preference, setPreference, setPreset} = useTheme();
  const router = useRouter();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const signedOut = session.status === 'signed-out';
  const profile = useLearnerProfile(client, sessionCookie);
  const product = useProductMe(client, sessionCookie);
  const memory = useLearningMemory(client, sessionCookie);
  const save = useSaveLearnerProfile(client, sessionCookie);
  const language = useSetLearningLanguage(client, sessionCookie);
  const [draft, setDraft] = useState<LearnerProfileInput | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const value = draft ?? (profile.data ? {goal: profile.data.goal, style: profile.data.style, pinyin: profile.data.pinyin, native_language: profile.data.native_language, theme_preset: profile.data.theme_preset} : null);
  const activePreset = value?.theme_preset;
  useEffect(() => { if (activePreset) setPreset(activePreset); }, [activePreset, setPreset]);

  const shell = (body: ReactNode) => (
    <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('profile.title')}</Text>
      {body}
      <Button label={t('nav.back_home' as never)} onPress={() => router.replace('/(app)')} />
    </SafeAreaView>
  );

  if (signedOut || !sessionCookie) return shell(<SignedOutState message={t('profile.signed_out' as never)} />);
  if (!client || profile.isError || product.isError) return shell(<ErrorState message={t('profile.unavailable')} />);
  if (profile.isPending || product.isPending || !value) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('profile.title')}</Text>
        <Text style={{color: tokens.colors.text}}>{t('profile.loading')}</Text>
        <LoadingState lines={4} />
      </SafeAreaView>
    );
  }

  const update = <K extends keyof LearnerProfileInput>(key: K, item: LearnerProfileInput[K]) => setDraft({...value, [key]: item});
  const submit = () => {
    setNotice(null); setFailed(false);
    void save.mutateAsync(value)
      .then(() => setNotice(t('profile.saved')))
      .catch(() => { setFailed(true); setNotice(t('profile.save_failed')); });
  };
  const changeLanguage = (next: 'en' | 'zh') => {
    setNotice(null); setFailed(false);
    void language.mutateAsync(next)
      .then(() => setNotice(t('profile.language_saved')))
      .catch(() => { setFailed(true); setNotice(t('profile.language_failed')); });
  };
  const purchase = () => { if (requestPurchaseHandoff().status === 'unsupported') { setFailed(true); setNotice(t('profile.purchase_unavailable' as never)); } };

  const account = product.data;
  const learningLanguage = profile.data.language;
  const signedInLabel = session.status === 'authenticated' ? session.userLabel : t('prof.not_signed_in' as never);
  const viaGoogle = session.status === 'authenticated' && session.source === 'server';
  const planName = account.plan ? (account.plan.id === 'premium' ? t('profile.plan_premium' as never) : t('profile.plan_free' as never)) : t('profile.plan_unavailable' as never);
  const planNote = account.available === false ? '' : account.plan_state === 'active' ? t('profile.plan_active' as never) : t('profile.plan_default' as never);

  const usageText = (item: FeatureAccess) => {
    const usage = featureUsage(item);
    if (usage.kind === 'unavailable') return t('prof.usage_unavailable' as never);
    if (usage.kind === 'unlimited') return t('prof.unlimited' as never);
    if (usage.kind === 'exhausted') return t('prof.exhausted' as never).replace('{limit}', String(usage.limit));
    return t('prof.remaining' as never).replace('{remaining}', String(usage.remaining)).replace('{limit}', String(usage.limit));
  };

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('profile.title')}</Text>

      {/* `statusMarkup()`: a live region at the top of the form, not a note
          buried under the last control. */}
      <View accessibilityLiveRegion="polite" style={styles.status}>
        {notice ? <Text accessibilityRole={failed ? 'alert' : undefined} style={{color: failed ? tokens.colors.danger : tokens.colors.positive}}>{notice}</Text> : null}
      </View>

      <RankFrame memory={(memory.data ?? {}) as RankMemory} />

      <Card style={styles.set}>
        <SettingGroup title={t('prof.group_learning' as never)}>
          <SettingRow
            label={t('profile.learning_language')} desc={t('prof.learning_language_desc' as never)}
            options={['en', 'zh'] as const} value={learningLanguage}
            onChange={changeLanguage} render={(item) => t(`language.${item}` as never)}
          />
          <SettingRow
            label={t('profile.native_language')} desc={t('prof.interface_language_desc' as never)}
            options={['vi', 'en', 'zh'] as const} value={value.native_language}
            onChange={(item) => update('native_language', item)} render={(item) => t(`language.${item}` as never)}
          />
          <SettingRow
            label={t('profile.goal')} desc={t('prof.goal_desc' as never)}
            options={['everyday', 'work', 'exam', 'voice'] as const} value={value.goal}
            onChange={(item) => update('goal', item)} render={(item) => t(`goal.${item}` as never)}
          />
        </SettingGroup>

        <SettingGroup title={t('prof.group_experience' as never)}>
          <SettingRow
            label={t('profile.style')} desc={t('prof.style_desc' as never)}
            options={['guided', 'examples', 'concise', 'deep'] as const} value={value.style}
            onChange={(item) => update('style', item)} render={(item) => t(`style.${item}` as never)}
          />
          {/* Pinyin is a Chinese-only setting. The reference hides the row for an
              English learner rather than showing a control that does nothing. */}
          {learningLanguage === 'zh' ? (
            <SettingRow
              label={t('profile.pinyin')} desc={t('prof.pinyin_desc' as never)}
              options={['auto', 'on', 'off'] as const} value={value.pinyin}
              onChange={(item) => update('pinyin', item)} render={(item) => item}
            />
          ) : null}
        </SettingGroup>

        <SettingGroup title={t('prof.group_appearance' as never)}>
          <SettingRow
            label={t('prof.mode' as never)} desc={t('prof.mode_desc' as never)}
            options={['light', 'dark', 'system'] as const satisfies readonly ThemePreference[]}
            value={preference} onChange={setPreference} render={(item) => t(`theme.${item}` as never)}
          />
          <View style={[styles.row, styles.block, {borderTopColor: tokens.colors.border}]}>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowLabel, {color: tokens.colors.text}]}>{t('prof.palette' as never)}</Text>
              <Text style={[styles.rowDesc, {color: tokens.colors.mutedText}]}>{t('prof.palette_desc' as never)}</Text>
            </View>
            <View style={styles.paletteGrid}>
              {PALETTE_PRESETS.map((preset) => (
                <PaletteChoice key={preset} preset={preset} selected={value.theme_preset === preset} onPress={() => update('theme_preset', preset)} />
              ))}
            </View>
            <Text style={[styles.rowDesc, {color: tokens.colors.faintText}]}>{t('prof.theme_status' as never)}</Text>
          </View>
        </SettingGroup>

        <SettingGroup title={t('prof.group_account' as never)}>
          <FactRow label={t('prof.name' as never)} value={signedInLabel} note={viaGoogle ? t('prof.from_google' as never) : undefined} />
          <FactRow label={t('prof.sign_in' as never)} value={viaGoogle ? t('prof.sign_in_google' as never) : t('prof.sign_in_local' as never)} />
          <FactRow label={t('prof.plan' as never)} value={planName} note={planNote || undefined} />
          <View style={[styles.row, styles.block, {borderTopColor: tokens.colors.border}]}>
            <Label>{t('profile.entitlements' as never)}</Label>
            {Object.entries(account.features).map(([key, item]) => (
              <View key={key} style={styles.feature}>
                <Text style={[styles.featureName, {color: tokens.colors.text}]}>{t((featureLabels[key] ?? 'profile.feature_unknown') as never)}</Text>
                <Text style={[styles.rowDesc, {color: item.entitlement_state === 'exhausted' ? tokens.colors.attention : tokens.colors.mutedText}]}>{usageText(item)}</Text>
              </View>
            ))}
            <Button label={t('profile.purchase' as never)} variant="outline" compact onPress={purchase} />
          </View>
        </SettingGroup>

        <SettingGroup title={t('prof.group_session' as never)}>
          <ActionRow label={t('prof.switch_account' as never)} onPress={signOut} />
          <ActionRow label={t('prof.sign_out' as never)} onPress={signOut} />
        </SettingGroup>
      </Card>

      <Button label={save.isPending ? t('profile.saving') : t('profile.save')} disabled={save.isPending || language.isPending} onPress={submit} />

      <Card style={styles.set}>
        <View style={styles.about}>
          <Text style={[styles.groupTitle, {color: tokens.colors.heading}]}>{t('prof.about_title' as never)}</Text>
          <PanelCopy>{t('prof.about_body' as never)}</PanelCopy>
          <PanelCopy>{t('prof.about_1' as never)}</PanelCopy>
          <PanelCopy>{t('prof.about_2' as never)}</PanelCopy>
          <PanelCopy>{t('prof.about_3' as never)}</PanelCopy>
        </View>
        <SettingGroup title={t('prof.quick_links' as never)}>
          <ActionRow label={t('prof.link_journey' as never)} desc={t('prof.link_journey_note' as never)} onPress={() => router.push('/(app)/journey')} />
          <ActionRow label={t('prof.link_library' as never)} desc={t('prof.link_library_note' as never)} onPress={() => router.push('/(app)/library')} />
        </SettingGroup>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 16, gap: 14, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  title: {fontSize: 20, fontWeight: '700'},
  status: {minHeight: 22},

  // `.o-card.o-set`: one card holding every group.
  set: {padding: 16, gap: 18},
  group: {gap: 8},
  groupTitle: {fontSize: 17, fontWeight: '700'},
  groupBody: {borderRadius: 12, borderWidth: 1, overflow: 'hidden'},

  // `.o-set-row`: copy then control, divided from the row above.
  row: {paddingVertical: 12, paddingHorizontal: 12, gap: 8, borderTopWidth: 1},
  block: {gap: 12},
  rowCopy: {gap: 2},
  rowLabel: {fontSize: 15, fontWeight: '600'},
  rowDesc: {fontSize: 13, lineHeight: 18},
  rowControl: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  choice: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center'},

  factRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'},
  factValue: {alignItems: 'flex-end', gap: 2, flexShrink: 1},
  factStrong: {fontSize: 15, fontWeight: '600', textAlign: 'right'},

  actionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52},

  paletteGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  palette: {flexGrow: 1, minWidth: 140, borderWidth: 1, borderRadius: 12, padding: 10, gap: 8},
  swatch: {flexDirection: 'row', gap: 5},
  swatchChip: {width: 22, height: 22, borderRadius: 999},
  paletteName: {fontSize: 14, fontWeight: '600'},

  feature: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  featureName: {fontSize: 14, fontWeight: '600', flex: 1, minWidth: 0},

  rank: {padding: 16, gap: 10},
  rankHead: {flexDirection: 'row', alignItems: 'center', gap: 12},
  medallion: {width: 48, height: 48, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  medallionText: {fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums']},
  rankCopy: {flex: 1, gap: 2},
  rankStage: {fontSize: 20, fontWeight: '700'},
  track: {height: 6, borderRadius: 999, overflow: 'hidden'},
  trackFill: {height: '100%', borderRadius: 999},

  about: {gap: 8},
});
