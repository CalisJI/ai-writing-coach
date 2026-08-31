import {useMemo, useState, type ReactNode} from 'react';
import {Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {useCreateReadingSession, useOpenReadingSession, useSubmitReadingAnswers, useContextualDictionary, useSaveLibraryVocabulary} from '../../src/query/useReadingLibrary';
import {useReadingSessionHistory} from '../../src/query/useHome';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {dictionaryWordToLibraryInput} from '../../src/features/reading/readingLibraryHandoff';
import type {ReadingSession, ReadingAnswerResult} from '../../src/api/contracts/reading';
import {Button, Chip, Label, Panel, PanelCopy, Split} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/reading.js and orena/reading.css.
 *
 * The web triggers its contextual lookup from a mouse text selection
 * (`window.getSelection()`), which has no stable equivalent in React Native
 * core -- there is no cross-platform "selected substring" event for a Text
 * view. Native keeps the already-working manual-entry lookup as the platform
 * adaptation for that one mechanic; everything else (session creation with a
 * real level/material/topic picker, the article header, the comprehension
 * check, the understanding and key-vocabulary rail, and the recent-passages
 * history list backed by GET /api/reading/sessions + GET
 * /api/reading/session/{id}, the same shared backend the web calls) is
 * ported to the Orena primitives. The live scroll-progress rail, font/
 * line-spacing controls, focus mode, and clipboard copy are not reproduced
 * -- tracked as residuals in MOBILE_VISUAL_PARITY_AUDIT.md rather than
 * claimed as done.
 */

const TOPIC_KEYS = ['random', 'daily_life', 'work', 'science', 'culture', 'community'] as const;
const MATERIALS = ['article', 'book', 'news', 'quote'] as const;
// From static/becoming/language.js: the CEFR and HSK level sets by learning language.
const LEVELS_BY_LANGUAGE: Record<'en' | 'zh', readonly string[]> = {
  en: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  zh: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7-9'],
};
const DEFAULT_LEVEL: Record<'en' | 'zh', string> = {en: 'B2', zh: 'HSK4'};
const WORDS_PER_MINUTE = 200;

function topicLabel(t: (id: never) => string, topic: string): string {
  return t((TOPIC_KEYS as readonly string[]).includes(topic) ? `reading.topic_${topic}` as never : 'reading.topic_random' as never);
}

function wordCount(passage: string, language: 'en' | 'zh'): number {
  const text = passage.trim();
  if (!text) return 0;
  return language === 'zh' ? [...text.replace(/\s+/g, '')].length : text.split(/\s+/).filter(Boolean).length;
}

export function ReadingSaveFailureNotice({visible}: {visible: boolean}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return visible ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.save_failed')}</Text> : null;
}

export function ReadingQuestionList({session, answers, onAnswer, result}: {
  session: ReadingSession;
  answers: number[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
  result?: ReadingAnswerResult;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const resultById = new Map((result?.results ?? []).map((item) => [item.id, item]));
  return (
    <>
      {session.questions.map((question, questionIndex) => {
        const checked = resultById.get(question.id);
        return (
          <View key={question.id} style={styles.question}>
            <View style={styles.questionHead}>
              <Text style={[styles.questionIndex, {color: tokens.colors.roleNoun}]}>{questionIndex + 1}</Text>
              <Text style={[styles.questionText, {color: tokens.colors.text}]}>{question.question}</Text>
            </View>
            {question.options.map((option, optionIndex) => {
              const selected = answers[questionIndex] === optionIndex;
              const isCorrect = checked ? checked.correct_index === optionIndex : false;
              const isWrong = checked ? selected && !checked.correct : false;
              const borderColor = isCorrect ? tokens.colors.positive : isWrong ? tokens.colors.danger : selected ? tokens.colors.accent : tokens.colors.border;
              return (
                <Pressable
                  key={`${question.id}-${optionIndex}`}
                  accessibilityRole="radio"
                  accessibilityState={{selected, disabled: Boolean(result)}}
                  disabled={Boolean(result)}
                  onPress={() => onAnswer(questionIndex, optionIndex)}
                  style={[styles.option, {borderColor, backgroundColor: selected ? tokens.colors.surfaceSunken : 'transparent'}]}
                >
                  <Text style={{color: tokens.colors.text}}>{option}</Text>
                </Pressable>
              );
            })}
            {checked ? (
              <View style={styles.evidence}>
                <Chip>{checked.correct ? t('reading.supported' as never) : t('reading.check_evidence' as never)}</Chip>
                {/* explanation_vi is stored Vietnamese-only (reading.js's own comment says so),
                    and native never runs a vi interface, so the shared generic line is used
                    instead of leaking untranslated text into en/zh. */}
                <Text style={[styles.evidenceQuote, {color: tokens.colors.mutedText}]}>{t('reading.explanation_generic' as never)}</Text>
                {checked.evidence_fragment ? <Text style={[styles.evidenceQuote, {color: tokens.colors.text, fontStyle: 'italic'}]}>&ldquo;{checked.evidence_fragment}&rdquo;</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

export default function ReadingScreen() {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState('');
  const [level, setLevel] = useState('');
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]>('article');
  const [topic, setTopic] = useState<(typeof TOPIC_KEYS)[number]>('random');
  const [recycle, setRecycle] = useState(true);

  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const profile = useLearnerProfile(client, sessionCookie, Boolean(sessionCookie));
  const create = useCreateReadingSession(client, sessionCookie);
  const submit = useSubmitReadingAnswers(client, sessionCookie, session?.id);
  const dictionary = useContextualDictionary(client, sessionCookie);
  const save = useSaveLibraryVocabulary(client, sessionCookie);
  const history = useReadingSessionHistory(client, sessionCookie);
  const openSession = useOpenReadingSession(client, sessionCookie);

  const openFromHistory = (id: number) => {
    openSession.mutate(id, {onSuccess: (value) => { setSession(value); setAnswers(Array(value.questions.length).fill(-1)); setSelected(''); }});
  };

  const shell = (body: ReactNode) => (
    <View style={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('reading.title')}</Text>
      {body}
    </View>
  );

  // Not signed in is a different fact from the service being unavailable.
  if (!sessionCookie) {
    return shell(
      <>
        <PanelCopy>{t('reading.signed_out' as never)}</PanelCopy>
        <Button label={t('reading.start')} disabled onPress={() => undefined} />
      </>,
    );
  }

  if (!client || create.isError) {
    return shell(<Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.unavailable')}</Text>);
  }

  const learningLanguage = profile.data?.language ?? 'en';
  const levels = LEVELS_BY_LANGUAGE[learningLanguage];
  const activeLevel = level || DEFAULT_LEVEL[learningLanguage];

  if (!session) {
    const startSession = () => {
      create.mutate(
        {topic, material, target_level: activeLevel, recycle_library: recycle},
        {onSuccess: (value) => { setSession(value); setAnswers(Array(value.questions.length).fill(-1)); setSelected(''); }},
      );
    };
    return (
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('reading.title')}</Text>
        <Panel>
          <Label>{t('reading.new_title' as never)}</Label>
          <PanelCopy>{t('reading.create_disclaimer' as never)}</PanelCopy>

          <Label>{t('reading.level' as never)}</Label>
          <View style={styles.chipRow}>
            {levels.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{selected: activeLevel === value}}
                onPress={() => setLevel(value)}
                style={[styles.pill, {borderColor: activeLevel === value ? tokens.colors.accent : tokens.colors.border, backgroundColor: activeLevel === value ? tokens.colors.surfaceSunken : 'transparent'}]}
              >
                <Text style={{color: tokens.colors.text, fontWeight: activeLevel === value ? '700' : '400'}}>{value}</Text>
              </Pressable>
            ))}
          </View>

          <Label>{t('reading.material' as never)}</Label>
          <View style={styles.materialGrid}>
            {MATERIALS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{selected: material === key}}
                onPress={() => setMaterial(key)}
                style={[styles.materialCard, {borderColor: material === key ? tokens.colors.accent : tokens.colors.border, backgroundColor: material === key ? tokens.colors.surfaceSunken : tokens.colors.surface}]}
              >
                <Text style={[styles.materialName, {color: tokens.colors.heading}]}>{t(`reading.material_${key}` as never)}</Text>
                <Text style={[styles.materialDesc, {color: tokens.colors.mutedText}]}>{t(`reading.material_${key}_desc` as never)}</Text>
              </Pressable>
            ))}
          </View>
          <PanelCopy>{t('reading.material_note' as never)}</PanelCopy>

          <Label>{t('reading.topic' as never)}</Label>
          <View style={styles.chipRow}>
            {TOPIC_KEYS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{selected: topic === key}}
                onPress={() => setTopic(key)}
                style={[styles.pill, {borderColor: topic === key ? tokens.colors.accent : tokens.colors.border, backgroundColor: topic === key ? tokens.colors.surfaceSunken : 'transparent'}]}
              >
                <Text style={{color: tokens.colors.text, fontWeight: topic === key ? '700' : '400'}}>{t(`reading.topic_${key}` as never)}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.recycleRow}>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={[styles.recycleLabel, {color: tokens.colors.heading}]}>{t('reading.recycle' as never)}</Text>
              <Text style={[styles.materialDesc, {color: tokens.colors.mutedText}]}>{t('reading.recycle_desc' as never)}</Text>
            </View>
            <Switch value={recycle} onValueChange={setRecycle} trackColor={{true: tokens.colors.accent, false: tokens.colors.surfaceSunken}} />
          </View>

          {create.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.unavailable')}</Text> : null}
          <Button label={create.isPending ? t('reading.loading') : t('reading.create' as never)} disabled={create.isPending} onPress={startSession} />
        </Panel>

        {history.data && history.data.items.length > 0 ? (
          <Panel>
            <Label>{t('reading.recent' as never)}</Label>
            {openSession.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.open_failed' as never)}</Text> : null}
            <View style={styles.historyList}>
              {history.data.items.slice(0, 6).map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  disabled={openSession.isPending}
                  onPress={() => openFromHistory(item.id)}
                  style={[styles.historyRow, {borderColor: tokens.colors.border}]}
                >
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text style={[styles.historyTitle, {color: tokens.colors.heading}]} numberOfLines={1}>{item.title}</Text>
                    <Text style={{color: tokens.colors.mutedText}}>{item.target_level} · {topicLabel(t, item.topic)}</Text>
                  </View>
                  <Text style={{color: tokens.colors.mutedText}}>{item.latest_attempt ? `${item.latest_attempt.correct_count}/${item.latest_attempt.total}` : t('reading.unread' as never)}</Text>
                </Pressable>
              ))}
            </View>
          </Panel>
        ) : null}
      </ScrollView>
    );
  }

  const submitAnswers = () => submit.mutate(answers);
  const explain = () => {
    const text = selected.trim();
    if (text) dictionary.mutate({text, source_language: session.language_code, target_language: locale, context: session.passage});
  };
  const savedWord = dictionary.data ? dictionaryWordToLibraryInput(dictionary.data, selected) : null;
  const result = submit.data?.claim === 'comprehension_check_only' ? submit.data : undefined;
  const words = wordCount(session.passage, session.language_code);
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  const nextPassage = () => { setSession(null); setAnswers([]); setSelected(''); };

  const aside = (
    <>
      <Panel>
        <Label>{t('reading.understanding' as never)}</Label>
        <TextInput
          accessibilityLabel={t('reading.selected_label')}
          value={selected}
          onChangeText={setSelected}
          placeholder={t('reading.selected_placeholder')}
          placeholderTextColor={tokens.colors.mutedText}
          style={[styles.input, {color: tokens.colors.text, backgroundColor: tokens.colors.surfaceSunken, borderColor: tokens.colors.border}]}
        />
        {!selected.trim() ? <PanelCopy>{t('reading.select_prompt' as never)}</PanelCopy> : null}
        <Button label={dictionary.isPending ? t('reading.explaining') : t('reading.explain')} variant="outline" compact disabled={dictionary.isPending || !selected.trim()} onPress={explain} />
        {dictionary.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.dictionary_failed')}</Text> : null}
        <ReadingSaveFailureNotice visible={save.isError} />
        {dictionary.data?.available && savedWord ? (
          <View style={styles.lookupResult}>
            <Label>{t('reading.meaning' as never)}</Label>
            <PanelCopy>{dictionary.data.summary}</PanelCopy>
            {dictionary.data.natural_translation ? (
              <>
                <Label>{t('reading.example' as never)}</Label>
                <PanelCopy>{dictionary.data.natural_translation}</PanelCopy>
              </>
            ) : null}
            <Button
              label={`${t('reading.add_to_vocabulary' as never)}: ${savedWord.word}`}
              variant="outline"
              compact
              disabled={save.isPending}
              onPress={() => save.mutate(savedWord, {onSuccess: () => router.push('/(app)/library')})}
            />
          </View>
        ) : null}
      </Panel>

      <Panel>
        <Label>{`${t('reading.key_vocabulary' as never)} (${session.recycled_words.length})`}</Label>
        {session.recycled_words.length > 0 ? (
          <>
            <View style={styles.chipRow}>
              {session.recycled_words.map((word) => (
                <Pressable key={word} accessibilityRole="button" onPress={() => setSelected(word)} style={[styles.pill, {borderColor: tokens.colors.border}]}>
                  <Text style={{color: tokens.colors.text}}>{word}</Text>
                </Pressable>
              ))}
            </View>
            <PanelCopy>{t('reading.from_library' as never)}</PanelCopy>
          </>
        ) : (
          <PanelCopy>{t('reading.no_vocabulary' as never)}</PanelCopy>
        )}
      </Panel>
    </>
  );

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Split aside={aside}>
        <Panel>
          <Text style={[styles.crumbs, {color: tokens.colors.mutedText}]}>{t('reading.title')} · {t(`reading.topic_${(TOPIC_KEYS as readonly string[]).includes(session.topic) ? session.topic : 'random'}` as never)}</Text>
          <Text accessibilityRole="header" style={[styles.articleTitle, {color: tokens.colors.heading}]}>{session.title}</Text>
          <View style={styles.chipRow}>
            <Chip>{session.material ? t(`reading.material_${session.material}` as never) : t('reading.material_article' as never)}</Chip>
            <Text style={{color: tokens.colors.mutedText}}>{session.generation_mode === 'generated' ? t('reading.generated' as never) : t('reading.builtin' as never)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Chip>{session.target_level}</Chip>
            <Text style={{color: tokens.colors.mutedText}}>{words} {t('reading.words' as never)}</Text>
            <Text style={{color: tokens.colors.mutedText}}>{minutes} {t('reading.min_unit' as never)}</Text>
          </View>
        </Panel>

        <Panel>
          <Text style={[styles.passage, {color: tokens.colors.text}]}>{session.passage}</Text>
        </Panel>

        <Panel>
          <Label>{t('reading.result' as never)}</Label>
          <Text style={[styles.checkTitle, {color: tokens.colors.heading}]}>{t('reading.check_title' as never)}</Text>
          <ReadingQuestionList session={session} answers={answers} onAnswer={(questionIndex, optionIndex) => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))} result={result} />
          {submit.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('reading.submit_failed')}</Text> : null}
          {result ? (
            <View style={styles.resultBand}>
              <Label>{t('reading.result' as never)}</Label>
              <Text style={[styles.resultCount, {color: tokens.colors.heading}]}>{result.correct_count} / {result.total}</Text>
              <PanelCopy>{t('reading.result_note' as never)}</PanelCopy>
            </View>
          ) : (
            <Button label={submit.isPending ? t('reading.submitting') : t('reading.submit')} disabled={submit.isPending || answers.some((answer) => answer < 0)} onPress={submitAnswers} />
          )}
        </Panel>

        <View style={styles.bottomNav}>
          <Button label={t('reading.back' as never)} variant="outline" onPress={nextPassage} />
          <Button label={result ? t('reading.another' as never) : t('reading.next_passage' as never)} onPress={nextPassage} />
        </View>
      </Split>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', alignSelf: 'center', maxWidth: 1440},
  title: {fontSize: 20, fontWeight: '700'},
  crumbs: {fontSize: 13},
  articleTitle: {fontSize: 24, fontWeight: '600', lineHeight: 30},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center'},
  metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center'},
  passage: {fontSize: 15, lineHeight: 27},
  pill: {paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, borderWidth: 1},
  materialGrid: {gap: 10},
  materialCard: {padding: 14, borderRadius: 15, borderWidth: 1, gap: 4},
  materialName: {fontSize: 15, fontWeight: '600'},
  materialDesc: {fontSize: 13, lineHeight: 19},
  recycleRow: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4},
  historyList: {gap: 8},
  historyRow: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15, borderWidth: 1},
  historyTitle: {fontSize: 15, fontWeight: '600'},
  recycleLabel: {fontSize: 15, fontWeight: '600'},
  input: {borderWidth: 1, borderRadius: 15, padding: 12, minHeight: 44},
  lookupResult: {gap: 8, paddingTop: 4},
  checkTitle: {fontSize: 17, fontWeight: '600'},
  question: {gap: 8, paddingVertical: 10},
  questionHead: {flexDirection: 'row', gap: 8, alignItems: 'flex-start'},
  questionIndex: {fontSize: 15, fontWeight: '700', minWidth: 20},
  questionText: {flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', lineHeight: 22},
  option: {padding: 12, borderRadius: 15, borderWidth: 1},
  evidence: {gap: 6, paddingTop: 4},
  evidenceQuote: {fontSize: 13, lineHeight: 20},
  resultBand: {gap: 6, paddingTop: 8},
  resultCount: {fontSize: 24, fontWeight: '700'},
  bottomNav: {flexDirection: 'row', gap: 10, justifyContent: 'space-between'},
});
