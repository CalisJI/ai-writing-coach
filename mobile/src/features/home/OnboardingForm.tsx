import * as React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useI18n} from '../../i18n/I18nProvider';
import {useTheme} from '../../theme/ThemeProvider';
import type {LearnerProfileInput} from '../../api/contracts/learning';

const goals: LearnerProfileInput['goal'][] = ['everyday', 'work', 'exam', 'voice'];
const styles: LearnerProfileInput['style'][] = ['guided', 'examples', 'concise', 'deep'];
const languages: LearnerProfileInput['native_language'][] = ['vi', 'en', 'zh'];

export function OnboardingForm({onSubmit, isSaving, failed}: {onSubmit: (profile: LearnerProfileInput, learningLanguage: 'en' | 'zh') => void; isSaving: boolean; failed: boolean}) {
  const {t} = useI18n(); const {tokens} = useTheme();
  const [goal, setGoal] = React.useState<LearnerProfileInput['goal']>('everyday');
  const [style, setStyle] = React.useState<LearnerProfileInput['style']>('guided');
  const [nativeLanguage, setNativeLanguage] = React.useState<LearnerProfileInput['native_language']>('en');
  const [learningLanguage, setLearningLanguage] = React.useState<'en' | 'zh'>('en');
  const choices = <T extends string>(items: T[], selected: T, set: (value: T) => void, label: (value: T) => string) => (
    <View style={formStyles.choiceGroup}>{items.map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{selected: selected === value}} onPress={() => set(value)} style={[formStyles.choice, {borderColor: selected === value ? tokens.colors.accent : tokens.colors.mutedText, backgroundColor: selected === value ? tokens.colors.surface : 'transparent'}]}><Text style={{color: tokens.colors.text}}>{label(value)}</Text></Pressable>)}</View>
  );
  return <ScrollView contentContainerStyle={[formStyles.container, {backgroundColor: tokens.colors.background}]}>
    <Text accessibilityRole="header" style={[formStyles.title, {color: tokens.colors.heading}]}>{t('onboarding.title')}</Text><Text style={[formStyles.body, {color: tokens.colors.mutedText}]}>{t('onboarding.body')}</Text>
    <Text style={[formStyles.label, {color: tokens.colors.text}]}>{t('onboarding.goal')}</Text>{choices(goals, goal, setGoal, (v) => t(`goal.${v}` as never))}
    <Text style={[formStyles.label, {color: tokens.colors.text}]}>{t('onboarding.style')}</Text>{choices(styles, style, setStyle, (v) => t(`style.${v}` as never))}
    <Text style={[formStyles.label, {color: tokens.colors.text}]}>{t('onboarding.native_language')}</Text>{choices(languages, nativeLanguage, setNativeLanguage, (v) => t(`language.${v}` as never))}
    <Text style={[formStyles.label, {color: tokens.colors.text}]}>{t('onboarding.learning_language')}</Text>{choices(['en', 'zh'], learningLanguage, setLearningLanguage, (v) => t(`language.${v}` as never))}
    {failed && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('onboarding.save_failed')}</Text>}
    <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => onSubmit({goal, style, pinyin: 'auto', native_language: nativeLanguage, theme_preset: 'editorial'}, learningLanguage)} style={[formStyles.button, {backgroundColor: tokens.colors.accent, opacity: isSaving ? 0.6 : 1}]}><Text style={formStyles.buttonText}>{isSaving ? t('onboarding.saving') : t('onboarding.save')}</Text></Pressable>
  </ScrollView>;
}

const formStyles = StyleSheet.create({container: {padding: 24, gap: 12, flexGrow: 1}, title: {fontSize: 20, fontWeight: '700'}, body: {fontSize: 15, lineHeight: 24}, label: {fontSize: 15, fontWeight: '700', marginTop: 12}, choiceGroup: {gap: 8}, choice: {borderWidth: 1, borderRadius: 15, padding: 14}, button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 12}, buttonText: {fontSize: 14, fontWeight: '700'}});
