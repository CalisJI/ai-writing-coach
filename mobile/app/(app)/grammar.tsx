import {useMemo, useRef, useState, type ReactNode} from 'react';
import {LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient, type ApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import type {Locale} from '../../src/i18n/messages';
import {useTheme} from '../../src/theme/ThemeProvider';
import {useScreenLayout} from '../../src/theme/layout';
import {useGrammarLibrary, useGrammarLesson, useCompleteGrammarLesson} from '../../src/query/useGrammar';
import {useGrammarPractice} from '../../src/query/useWritingEvaluation';
import {setGrammarWritingHandoff} from '../../src/features/writing/writingHandoff';
import type {GrammarLessonSummary} from '../../src/api/contracts/learning';
import {Button, Label, Panel, PanelCopy} from '../../src/components/orena';
import {OrenaIcon} from '../../src/components/OrenaIcon';

/**
 * Ported from static/becoming/screens/grammar.js and orena/grammar.css.
 *
 * The web renders a curriculum overview (progress, next lesson, level roadmap,
 * a lesson list grouped by level) and, for an open lesson, either a rich
 * generated `learning_model` (its own block-composition renderer in
 * components/grammar-learning.js) or a legacy body of rules/contrasts/
 * exceptions/examples/mistakes/guided-practice/production. The mobile
 * contract types the curriculum list and examples[], and carries the rest
 * (rules, contrasts, exceptions, mistakes, guided_practice, production_task_vi,
 * source, learning_model, objective_vi, explanation_vi) through `.passthrough()`
 * without a static shape, so this reads them defensively rather than assuming
 * a field is present. Full block-composition rendering of a rich learning_model
 * (pattern formula, timeline, scene dialogue) is not reproduced here -- that is
 * a second, large renderer on the web and is tracked as a residual gap in
 * MOBILE_VISUAL_PARITY_AUDIT.md rather than claimed as done. What every lesson
 * does carry (its localizable summary, examples, and any legacy fields) is
 * rendered with the Orena panel/label/chip primitives.
 */

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : []);
const records = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.map(record) : []);

function pickLocalized(value: unknown, locale: Locale): string {
  if (typeof value === 'string') return value;
  const map = record(value);
  return str(map[locale]) || str(map.en) || Object.values(map).find((entry) => typeof entry === 'string' && entry.trim() !== '') as string || '';
}

function progressOf(items: readonly {completed?: boolean}[]) {
  const total = items.length;
  const completed = items.filter((item) => item.completed === true).length;
  return {total, completed, percent: total ? Math.round((completed / total) * 100) : 0};
}

function groupByLevel(lessons: readonly GrammarLessonSummary[], levels: readonly string[]) {
  return levels.map((level) => ({level, items: lessons.filter((item) => item.level === level)})).filter((group) => group.items.length > 0);
}

/**
 * `groupByModule()`: inside a level, lessons belong to a module. The web groups
 * them so the curriculum map reads as a syllabus rather than one long list, and
 * falls back to the category, then to "Grammar", when a lesson names neither.
 * Insertion order is kept -- it is the order the syllabus defines.
 */
function groupByModule(items: readonly GrammarLessonSummary[]) {
  const map = new Map<string, GrammarLessonSummary[]>();
  for (const item of items) {
    const key = item.module || item.category || 'Grammar';
    const bucket = map.get(key);
    if (bucket) bucket.push(item); else map.set(key, [item]);
  }
  return [...map.entries()].map(([module, moduleItems]) => ({module, items: moduleItems}));
}

function kindLabel(kind: string | undefined, t: (id: never) => string): string {
  if (kind === 'review') return t('grammar.kind_review' as never);
  if (kind === 'checkpoint') return t('grammar.kind_checkpoint' as never);
  return t('grammar.kind_lesson' as never);
}

function sourceLabel(source: string, t: (id: never) => string): string {
  return source === 'locked-syllabus-fallback' ? t('grammar.source_fallback' as never) : t('grammar.source_prepared' as never);
}

export default function GrammarScreen() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const library = useGrammarLibrary(client, sessionCookie);
  const [openId, setOpenId] = useState('');

  const shell = (body: ReactNode) => (
    <View style={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('grammar.title')}</Text>
      {body}
      <Button label={t('nav.back_home' as never)} onPress={() => router.replace('/(app)')} />
    </View>
  );

  // Not signed in is a different fact from the service being unavailable.
  if (!sessionCookie) return shell(<PanelCopy>{t('grammar.signed_out' as never)}</PanelCopy>);
  if (!client || library.isError) return shell(<Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('grammar.unavailable')}</Text>);
  if (library.isPending) return <View style={[styles.container, {backgroundColor: tokens.colors.background}]}><Text style={{color: tokens.colors.text}}>{t('grammar.loading')}</Text></View>;
  if (!library.data?.lessons.length) return shell(<PanelCopy>{t('grammar.empty')}</PanelCopy>);

  if (openId) {
    return (
      <LessonDetail
        id={openId}
        lessons={library.data.lessons}
        client={client}
        sessionCookie={sessionCookie}
        language={library.data.language}
        onClose={() => setOpenId('')}
        onOpen={setOpenId}
      />
    );
  }

  return (
    <Overview
      library={library.data}
      onOpen={setOpenId}
      onWriting={() => router.push('/(app)/writing')}
    />
  );
}

function Overview({library, onOpen, onWriting}: {
  library: NonNullable<ReturnType<typeof useGrammarLibrary>['data']>;
  onOpen: (id: string) => void;
  onWriting: () => void;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const {wide} = useScreenLayout();
  const {lessons, levels} = library;
  const groups = groupByLevel(lessons, levels);
  const progress = progressOf(lessons);
  const next = lessons.find((item) => item.completed !== true) ?? null;
  // Which level groups are open, and where each one sits, so a level pill can
  // open its group and bring it into view the way the web's anchor does.
  const [openLevels, setOpenLevels] = useState<Record<string, boolean>>({});
  const levelOffsets = useRef<Record<string, number>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const onMeasureLevel = (level: string, y: number) => { levelOffsets.current[level] = y; };
  const onToggleLevel = (level: string, open: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenLevels((current) => ({...current, [level]: open}));
  };
  const onJumpToLevel = (level: string) => {
    onToggleLevel(level, true);
    const offset = levelOffsets.current[level];
    if (offset !== undefined) scrollRef.current?.scrollTo({y: Math.max(0, offset - 12), animated: true});
  };
  // The web's legacyObjective() gates this passthrough field to the vi
  // interface only (grammar.js); native never runs that locale, so it is
  // never shown here either, rather than leaking raw Vietnamese into en/zh.

  return (
    <ScrollView ref={scrollRef} style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('grammar.title')}</Text>

      <View style={[styles.hero, wide && styles.heroWide]}>
        <Panel style={wide ? styles.heroProgress : undefined}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressNumber, {color: tokens.colors.roleNoun}]}>{progress.percent}<Text style={styles.progressSign}>%</Text></Text>
            <View style={styles.progressCopy}>
              <Label>{t('grammar.progress' as never)}</Label>
              <Text style={[styles.progressHeading, {color: tokens.colors.heading}]}>{progress.completed} / {progress.total} {t('grammar.completed_suffix' as never)}</Text>
              <View style={[styles.track, {backgroundColor: tokens.colors.surfaceSunken}]}>
                <View style={[styles.trackFill, {width: `${progress.percent}%`, backgroundColor: tokens.colors.roleNoun}]} />
              </View>
              <PanelCopy>{t('grammar.no_mastery' as never)}</PanelCopy>
            </View>
          </View>
        </Panel>

        <Panel style={[wide ? styles.heroNext : undefined, {backgroundColor: tokens.colors.surfaceSunken}]}>
          {next ? (
            <>
              <Label>{next.level} · {kindLabel(next.kind, t)}</Label>
              <Text style={[styles.nextTitle, {color: tokens.colors.heading}]}>{next.title}</Text>
              <Button label={t('grammar.next_cta' as never)} onPress={() => onOpen(next.id)} />
            </>
          ) : (
            <>
              <Label>{t('grammar.progress' as never)}</Label>
              <Text style={[styles.nextTitle, {color: tokens.colors.heading}]}>{progress.total} / {progress.total}</Text>
              <PanelCopy>{t('grammar.all_done' as never)}</PanelCopy>
              <Button label={t('grammar.write_transfer' as never)} variant="outline" onPress={onWriting} />
            </>
          )}
        </Panel>
      </View>

      {/* `.grammar-level-rail`: the pills are controls on the web -- tapping one
          jumps to that level. They were inert here, so the rail was decoration. */}
      <Panel>
        <Label>{t('grammar.roadmap' as never)}</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelRail}>
          {groups.map((group) => {
            const p = progressOf(group.items);
            return (
              <Pressable
                key={group.level}
                accessibilityRole="button"
                accessibilityLabel={`${group.level} ${p.completed}/${p.total}`}
                onPress={() => onJumpToLevel(group.level)}
                style={({pressed}) => [styles.levelPill, {borderColor: tokens.colors.border, backgroundColor: pressed ? tokens.colors.accentTint : tokens.colors.surface}]}
              >
                <Text style={[styles.levelPillLevel, {color: tokens.colors.heading}]}>{group.level}</Text>
                <Text style={[styles.levelPillCount, {color: tokens.colors.mutedText}]}>{p.completed}/{p.total}</Text>
                <View style={[styles.levelPillTrack, {backgroundColor: tokens.colors.surfaceSunken}]}>
                  <View style={[styles.levelPillFill, {width: `${p.percent}%`, backgroundColor: tokens.colors.roleNoun}]} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Panel>

      {/* `.grammar-curriculum-map`: a `<details>` per level with the first open,
          and modules inside it. Every level expanded at once is a very long
          phone scroll, which is why the reference collapses them. */}
      {groups.map((group, groupIndex) => {
        const p = progressOf(group.items);
        const modules = groupByModule(group.items);
        const open = openLevels[group.level] ?? groupIndex === 0;
        return (
          <View key={group.level} onLayout={(event) => onMeasureLevel(group.level, event.nativeEvent.layout.y)}>
            <Panel>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={group.level}
                accessibilityState={{expanded: open}}
                onPress={() => onToggleLevel(group.level, !open)}
                style={styles.levelSummary}
              >
                <View style={styles.levelSummaryCopy}>
                  <Text style={[styles.levelSummaryLevel, {color: tokens.colors.heading}]}>{group.level}</Text>
                  <Text style={[styles.levelSummaryCount, {color: tokens.colors.mutedText}]}>{p.completed}/{p.total}</Text>
                </View>
                <Text style={[styles.levelSummaryCount, {color: tokens.colors.mutedText}]}>
                  {modules.length} {t('grammar.modules' as never)}
                </Text>
                <OrenaIcon name={open ? 'chevronUp' : 'chevronDown'} size={18} color={tokens.colors.mutedText} />
              </Pressable>

              {open ? (
                <View style={styles.moduleStack}>
                  {modules.map((module) => {
                    const mp = progressOf(module.items);
                    return (
                      <View key={module.module} style={styles.module}>
                        <View style={styles.moduleHead}>
                          <View style={styles.moduleHeadCopy}>
                            <Label>{group.level}</Label>
                            <Text style={[styles.moduleTitle, {color: tokens.colors.heading}]}>{module.module}</Text>
                          </View>
                          <Text style={[styles.levelSummaryCount, {color: tokens.colors.mutedText}]}>{mp.completed}/{mp.total}</Text>
                        </View>
                        <View style={styles.itemList}>
                          {module.items.map((item) => (
                            <Pressable
                              key={item.id}
                              accessibilityRole="button"
                              accessibilityLabel={item.title}
                              onPress={() => onOpen(item.id)}
                              style={[styles.itemRow, {borderColor: tokens.colors.border, backgroundColor: item.completed ? tokens.colors.surfaceSunken : tokens.colors.surface}]}
                            >
                              <Text style={[styles.itemKind, {color: tokens.colors.mutedText}]}>{kindLabel(item.kind, t)}</Text>
                              <Text numberOfLines={1} style={[styles.itemTitle, {color: tokens.colors.text}]}>{item.title}</Text>
                              <Text style={[styles.itemState, {color: item.completed ? tokens.colors.positive : tokens.colors.mutedText}]}>{item.completed ? '✓' : '→'}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Panel>
          </View>
        );
      })}
    </ScrollView>
  );
}

function LessonDetail({id, lessons, client, sessionCookie, language, onClose, onOpen}: {
  id: string;
  lessons: readonly GrammarLessonSummary[];
  client: ApiClient;
  sessionCookie: string;
  language: 'en' | 'zh';
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const detail = useGrammarLesson(client, sessionCookie, id);
  const complete = useCompleteGrammarLesson(client, sessionCookie);
  const practice = useGrammarPractice(client, sessionCookie);
  const router = useRouter();
  const [productionText, setProductionText] = useState('');
  const [productionWarning, setProductionWarning] = useState(false);

  const index = lessons.findIndex((item) => item.id === id);
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;

  const back = (
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.backRow}>
      <OrenaIcon name="arrowLeft" size={17} color={tokens.colors.text} />
      <Text style={[styles.backLabel, {color: tokens.colors.text}]}>{t('grammar.back' as never)}</Text>
    </Pressable>
  );

  const startWriting = () => {
    practice.mutate({grammarId: id, evidence: ''}, {onSuccess: (task) => { setGrammarWritingHandoff(task, language); router.push('/(app)/writing'); }});
  };

  const shell = (body: ReactNode) => (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      {back}
      {body}
    </ScrollView>
  );

  if (detail.isPending) return shell(<Text style={{color: tokens.colors.mutedText}}>{t('grammar.detail_loading')}</Text>);
  if (detail.isError || !detail.data) return shell(<Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('grammar.detail_failed')}</Text>);

  const item = detail.data;
  const fields = record(item);
  const learningModel = record(fields.learning_model);
  const richLearning = Object.keys(learningModel).length > 0;
  const objective = richLearning
    ? pickLocalized(record(learningModel.meaning).summary, language)
    : (str(fields.explanation_vi) || str(fields.objective_vi));
  const source = str(fields.source);

  const canComplete = richLearning
    ? true
    : productionText.split(/\n+/).map((line) => line.trim()).filter(Boolean).length >= 2;

  const onComplete = () => {
    if (!canComplete) { setProductionWarning(true); return; }
    setProductionWarning(false);
    complete.mutate(id);
  };

  return shell(
    <>
      <View style={styles.lessonHead}>
        <View style={{flex: 1, minWidth: 0}}>
          <Text style={[styles.kicker, {color: tokens.colors.roleNoun}]}>{item.level} · {kindLabel(item.kind, t)}</Text>
          <Text accessibilityRole="header" style={[styles.lessonTitle, {color: tokens.colors.heading}]}>{item.title}</Text>
          {objective ? <Text style={[styles.lessonObjective, {color: tokens.colors.mutedText}]}>{objective}</Text> : null}
        </View>
        <View style={[styles.completionChip, {borderColor: tokens.colors.border, backgroundColor: item.completed ? tokens.colors.positive + '22' : tokens.colors.surfaceSunken}]}>
          {item.completed ? <OrenaIcon name="check" size={13} color={tokens.colors.positive} /> : null}
          <Text style={[styles.completionChipText, {color: item.completed ? tokens.colors.positive : tokens.colors.mutedText}]}>
            {item.completed ? t('grammar.completed_suffix' as never) : (fields.category ? str(fields.category) : fields.module ? str(fields.module) : t('grammar.kind_lesson' as never))}
          </Text>
        </View>
      </View>

      {strings(fields.rules).length > 0 && !richLearning ? <ListPanel label={t('grammar.rules' as never)} items={strings(fields.rules)} /> : null}
      {strings(fields.contrasts).length > 0 ? <ListPanel label={t('grammar.contrasts' as never)} items={strings(fields.contrasts)} /> : null}
      {strings(fields.exceptions).length > 0 && !richLearning ? <ListPanel label={t('grammar.exceptions' as never)} items={strings(fields.exceptions)} /> : null}

      {Array.isArray(item.examples) && item.examples.length > 0 ? (
        <Panel>
          <Label>{t('grammar.examples' as never)}</Label>
          {item.examples.map((raw, exIndex) => {
            const example = record(raw);
            const target = str(example.target) || str(example.en);
            return (
              <View key={exIndex} style={styles.example}>
                {target ? <Text style={[styles.exampleTarget, {color: tokens.colors.heading}]}>{target}</Text> : null}
                {str(example.pinyin) ? <Text style={[styles.examplePinyin, {color: tokens.colors.mutedText}]}>{str(example.pinyin)}</Text> : null}
                {str(example.vi) ? <Text style={[styles.exampleGloss, {color: tokens.colors.mutedText}]}>{str(example.vi)}</Text> : null}
                {str(example.note_vi) ? <Text style={[styles.exampleNote, {color: tokens.colors.mutedText}]}>{str(example.note_vi)}</Text> : null}
              </View>
            );
          })}
        </Panel>
      ) : null}

      {strings(fields.mistakes).concat(strings(fields.common_traps)).length > 0 ? (
        <ListPanel label={t('grammar.mistakes' as never)} items={strings(fields.mistakes).concat(strings(fields.common_traps))} />
      ) : null}

      {records(fields.guided_practice).length > 0 ? (
        <Panel>
          <Label>{t('grammar.guided' as never)}</Label>
          {records(fields.guided_practice).map((practiceItem, practiceIndex) => (
            <GuidedPracticeItem key={practiceIndex} index={practiceIndex} item={practiceItem} />
          ))}
        </Panel>
      ) : null}

      {/* The web's legacyLessonBody always renders this section for a
          non-rich lesson -- it is where completion's two-example requirement
          is met, so hiding it whenever production_task_vi happens to be
          empty would make some lessons impossible to complete. */}
      {!richLearning ? (
        <Panel>
          <Label>{t('grammar.production' as never)}</Label>
          {str(fields.production_task_vi) ? <Text style={[styles.lessonObjective, {color: tokens.colors.heading}]}>{str(fields.production_task_vi)}</Text> : null}
          <PanelCopy>{t('grammar.production_prompt' as never)}</PanelCopy>
          <TextInput
            multiline
            numberOfLines={4}
            value={productionText}
            onChangeText={(value) => { setProductionText(value); setProductionWarning(false); }}
            placeholder={t('grammar.production_placeholder' as never)}
            placeholderTextColor={tokens.colors.mutedText}
            style={[styles.productionInput, {borderColor: tokens.colors.borderStrong, color: tokens.colors.text}]}
          />
          {productionWarning ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('grammar.production_needed' as never)}</Text> : null}
          {str(fields.writing_tip_vi) ? <PanelCopy>{str(fields.writing_tip_vi)}</PanelCopy> : null}
        </Panel>
      ) : null}

      <Panel>
        <Label>{t('grammar.source' as never)}</Label>
        <Text style={[styles.lessonObjective, {color: tokens.colors.heading}]}>{sourceLabel(source, t)}</Text>
        <PanelCopy>{t('grammar.no_mastery' as never)}</PanelCopy>
        <Button
          label={item.completed ? t('grammar.completed') : (complete.isPending ? t('grammar.completing') : t('grammar.complete'))}
          disabled={complete.isPending || item.completed === true}
          onPress={onComplete}
        />
        <Button
          label={practice.isPending ? t('grammar.detail_loading') : t('grammar.write_transfer' as never)}
          variant="outline"
          disabled={practice.isPending}
          onPress={startWriting}
        />
        {practice.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('grammar.unavailable')}</Text> : null}
        {complete.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('grammar.unavailable')}</Text> : null}
      </Panel>

      <View style={styles.lessonNav}>
        <Button label={t('grammar.prev' as never)} variant="outline" disabled={!prev} onPress={() => prev && onOpen(prev.id)} />
        <Button label={t('grammar.next_lesson' as never)} variant="outline" disabled={!next} onPress={() => next && onOpen(next.id)} />
      </View>
    </>,
  );
}

function ListPanel({label, items}: {label: string; items: string[]}) {
  const {tokens} = useTheme();
  return (
    <Panel>
      <Label>{label}</Label>
      {items.map((entry, index) => (
        <View key={index} style={styles.listRow}>
          <View style={[styles.listDot, {backgroundColor: tokens.colors.roleNoun}]} />
          <Text style={[styles.listText, {color: tokens.colors.mutedText}]}>{entry}</Text>
        </View>
      ))}
    </Panel>
  );
}

function GuidedPracticeItem({index, item}: {index: number; item: Record<string, unknown>}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const [attempt, setAttempt] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [warn, setWarn] = useState(false);
  const answer = str(item.answer);
  const why = str(item.why_vi);
  const hasAnswer = Boolean(answer || why);

  return (
    <View style={[styles.practiceCard, {borderColor: tokens.colors.border}]}>
      <Text style={[styles.practiceIndex, {color: tokens.colors.mutedText}]}>{String(index + 1).padStart(2, '0')} · {str(item.kind) || 'practice'}</Text>
      <Text style={[styles.practicePrompt, {color: tokens.colors.text}]}>{str(item.prompt)}</Text>
      <Label>{t('grammar.attempt' as never)}</Label>
      <TextInput
        multiline
        numberOfLines={3}
        value={attempt}
        onChangeText={(value) => { setAttempt(value); setWarn(false); }}
        placeholder={t('grammar.attempt_placeholder' as never)}
        placeholderTextColor={tokens.colors.mutedText}
        style={[styles.attemptInput, {borderColor: tokens.colors.borderStrong, color: tokens.colors.text}]}
      />
      {hasAnswer ? (
        <>
          <Button
            label={revealed ? t('grammar.hide' as never) : t('grammar.reveal' as never)}
            variant="outline"
            compact
            onPress={() => { if (!attempt.trim()) { setWarn(true); return; } setRevealed((current) => !current); }}
          />
          {warn ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('grammar.attempt_first' as never)}</Text> : null}
          {revealed ? (
            <View style={styles.answer}>
              {answer ? <Text style={[styles.answerText, {color: tokens.colors.heading}]}>{answer}</Text> : null}
              {why ? <Text style={[styles.exampleGloss, {color: tokens.colors.mutedText}]}>{why}</Text> : null}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', alignSelf: 'center', maxWidth: 1440},
  title: {fontSize: 20, fontWeight: '700'},
  hero: {gap: 16},
  heroWide: {flexDirection: 'row', alignItems: 'stretch'},
  heroProgress: {flex: 1.35},
  heroNext: {flex: 1},
  progressRow: {flexDirection: 'row', gap: 20, alignItems: 'center'},
  progressNumber: {fontSize: 40, fontWeight: '600'},
  progressSign: {fontSize: 18, fontWeight: '500'},
  progressCopy: {flex: 1, minWidth: 0, gap: 6},
  progressHeading: {fontSize: 17, fontWeight: '600'},
  track: {height: 6, borderRadius: 999, overflow: 'hidden'},
  trackFill: {height: '100%', borderRadius: 999},
  nextTitle: {fontSize: 15, fontWeight: '600', lineHeight: 21},
  levelPill: {minWidth: 96, padding: 12, borderRadius: 15, borderWidth: 1, gap: 5},
  levelPillLevel: {fontSize: 14, fontWeight: '600'},
  levelPillCount: {fontSize: 12},
  levelPillTrack: {height: 4, borderRadius: 999, overflow: 'hidden'},
  levelPillFill: {height: '100%', borderRadius: 999},
  levelRail: {gap: 8, paddingVertical: 2},
  levelSummary: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 40},
  levelSummaryCopy: {flexDirection: 'row', alignItems: 'baseline', gap: 8},
  levelSummaryLevel: {fontSize: 15, fontWeight: '700'},
  levelSummaryCount: {fontSize: 12},
  moduleStack: {gap: 14},
  module: {gap: 8},
  moduleHead: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10},
  moduleHeadCopy: {flex: 1, gap: 2},
  moduleTitle: {fontSize: 15, fontWeight: '600'},
  itemList: {gap: 6},
  itemRow: {flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1},
  itemKind: {fontSize: 12, minWidth: 60},
  itemTitle: {flex: 1, minWidth: 0, fontSize: 14},
  itemState: {fontSize: 14, fontWeight: '700'},
  backRow: {flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start', minHeight: 38, paddingHorizontal: 4},
  backLabel: {fontSize: 14, fontWeight: '700'},
  lessonHead: {flexDirection: 'row', gap: 16, alignItems: 'flex-start'},
  kicker: {fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase'},
  lessonTitle: {fontSize: 24, fontWeight: '600', marginTop: 6, marginBottom: 4},
  lessonObjective: {fontSize: 15, lineHeight: 23},
  completionChip: {flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1},
  completionChipText: {fontSize: 12, fontWeight: '600'},
  listRow: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  listDot: {width: 6, height: 6, borderRadius: 999, marginTop: 8},
  listText: {flex: 1, fontSize: 14, lineHeight: 21},
  example: {gap: 3, paddingVertical: 8},
  exampleTarget: {fontSize: 17, fontWeight: '600'},
  examplePinyin: {fontSize: 13},
  exampleGloss: {fontSize: 13},
  exampleNote: {fontSize: 13, fontStyle: 'italic'},
  practiceCard: {gap: 10, padding: 14, borderRadius: 15, borderWidth: 1},
  practiceIndex: {fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6},
  practicePrompt: {fontSize: 15, lineHeight: 22},
  attemptInput: {minHeight: 72, borderWidth: 1, borderRadius: 15, padding: 12, fontSize: 14, textAlignVertical: 'top'},
  answer: {gap: 4, paddingTop: 4},
  answerText: {fontSize: 15, fontWeight: '600'},
  productionInput: {minHeight: 100, borderWidth: 1, borderRadius: 15, padding: 12, fontSize: 14, textAlignVertical: 'top'},
  lessonNav: {flexDirection: 'row', gap: 10, justifyContent: 'space-between'},
});
