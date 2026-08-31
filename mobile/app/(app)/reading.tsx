import {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {MAX_CONTENT_WIDTH} from '../../src/theme/tokens';
import {useContextualDictionary, useCreateReadingSession, useSaveLibraryVocabulary, useSubmitReadingAnswers} from '../../src/query/useReadingLibrary';
import {dictionaryWordToLibraryInput} from '../../src/features/reading/readingLibraryHandoff';
import type {ReadingSession} from '../../src/api/contracts/reading';

export function ReadingSaveFailureNotice({visible}: {visible: boolean}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return visible ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.save_failed')}</Text> : null;
}

export function ReadingQuestionList({session, answers, onAnswer}: {session: ReadingSession; answers: number[]; onAnswer: (questionIndex: number, optionIndex: number) => void}) {
  const {tokens} = useTheme();
  return <>{session.questions.map((question, questionIndex) => <View key={question.id} style={[styles.card, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border}]}><Text style={{color: tokens.colors.text}}>{question.question}</Text>{question.options.map((option, optionIndex) => <Pressable key={`${question.id}-${optionIndex}`} accessibilityRole="radio" accessibilityState={{selected: answers[questionIndex] === optionIndex}} onPress={() => onAnswer(questionIndex, optionIndex)} style={styles.option}><Text style={{color: tokens.colors.text}}>{answers[questionIndex] === optionIndex ? '◉ ' : '○ '}{option}</Text></Pressable>)}</View>)}</>;
}

export default function ReadingScreen() {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState('');
  const client = useMemo(() => {
    try { return createConfiguredApiClient(); } catch { return null; }
  }, []);
  const create = useCreateReadingSession(client, sessionCookie);
  const submit = useSubmitReadingAnswers(client, sessionCookie, session?.id);
  const dictionary = useContextualDictionary(client, sessionCookie);
  const save = useSaveLibraryVocabulary(client, sessionCookie);

  if (!session) {
    return (
      <View style={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('reading.title')}</Text>
        <Text style={{color: tokens.colors.mutedText}}>{t('reading.body')}</Text>
        {create.isError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.unavailable')}</Text>}
        <Pressable accessibilityRole="button" disabled={create.isPending || !sessionCookie || !client} onPress={() => create.mutate({topic: 'random', material: 'article', target_level: '', recycle_library: true}, {onSuccess: (value) => { setSession(value); setAnswers(Array(value.questions.length).fill(-1)); }})} style={[styles.button, {backgroundColor: tokens.colors.accent}]}>
          <Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{create.isPending ? t('reading.loading') : t('reading.start')}</Text>
        </Pressable>
      </View>
    );
  }

  const submitAnswers = () => submit.mutate(answers);
  const explain = () => {
    const text = selected.trim();
    if (text) dictionary.mutate({text, source_language: session.language_code, target_language: locale, context: session.passage});
  };
  const savedWord = dictionary.data ? dictionaryWordToLibraryInput(dictionary.data, selected) : null;

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{session.title}</Text>
      <Text style={[styles.passage, {color: tokens.colors.text}]}>{session.passage}</Text>
      <ReadingQuestionList session={session} answers={answers} onAnswer={(questionIndex, optionIndex) => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))} />
      {submit.isError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.submit_failed')}</Text>}
      {submit.data?.claim === 'comprehension_check_only' && <Text style={{color: tokens.colors.text}}>{t('reading.result')}: {submit.data.correct_count}/{submit.data.total}</Text>}
      <Pressable accessibilityRole="button" disabled={submit.isPending || answers.some((answer) => answer < 0)} onPress={submitAnswers} style={[styles.button, {backgroundColor: tokens.colors.accent}]}>
        <Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{submit.isPending ? t('reading.submitting') : t('reading.submit')}</Text>
      </Pressable>
      <TextInput accessibilityLabel={t('reading.selected_label')} value={selected} onChangeText={setSelected} placeholder={t('reading.selected_placeholder')} placeholderTextColor={tokens.colors.mutedText} style={[styles.input, {color: tokens.colors.text, backgroundColor: tokens.colors.surface, borderColor: tokens.colors.mutedText}]} />
      <Pressable accessibilityRole="button" disabled={dictionary.isPending || !selected.trim()} onPress={explain} style={[styles.button, {backgroundColor: tokens.colors.accent}]}>
        <Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{dictionary.isPending ? t('reading.explaining') : t('reading.explain')}</Text>
      </Pressable>
      {dictionary.isError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.dictionary_failed')}</Text>}
      <ReadingSaveFailureNotice visible={save.isError} />
      {dictionary.data?.available && savedWord && (
        <View style={[styles.card, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border}]}>
          <Text style={{color: tokens.colors.text}}>{dictionary.data.summary}</Text>
          <Text style={{color: tokens.colors.mutedText}}>{dictionary.data.natural_translation}</Text>
          <Pressable accessibilityRole="button" disabled={save.isPending} onPress={() => save.mutate(savedWord, {onSuccess: () => router.push('/(app)/library')})} style={styles.link}>
            <Text style={{color: tokens.colors.accent}}>{t('reading.save_word')}: {savedWord.word}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 12, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center'},
  title: {fontSize: 28, fontWeight: '700'},
  passage: {fontSize: 18, lineHeight: 30},
  card: {padding: 16, borderRadius: 18, gap: 8, borderWidth: 1},
  option: {paddingVertical: 8},
  input: {borderWidth: 1, borderRadius: 10, padding: 14, minHeight: 48},
  button: {padding: 16, borderRadius: 10, alignItems: 'center', minHeight: 44, justifyContent: 'center'},
  buttonText: {fontSize: 14, fontWeight: '700'},
  link: {paddingVertical: 8},
});
