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
import {deriveGrowthRank, featureUsage, type RankMemory} from '../../src/features/profile/growthRank';
import {useLearnerProfile, useSaveLearnerProfile, useSetLearningLanguage} from '../../src/query/useLearnerProfile';
import {useLearningMemory} from '../../src/query/useHome';
import {useProductMe} from '../../src/query/useProductMe';
import {useTheme, type ThemePreference} from '../../src/theme/ThemeProvider';
import {PALETTE_PRESETS, tokensFor, type PalettePreset} from '../../src/theme/tokens';
import {CONTENT_MAX} from '../../src/theme/layout';
import {Button, Card, PanelCopy} from '../../src/components/orena';
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

/**
 * `.o-set-group` at the phone breakpoint: "the mobile reference stacks labelled
 * groups rather than one long card: the title steps outside and the rows become
 * their own rounded block" -- orena/profile.css's own comment. So there is no
 * outer settings card here, and the title is a small uppercase label rather than
 * a heading.
 */
function SettingGroup({title, children}: {title: string; children: ReactNode}) {
  const {tokens} = useTheme();
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, {color: tokens.colors.mutedText}]}>{title}</Text>
      <Card style={styles.groupBody}>{children}</Card>
    </View>
  );
}

/**
 * `settingRow()`: name and explanation, then the control. The reference puts the
 * control to the right; on a phone it sits under its own label instead of being
 * squeezed beside it, which is what the breakpoint does to the same row.
 */
function SettingRow<T extends string>({label, desc, options, value, onChange, render, first}: {
  label: string; desc?: string; options: readonly T[]; value: T;
  onChange: (next: T) => void; render: (option: T) => string; first?: boolean;
}) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.row, !first && {borderTopWidth: 1, borderTopColor: tokens.colors.border}]}>
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
function FactRow({label, value, note, first}: {label: string; value: string; note?: string; first?: boolean}) {
  const {tokens} = useTheme();
  return (
    <View style={[styles.row, !first && {borderTopWidth: 1, borderTopColor: tokens.colors.border}]}>
      <Text style={[styles.rowLabel, {color: tokens.colors.text}]}>{label}</Text>
      {/* `.o-set-value{justify-items:start;text-align:left}` on a phone -- the
          value sits under its label rather than being pushed to the far edge. */}
      <View style={styles.factValue}>
        <Text style={[styles.factStrong, {color: tokens.colors.heading}]}>{value}</Text>
        {note ? <Text style={[styles.rowDesc, {color: tokens.colors.faintText}]}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** `actionRow()`: a row that goes somewhere, ending in a chevron. */
function ActionRow({label, desc, onPress, first}: {label: string; desc?: string; onPress: () => void; first?: boolean}) {
  const {tokens} = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({pressed}) => [styles.row, styles.actionRow, !first && {borderTopWidth: 1, borderTopColor: tokens.colors.border}, {backgroundColor: pressed ? tokens.colors.surfaceSunken : 'transparent'}]}
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
      style={[styles.palette, {
        borderColor: selected ? swatch.colors.accent : tokens.colors.border,
        backgroundColor: selected ? swatch.colors.accentTint : tokens.colors.surface,
      }]}
    >
      {/* The reference's swatch is three chips of the palette itself, so the
          choice is made from the colours rather than from four words. */}
      <View style={[styles.swatch, {borderColor: tokens.colors.border, backgroundColor: swatch.colors.surfaceSunken}]}>
        <View style={[styles.swatchChip, {backgroundColor: swatch.colors.accent}]} />
        <View style={[styles.swatchChip, {backgroundColor: swatch.colors.roleNoun}]} />
        <View style={[styles.swatchChip, {backgroundColor: swatch.colors.borderStrong}]} />
      </View>
      <View style={styles.paletteCopy}>
        <Text style={[styles.paletteName, {color: selected ? swatch.colors.accent : tokens.colors.text}]}>{t(`theme.${preset}` as never)}</Text>
        <Text style={[styles.rowDesc, {color: tokens.colors.mutedText}]}>{t(`theme.${preset}_desc` as never)}</Text>
      </View>
    </Pressable>
  );
}

/**
 * `growthRankFrame()`: the medallion, the stage, and -- in the reference's own
 * words -- that this is "a motivational frame built from repeated Writing
 * evidence. It is not a CEFR, HSK, TOEIC or IELTS rank." The evidence line and
 * the next-proof line are what make that claim checkable.
 */
function RankFrame({memory}: {memory: RankMemory}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const rank = deriveGrowthRank(memory);
  return (
    <Card style={styles.rank}>
      <View style={styles.rankHead}>
        <View style={[styles.medallion, {borderColor: tokens.colors.accent, backgroundColor: tokens.colors.accentTint}]}>
          <Text style={[styles.medallionText, {color: tokens.colors.accent}]}>{String(rank.stageIndex + 1).padStart(2, '0')}</Text>
        </View>
        <View style={styles.rankCopy}>
          <Text style={[styles.rankKicker, {color: tokens.colors.mutedText}]}>{t('prof.rank_kicker' as never)}</Text>
          <Text style={[styles.rankStage, {color: tokens.colors.heading}]}>{t(`prof.rank_${rank.stage.toLowerCase()}` as never)}</Text>
        </View>
      </View>
      <PanelCopy>{t('prof.rank_note' as never)}</PanelCopy>
      <View style={[styles.rankRule, {backgroundColor: tokens.colors.border}]} />
      <Text style={{color: tokens.colors.text}}>
        {t('prof.rank_evidence' as never)
          .replace('{strengths}', String(rank.evidence.reliableStrengths))
          .replace('{wins}', String(rank.evidence.wins))
          .replace('{series}', String(rank.evidence.series))}
      </Text>
      <View style={[styles.rankRule, {backgroundColor: tokens.colors.border}]} />
      <Text style={[styles.rowDesc, {color: tokens.colors.faintText}]}>
        {t('prof.rank_next' as never).replace('{next}', t(`prof.rank_next_${rank.stage.toLowerCase()}` as never))}
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
      {/* `.o-page-heading{display:none}` below 720px: the top bar already names
          the route, so a heading here would be the same word twice. */}

      {/* `statusMarkup()`: a live region above the form. */}
      <View accessibilityLiveRegion="polite" style={styles.status}>
        {notice ? <Text accessibilityRole={failed ? 'alert' : undefined} style={{color: failed ? tokens.colors.danger : tokens.colors.positive}}>{notice}</Text> : null}
      </View>

      <RankFrame memory={(memory.data ?? {}) as RankMemory} />

      <SettingGroup title={t('prof.group_learning' as never)}>
        <SettingRow
          first
          label={t('prof.learning_language' as never)} desc={t('prof.learning_language_desc' as never)}
          options={['en', 'zh'] as const} value={learningLanguage}
          onChange={changeLanguage} render={(item) => t(`language.${item}` as never)}
        />
        <SettingRow
          label={t('prof.interface_language' as never)} desc={t('prof.interface_language_desc' as never)}
          options={['vi', 'en', 'zh'] as const} value={value.native_language}
          onChange={(item) => update('native_language', item)} render={(item) => t(`language.${item}` as never)}
        />
        <SettingRow
          label={t('prof.current_goal' as never)} desc={t('prof.current_goal_desc' as never)}
          options={['everyday', 'work', 'exam', 'voice'] as const} value={value.goal}
          onChange={(item) => update('goal', item)} render={(item) => t(`goal.${item}` as never)}
        />
      </SettingGroup>

      <SettingGroup title={t('prof.group_experience' as never)}>
        <SettingRow
          first
          label={t('prof.guidance_style' as never)} desc={t('prof.guidance_style_desc' as never)}
          options={['guided', 'examples', 'concise', 'deep'] as const} value={value.style}
          onChange={(item) => update('style', item)} render={(item) => t(`style.${item}` as never)}
        />
        {/* Pinyin is a Chinese-only setting; the reference omits the row for an
            English learner rather than showing a control that does nothing. */}
        {learningLanguage === 'zh' ? (
          <SettingRow
            label={t('profile.pinyin')} options={['auto', 'on', 'off'] as const} value={value.pinyin}
            onChange={(item) => update('pinyin', item)} render={(item) => item}
          />
        ) : null}
      </SettingGroup>

      <SettingGroup title={t('prof.group_appearance' as never)}>
        <SettingRow
          first
          label={t('prof.mode' as never)} desc={t('prof.mode_desc' as never)}
          options={['light', 'dark', 'system'] as const satisfies readonly ThemePreference[]}
          value={preference} onChange={setPreference} render={(item) => t(`theme.${item}` as never)}
        />
        <View style={[styles.row, styles.block, {borderTopWidth: 1, borderTopColor: tokens.colors.border}]}>
          <View style={styles.rowCopy}>
            <Text style={[styles.rowLabel, {color: tokens.colors.text}]}>{t('prof.palette' as never)}</Text>
            <Text style={[styles.rowDesc, {color: tokens.colors.mutedText}]}>{t('prof.palette_desc' as never)}</Text>
          </View>
          {/* `.theme-choice-grid{grid-template-columns:minmax(0,1fr)}` on a phone. */}
          <View style={styles.paletteGrid}>
            {PALETTE_PRESETS.map((preset) => (
              <PaletteChoice key={preset} preset={preset} selected={value.theme_preset === preset} onPress={() => update('theme_preset', preset)} />
            ))}
          </View>
          <Text style={[styles.rowDesc, {color: tokens.colors.faintText}]}>{t('prof.theme_status' as never)}</Text>
        </View>
      </SettingGroup>

      <SettingGroup title={t('prof.group_account' as never)}>
        <FactRow first label={t('prof.name' as never)} value={signedInLabel} note={viaGoogle ? t('prof.from_google' as never) : undefined} />
        <FactRow label={t('prof.sign_in' as never)} value={viaGoogle ? t('prof.sign_in_google' as never) : t('prof.sign_in_local' as never)} />
        <FactRow label={t('prof.plan' as never)} value={planName} note={planNote || undefined} />
        <View style={[styles.row, styles.block, {borderTopWidth: 1, borderTopColor: tokens.colors.border}]}>
          {account.available === false ? (
            <Text style={{color: tokens.colors.mutedText}}>{t('prof.plan_unavailable' as never)}</Text>
          ) : (
            Object.entries(account.features).map(([key, item]) => (
              // `accountPlanMarkup()`: one line per feature, carrying the usage
              // the server actually reported.
              <View key={key} style={styles.feature}>
                <Text style={[styles.featureName, {color: tokens.colors.text}]}>{t((featureLabels[key] ?? 'profile.feature_unknown') as never)}</Text>
                <Text style={[styles.rowDesc, {color: item.entitlement_state === 'exhausted' ? tokens.colors.attention : tokens.colors.mutedText}]}>{usageText(item)}</Text>
              </View>
            ))
          )}
          <Button label={t('profile.purchase' as never)} variant="outline" compact onPress={purchase} />
        </View>
      </SettingGroup>

      {/* The reference shows Session only to a signed-in learner. */}
      {viaGoogle ? (
        <SettingGroup title={t('prof.group_session' as never)}>
          <ActionRow first label={t('prof.switch_account' as never)} onPress={signOut} />
          <ActionRow label={t('prof.sign_out' as never)} onPress={signOut} />
        </SettingGroup>
      ) : null}

      <Button label={save.isPending ? t('profile.saving') : t('profile.save')} disabled={save.isPending || language.isPending} onPress={submit} />

      {/* `.o-about`: an icon tile, what these settings do and do not touch, then
          the links that have a destination in this product. */}
      <Card style={styles.about}>
        <View style={styles.aboutHead}>
          <View style={[styles.aboutTile, {borderColor: tokens.depth.badgeEdge, backgroundColor: tokens.colors.surfaceSunken}]}>
            <OrenaIcon name="profile" size={18} color={tokens.colors.accent} />
          </View>
          <Text style={[styles.aboutTitle, {color: tokens.colors.heading}]}>{t('prof.about_title' as never)}</Text>
        </View>
        <PanelCopy>{t('prof.about_body' as never)}</PanelCopy>
        {(['prof.about_1', 'prof.about_2', 'prof.about_3'] as const).map((key) => (
          <View key={key} style={styles.aboutPoint}>
            <OrenaIcon name="check" size={16} color={tokens.colors.positive} />
            <Text style={[styles.aboutPointText, {color: tokens.colors.mutedText}]}>{t(key as never)}</Text>
          </View>
        ))}
      </Card>

      <SettingGroup title={t('prof.quick_links' as never)}>
        <ActionRow first label={t('prof.link_journey' as never)} desc={t('prof.link_journey_note' as never)} onPress={() => router.push('/(app)/journey')} />
        <ActionRow label={t('prof.link_library' as never)} desc={t('prof.link_library_note' as never)} onPress={() => router.push('/(app)/library')} />
        <ActionRow label={t('prof.setup_again' as never)} desc={t('prof.setup_again_desc' as never)} onPress={() => router.push('/(app)')} />
      </SettingGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // `.o-set{display:grid;gap:20px;border:0;background:none;box-shadow:none}` --
  // on a phone there is no outer settings card, only stacked groups.
  container: {flexGrow: 1, padding: 16, gap: 20, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  // The degraded shells still name themselves; only the full form defers to
  // the top bar, as the reference does.
  title: {fontSize: 20, fontWeight: '700'},
  status: {minHeight: 22},

  // `.o-set-group{padding:0;gap:7px}` with its title outside the block.
  group: {gap: 7},
  // `.o-set-title`: label size, 600, .08em tracking, uppercase, muted.
  groupTitle: {fontSize: 13, fontWeight: '600', letterSpacing: 1.04, textTransform: 'uppercase', paddingHorizontal: 2},
  // `.o-set-body{padding:6px 16px 8px}` and it is the card.
  groupBody: {paddingTop: 6, paddingHorizontal: 16, paddingBottom: 8},

  // `.o-set-row{grid-template-columns:minmax(0,1fr);gap:11px;padding:15px 0}` at
  // the phone width: label, explanation, then the control beneath them.
  row: {paddingVertical: 15, gap: 11},
  block: {gap: 12},
  rowCopy: {gap: 5},
  rowLabel: {fontSize: 15, fontWeight: '600'},
  rowDesc: {fontSize: 13, lineHeight: 18},
  // `.o-set-control{justify-content:stretch;--o-set-control-w:100%}`
  rowControl: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  choice: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center'},

  // `.o-set-value{justify-items:start;text-align:left}` on a phone.
  factValue: {gap: 2},
  factStrong: {fontSize: 15, fontWeight: '600'},

  // `.o-set-action{grid-template-columns:minmax(0,1fr) auto}`
  actionRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},

  // `.theme-choice-grid{grid-template-columns:minmax(0,1fr)}` on a phone.
  paletteGrid: {gap: 8},
  palette: {flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 15, padding: 12},
  swatch: {flexDirection: 'row', alignItems: 'center', gap: 3, padding: 6, borderRadius: 10, borderWidth: 1},
  swatchChip: {width: 10, height: 18, borderRadius: 3},
  paletteCopy: {flex: 1, gap: 2},
  paletteName: {fontSize: 15, fontWeight: '600'},

  feature: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  featureName: {fontSize: 14, fontWeight: '600', flex: 1, minWidth: 0},

  rank: {padding: 16, gap: 12},
  rankHead: {flexDirection: 'row', alignItems: 'center', gap: 12},
  medallion: {width: 48, height: 48, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center'},
  medallionText: {fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums']},
  rankCopy: {flex: 1, gap: 2},
  rankKicker: {fontSize: 12, fontWeight: '600', letterSpacing: 0.96, textTransform: 'uppercase'},
  rankStage: {fontSize: 22, fontWeight: '700'},
  rankRule: {height: 1},

  about: {padding: 16, gap: 10},
  aboutHead: {flexDirection: 'row', alignItems: 'center', gap: 10},
  aboutTile: {width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  aboutTitle: {fontSize: 17, fontWeight: '700', flex: 1},
  aboutPoint: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  aboutPointText: {flex: 1, fontSize: 13, lineHeight: 18},
});
