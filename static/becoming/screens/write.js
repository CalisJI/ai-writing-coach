import {api} from '../api.js';
import {state,saveDraft} from '../store.js';
import {go} from '../router.js';
import {configFor,countUnits} from '../language.js';
import {guidanceMode,guidanceLabel,writingScaffold} from '../domain/adaptive.js';
import {esc,attr,toast,runBusy,showDialog} from '../components/primitives.js';
import {installSelectEnhancements} from '../components/select-field.js';
import {t,practiceModeLabel,topicLabel,unitLabel,categoryLabel} from '../domain/i18n.js';
import {supportCopy} from '../domain/support.js';
import {openDictionary} from '../components/dictionary.js';
import {oIcon} from '../orena/icons.js';
import {installDisclosures} from '../orena/shell.js';

/* Writing, rebuilt against docs/visual-references/Orena-prod/ORENA-WRITING-*.
 *
 * The reference splits the screen into three things a writer actually uses:
 * the brief they are answering, the draft itself, and a setup panel they touch
 * at the start and then leave alone. That is the structure here.
 *
 * Two notes on honesty, because the reference is a mockup and this is a real
 * product:
 *
 *  - Everything that maps onto data the app already has is wired to it. The
 *    word count, the saved-at stamp, the level chip, the brief and the clear
 *    action are all real.
 *  - Audience and the four Support switches have no backend yet. They are
 *    fully operable and they persist with the draft, so nothing on screen is
 *    a dead control, but they do not yet change what the evaluator sees. The
 *    panel says so rather than implying an effect it does not have.
 */

/* CEFR and HSK bands both collapse onto the same six-step ladder, so the chip
   beside the level reads in the learner's own interface language instead of
   carrying an untranslated English descriptor. */
const BAND_TIERS = {
  A1: 'beginner', A2: 'elementary', B1: 'intermediate',
  B2: 'upper', C1: 'advanced', C2: 'proficient',
  HSK1: 'beginner', HSK2: 'beginner', HSK3: 'elementary',
  HSK4: 'intermediate', HSK5: 'upper', HSK6: 'advanced', 'HSK7-9': 'proficient',
};

/* The categories the evaluator actually reports. "View rubric" shows these
   rather than inventing a scoring scheme the backend does not use. */
const RUBRIC_CATEGORIES = [
  'task_achievement', 'coherence', 'grammar', 'verb_tense',
  'vocabulary', 'collocation', 'naturalness',
];

const SUPPORT_SWITCHES = [
  ['grammar', 'write.support_grammar'],
  ['vocabulary', 'write.support_vocabulary'],
  ['expressions', 'write.support_expressions'],
  ['roles', 'write.support_roles'],
];

const WORD_ROLES = ['verb', 'noun', 'adjective', 'adverb'];
const PRACTICE_INTENTS = new Set(['repair', 'reinforce', 'transfer', 'baseline']);
const PRACTICE_FAMILIES = new Set(['grammar', 'vocabulary', 'coherence', 'task_achievement', 'naturalness', 'expression']);
const PRACTICE_CONTEXT_FIELDS = [
  'intent', 'focus_category', 'focus_label', 'focus_family', 'focus_status',
  'task_type', 'topic', 'target_level', 'action_label', 'reason', 'evidence',
  'focus_instruction', 'grammar_id', 'grammar_title',
];

const EVALUATION_ERROR_COPY = {
  evaluation_unavailable: 'write.evaluation_unavailable',
  evaluation_provider_failure: 'write.evaluation_provider_failure',
  language_scope_mismatch: 'write.language_scope_mismatch',
};

export function writingEvaluationErrorMessage(error = {}) {
  const category = String(error?.category || '').trim();
  return t(EVALUATION_ERROR_COPY[category] || 'write.review_failed');
}

function bandLabel(level) {
  const tier = BAND_TIERS[String(level || '').toUpperCase()] || BAND_TIERS[level];
  return tier ? t(`band.${tier}`) : '';
}

function supportState() {
  // Every switch starts on, as the reference draws them.
  const saved = state.draft.support || {};
  return SUPPORT_SWITCHES.reduce((all, [key]) => {
    all[key] = saved[key] !== false;
    return all;
  }, {});
}

function infoButton(text) {
  if (!text) return '';
  return `<button class="o-info" type="button" tabindex="0" data-tooltip="${attr(text)}" aria-label="${attr(t('chrome.details'))}">${oIcon('info')}</button>`;
}

function selectionLookupButton() {
  return `<button id="lookupSelection" class="o-info" type="button" hidden data-tooltip="${attr(t('write.lookup_selection'))}" aria-label="${attr(t('write.lookup_selection'))}">${oIcon('info')}</button>`;
}

function savedLabel(savedAt) {
  const raw = typeof savedAt === 'number' ? savedAt : null;
  if (raw === null || !Number.isFinite(raw) || !Number.isInteger(raw) || raw <= 0) {
    return t('write.saved_never');
  }
  const minutes = Math.floor((Date.now() - raw) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return t('write.saved_never');
  if (minutes < 1) return t('write.saved_now');
  if (minutes < 60) return t('write.saved_minutes', {n: minutes});
  return t('write.saved_hours', {n: Math.floor(minutes / 60)});
}

/* Drafts written before this screen existed are plain text. Rebuild them as
   paragraphs so an existing draft survives the change instead of arriving as
   one run-on block. */
function draftHtml() {
  if (typeof state.draft.html === 'string' && state.draft.html) return state.draft.html;
  const text = typeof state.draft.text === 'string' ? state.draft.text : '';
  if (!text.trim()) return '';
  return text.split(/\n{2,}/)
    .map(block => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function promptText() {
  const task = state.draft.generatedTask;
  const taskObject = task && typeof task === 'object' && !Array.isArray(task) ? task : null;
  const instruction = typeof taskObject?.instruction === 'string' ? taskObject.instruction.trim() : '';
  const prompt = typeof taskObject?.prompt === 'string' ? taskObject.prompt.trim() : '';
  if (instruction || prompt) return instruction || prompt;
  return typeof state.draft.prompt === 'string' ? state.draft.prompt.trim() : '';
}

function draftFieldText(value) {
  return typeof value === 'string' ? value : '';
}

function draftTopicValue(value) {
  const topic=draftFieldText(value).trim();
  if(!topic)return 'random';
  const config=configFor(state.language);
  const canonical=config.topics.find(candidate=>
    candidate===topic||topicLabel(candidate)===topic,
  );
  return canonical||topic;
}

function draftParentEssayIdValue(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function evaluatorLanguageValue(value) {
  return value === 'zh' ? 'zh' : 'en';
}

function evaluatorLevelValue(value, language) {
  const config = configFor(evaluatorLanguageValue(language));
  return config.levels.includes(value) ? value : config.defaultLevel;
}

function taskTypeValue(value, language) {
  const allowed = language === 'zh'
    ? new Set(['opinion', 'email', 'review', 'story', 'hsk'])
    : new Set(['opinion', 'email', 'review', 'story', 'toeic']);
  return allowed.has(value) ? value : 'opinion';
}

function taskWordTargetValue(value, language) {
  const config = configFor(evaluatorLanguageValue(language));
  return config.lengths.includes(value) ? value : config.defaultLength;
}

function personalizationLabel(task) {
  const personalization = task && typeof task === 'object' && !Array.isArray(task)
    ? task.personalization : null;
  return personalization && typeof personalization === 'object' && !Array.isArray(personalization)
    && typeof personalization.focus_label === 'string'
    ? personalization.focus_label.trim() : '';
}

function normalizedPracticeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const context = {};
  for (const field of PRACTICE_CONTEXT_FIELDS) {
    if (!(field in value)) continue;
    if (typeof value[field] !== 'string') return null;
    context[field] = value[field];
  }
  if (!context.intent && !context.focus_family) return null;
  if ('intent' in context && !PRACTICE_INTENTS.has(context.intent)) return null;
  if ('focus_family' in context && !PRACTICE_FAMILIES.has(context.focus_family)) return null;
  return context;
}

function evaluationPracticeContext() {
  return normalizedPracticeContext(state.draft.practiceContext)
    || normalizedPracticeContext(state.draft.generatedTask?.personalization);
}

function promptCard(config) {
  const text = promptText();
  const level = state.draft.level;
  const band = bandLabel(level);
  const task = state.draft.generatedTask;
  const canGenerate = !['free', 'custom'].includes(state.draft.mode);
  const focusLabel = personalizationLabel(task);

  return `<article class="o-card o-prompt">
    <span class="o-prompt-tile" aria-hidden="true">${oIcon('document')}</span>
    <div class="o-prompt-body">
      <span class="o-prompt-kicker">${esc(t('write.prompt'))}</span>
      <p class="o-prompt-text">${text ? esc(text) : esc(t('write.no_prompt'))}</p>
      ${focusLabel ? `<p class="o-prompt-kicker">${esc(t('write.memory_guided'))} · ${esc(focusLabel)}</p>` : ''}
      <div class="o-prompt-foot">
        <span class="o-chip">${esc(level)}</span>
        ${band ? `<span class="o-prompt-level">${esc(band)}</span>` : ''}
        ${canGenerate ? `<button id="generateBrief" class="o-btn o-btn--outline o-btn--compact" type="button">${oIcon('rubric')}<span>${esc(t('write.create_brief'))}</span></button>` : ''}
        <button id="viewRubric" class="o-btn o-btn--outline o-btn--compact" type="button">${oIcon('rubric')}<span>${esc(t('write.view_rubric'))}</span></button>
      </div>
    </div>
  </article>`;
}

function toolbarMarkup() {
  const tool = (command, iconName, key) =>
    `<button class="o-tool" type="button" data-command="${attr(command)}" aria-pressed="false" data-tooltip="${attr(t(key))}" aria-label="${attr(t(key))}">${oIcon(iconName)}</button>`;

  return `<div class="o-editor-toolbar" role="toolbar" aria-label="${attr(t('write.your_draft'))}">
    ${tool('undo', 'undo', 'write.tool_undo')}
    ${tool('redo', 'redo', 'write.tool_redo')}
    <span class="o-tool-sep" aria-hidden="true"></span>
    <span class="o-tool-block">
      <select id="blockFormat" aria-label="${attr(t('write.block_paragraph'))}">
        <option value="p">${esc(t('write.block_paragraph'))}</option>
        <option value="h3">${esc(t('write.block_heading'))}</option>
        <option value="blockquote">${esc(t('write.block_quote'))}</option>
      </select>
    </span>
    <span class="o-tool-sep" aria-hidden="true"></span>
    ${tool('bold', 'bold', 'write.tool_bold')}
    ${tool('italic', 'italic', 'write.tool_italic')}
    ${tool('underline', 'underline', 'write.tool_underline')}
    <span class="o-tool-sep" aria-hidden="true"></span>
    ${tool('insertUnorderedList', 'bulletList', 'write.tool_bullet')}
    ${tool('insertOrderedList', 'orderedList', 'write.tool_number')}
    <span class="o-tool-sep" aria-hidden="true"></span>
    ${tool('createLink', 'link', 'write.tool_link')}
    <span class="o-tool-spacer"></span>
    ${tool('removeFormat', 'clearFormat', 'write.tool_clear')}
  </div>`;
}

function editorCard(config) {
  const units = countUnits(state.draft.text, state.language);
  return `<section class="o-card o-editor o-disclosure" data-open="true" aria-labelledby="draftHeading">
    <button class="o-disclosure__toggle" type="button">
      <span id="draftHeading">${esc(t('write.your_draft'))}</span>
      ${oIcon('chevronUp')}
    </button>
    <div class="o-disclosure__body">
      ${toolbarMarkup()}
      <div id="writingEditor"
           class="o-editor-body ${state.language === 'zh' ? 'cjk' : ''}"
           contenteditable="true"
           role="textbox"
           aria-multiline="true"
           aria-label="${attr(t('write.your_draft'))}"
           spellcheck="${state.language === 'en' ? 'true' : 'false'}"
           data-placeholder="${attr(config.editorPlaceholder)}">${draftHtml()}</div>
      <div class="o-editor-foot">
        <span id="editorCount">${units} ${esc(unitLabel(state.language))}</span>
        <span class="o-editor-saved">
          ${selectionLookupButton()}
          ${oIcon('cloud')}
          <span id="savedStamp">${esc(savedLabel(state.draft.savedAt))}</span>
        </span>
      </div>
    </div>
  </section>`;
}

/* The info affordance is a sibling of the label, never a child of it. A button
   inside a <label> forwards its click to the labelled control, and a button
   inside a <button> is not even parseable — the browser closes the outer one
   early and the rest of the header escapes the element it belonged to. */
function fieldHead(id, labelKey, infoKey) {
  return `<div class="o-field-head">
    <label class="o-label" for="${attr(id)}">${esc(t(labelKey))}</label>
    ${infoKey ? infoButton(t(infoKey)) : ''}
  </div>`;
}

function fieldMarkup({id, labelKey, infoKey, control}) {
  return `<div class="o-field">
    ${fieldHead(id, labelKey, infoKey)}
    ${control}
  </div>`;
}

function disclosureHead(labelKey) {
  return `<button class="o-disclosure__toggle" type="button">
    <span>${esc(t(labelKey))}</span>
    ${oIcon('chevronUp')}
  </button>`;
}

/* Selects go out as plain markup. `installSelectEnhancements` upgrades every
   one of them into the shared listbox component that already exists for this
   design — building a second select here would mean two controls to keep in
   step and two sets of keyboard semantics to get right. */
function selectControl(id, options, current) {
  return `<select id="${attr(id)}">
    ${options.map(([value, label]) =>
      `<option value="${attr(value)}" ${String(value) === String(current) ? 'selected' : ''}>${esc(label)}</option>`).join('')}
  </select>`;
}

function normalizedWatchlist(value){
  if(!Array.isArray(value))return [];
  const permittedCategories=new Set([
    'article','tense','agreement','word_choice','word_form','preposition',
    'sentence_structure','punctuation','coherence','task','naturalness',
    'spelling','other','word_order','particle','aspect','complement',
    'measure_word','ba_sentence','bei_sentence','conjunction',
    'character_choice','collocation','redundancy','register',
  ]);
  const numberValue=raw=>{
    if(typeof raw==='number'&&Number.isFinite(raw))return raw;
    if(typeof raw==='string'&&raw.trim()!==''){
      const parsed=Number(raw);
      if(Number.isFinite(parsed))return parsed;
    }
    return null;
  };
  return value
    .filter(item=>item&&typeof item==='object'&&!Array.isArray(item))
    .map(item=>{
      const category=typeof item.category==='string'?item.category.trim():'';
      const status=typeof item.status==='string'?item.status.trim().toLowerCase():'';
      const total=numberValue(item.total);
      const older=numberValue(item.older);
      const newer=numberValue(item.newer);
      if(!permittedCategories.has(category)||status!=='recurring'
        ||total===null||!Number.isInteger(total)||total<=0
        ||older===null||!Number.isInteger(older)||older<0
        ||newer===null||!Number.isInteger(newer)||newer<0
        ||total!==older+newer||total<3||older<1||newer<older)return null;
      return {...item,category,status,total,older,newer};
    })
    .filter(Boolean)
    .sort((a,b)=>b.total-a.total)
    .slice(0,4);
}

function asidePanel(config, adaptiveMode) {
  const support = supportState();
  const scaffold = writingScaffold(adaptiveMode, state.language);
  const watchlist = normalizedWatchlist(state.dashboard?.error_memory);
  const draftTopic = draftFieldText(state.draft.topic);
  const displayedTopic = draftTopic === 'random'
    ? ''
    : (config.topics.includes(draftTopic) ? topicLabel(draftTopic) : draftTopic);

  return `<aside class="o-card o-write-aside o-disclosure" data-open="true" aria-label="${attr(t('write.setup_panel'))}">
    ${disclosureHead('write.setup_panel')}
    <h2>${esc(t('write.setup_panel'))}</h2>

    <div class="o-disclosure__body">
      <div class="o-fields">
        ${fieldMarkup({
          id: 'practiceMode', labelKey: 'write.mode_short', infoKey: 'write.info_mode',
          control: selectControl('practiceMode', config.modes.map(([value]) => [value, practiceModeLabel(value)]), state.draft.mode),
        })}
        ${fieldMarkup({
          id: 'practiceLevel', labelKey: 'write.level', infoKey: 'help.target_band',
          control: selectControl('practiceLevel', config.levels.map(value => [value, `${value} · ${bandLabel(value)}`]), state.draft.level),
        })}
        <div class="o-field" id="lengthField">
          ${fieldHead('practiceLength', 'write.length_target', 'write.info_length')}
          ${selectControl('practiceLength', config.lengths.map(value => [value, `~${value} ${unitLabel(state.language)}`]), state.draft.length)}
        </div>
        <div class="o-field" id="topicField">
          ${fieldHead('practiceTopic', 'write.topic', 'write.info_topic')}
          <input id="practiceTopic" class="o-control" type="text" list="topicSuggestions"
                 value="${attr(displayedTopic)}"
                 placeholder="${attr(topicLabel('random'))}" maxlength="120">
          <datalist id="topicSuggestions">
            ${config.topics.map(value => `<option value="${attr(topicLabel(value))}"></option>`).join('')}
          </datalist>
        </div>
        <div class="o-field">
          ${fieldHead('practiceAudience', 'write.audience', 'write.info_audience')}
          <input id="practiceAudience" class="o-control" type="text"
                 value="${attr(draftFieldText(state.draft.audience))}"
                 placeholder="${attr(t('write.audience_placeholder'))}" maxlength="80">
        </div>
        ${state.draft.mode === 'custom' ? `<div class="o-field">
          ${fieldHead('customPrompt', 'write.custom_prompt', '')}
          <textarea id="customPrompt" class="o-control o-control--area" rows="4"
                    placeholder="${attr(t('write.custom_placeholder'))}">${esc(draftFieldText(state.draft.prompt))}</textarea>
        </div>` : ''}
      </div>

      <hr class="o-divider">

      <section class="o-aside-group o-disclosure" data-collapsible="always" data-open="true">
        ${disclosureHead('write.support')}
        <div class="o-disclosure__body o-support">
          ${SUPPORT_SWITCHES.map(([key, labelKey]) => `<label class="o-check">
            <input type="checkbox" data-support="${attr(key)}" ${support[key] ? 'checked' : ''}>
            <span class="o-check-box" aria-hidden="true">${oIcon('check')}</span>
            <span>${esc(t(labelKey))}</span>
          </label>`).join('')}
          <p class="o-support-note">${esc(t('write.info_support'))}</p>
        </div>
      </section>

      <section class="o-aside-group">
        <h3 class="o-label">${esc(t('write.word_roles'))}${infoButton(t('write.info_roles'))}</h3>
        <ul class="o-legend">
          ${WORD_ROLES.map(role => `<li data-role="${attr(role)}">
            <span class="o-legend-dot" aria-hidden="true"></span>
            <span>${esc(t(`write.role_${role}`))}</span>
          </li>`).join('')}
        </ul>
      </section>

      <section class="o-aside-group o-disclosure" data-collapsible="always" data-open="false">
        ${disclosureHead('write.guidance_short')}
        <div class="o-disclosure__body">
          <p class="o-label" style="margin:0 0 10px">${esc(guidanceLabel(adaptiveMode))} · ${esc(scaffold.title)}</p>
          <ol class="o-list">${scaffold.items.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
        </div>
      </section>

      ${watchlist.length ? `<section class="o-aside-group o-disclosure" data-collapsible="always" data-open="false">
        ${disclosureHead('write.watchlist')}
        <div class="o-disclosure__body">
          <ul class="o-list">
            ${watchlist.map(item => {
              const older = Number(item.older) || 0;
              const newer = Number(item.newer) || 0;
              const trend = newer < older ? 'down' : newer > older ? 'up' : 'flat';
              return `<li>${esc(categoryLabel(item.category))} · ${esc(String(item.total))} · ${esc(t('write.trend_' + trend))}</li>`;
            }).join('')}
          </ul>
          <p class="o-support-note">${esc(t('write.watchlist_note'))}</p>
        </div>
      </section>` : ''}

      ${state.language === 'zh' && state.profile?.pinyin !== 'off' ? `<section class="o-aside-group">
        <h3 class="o-label">${esc(t('write.pinyin'))}${infoButton(supportCopy('pinyin_tip', state.profile || {}))}</h3>
        <p style="margin:0;font-size:var(--o-text-ui);color:var(--o-ink-muted)">${esc(t('write.pinyin_body'))}</p>
      </section>` : ''}
    </div>
  </aside>`;
}

export async function renderWrite(root) {
  const config = configFor(state.language);
  if (!state.draft || typeof state.draft !== 'object' || Array.isArray(state.draft)) {
    state.draft = {};
  }
  const modeValues = new Set(config.modes.map(([value]) => value));
  const invalidLevel = !config.levels.includes(state.draft.level);
  const invalidMode = !modeValues.has(state.draft.mode);
  const invalidLength = !config.lengths.includes(state.draft.length);
  const invalidTopic = state.draft.topic !== 'random' && typeof state.draft.topic !== 'string';
  const parentEssayId = state.draft.parentEssayId;
  const invalidParentEssayId = parentEssayId != null
    && (typeof parentEssayId !== 'number' || !Number.isInteger(parentEssayId) || parentEssayId <= 0);
  if (invalidLevel) {
    saveDraft({
      level: config.defaultLevel, length: config.defaultLength,
      mode: 'free', topic: invalidTopic ? 'random' : state.draft.topic,
      prompt: '', generatedTask: null, practiceContext: null,
    });
  } else if (invalidMode || invalidLength || invalidTopic) {
    saveDraft({
      level: state.draft.level,
      length: invalidLength ? config.defaultLength : state.draft.length,
      mode: invalidMode ? 'free' : state.draft.mode,
      topic: invalidTopic ? 'random' : state.draft.topic,
      prompt: '', generatedTask: null, practiceContext: null,
    });
  }
  if (invalidParentEssayId) saveDraft({parentEssayId: null});

  // Home populates state.dashboard, but a learner can land on Write directly.
  // A failure here must never block writing.
  if (!state.dashboard) {
    try { state.dashboard = await api.dashboard(); } catch { /* write without it */ }
  }

  const adaptiveMode = guidanceMode(state.profile || {}, state.language, state.draft.level);

  root.innerHTML = `<div class="o-page">
    <div class="o-write">
      <div class="o-write-main">
        ${promptCard(config)}
        ${editorCard(config)}
        <div class="o-write-actions">
          <button id="clearDraft" class="o-btn o-btn--outline" type="button">${oIcon('trash')}<span>${esc(t('write.clear_draft'))}</span></button>
          <button id="reviewDraft" class="o-btn o-btn--primary" type="button"><span>${esc(t('write.review_draft'))}</span>${oIcon('arrowRight')}</button>
        </div>
      </div>
      ${asidePanel(config, adaptiveMode)}
    </div>
    <div class="o-write-sticky">
      <button id="reviewDraftMobile" class="o-btn o-btn--primary" type="button"><span>${esc(t('write.review_draft'))}</span>${oIcon('arrowRight')}</button>
    </div>
  </div>`;

  installDisclosures(root);
  // renderWrite re-renders itself when the mode or level changes, and that
  // path does not go back through the router's post-render pass.
  installSelectEnhancements(root);

  const editor = root.querySelector('#writingEditor');
  const count = root.querySelector('#editorCount');
  const savedStamp = root.querySelector('#savedStamp');
  const lookup = root.querySelector('#lookupSelection');

  /* ---------------------------------------------------------- editor --- */

  function persist() {
    saveDraft({
      html: editor.innerHTML,
      text: editor.innerText,
      savedAt: Date.now(),
    });
    count.textContent = `${countUnits(editor.innerText, state.language)} ${unitLabel(state.language)}`;
    savedStamp.textContent = savedLabel(state.draft.savedAt);
  }

  function syncToolbar() {
    root.querySelectorAll('.o-tool[data-command]').forEach(button => {
      const command = button.dataset.command;
      if (['bold', 'italic', 'underline', 'insertUnorderedList', 'insertOrderedList'].includes(command)) {
        let active = false;
        try { active = document.queryCommandState(command); } catch { active = false; }
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    });
  }

  /* The last caret or selection inside the editor.
   *
   * A toolbar button has to act on what the writer had selected, but the act of
   * reaching the button can move the selection: on a phone the tap blurs the
   * editor, and calling focus() to bring it back drops the caret at a default
   * position rather than where the writer left it. Remembering the range and
   * restoring it before the command runs is what makes the toolbar act on the
   * right text every time. */
  let lastRange = null;

  function rememberRange() {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) lastRange = range.cloneRange();
  }

  function restoreRange() {
    const selection = window.getSelection?.();
    if (!selection) return;
    if (lastRange) {
      selection.removeAllRanges();
      selection.addRange(lastRange);
      return;
    }
    editor.focus();
  }

  function syncSelection() {
    const selection = window.getSelection?.();
    const inEditor = Boolean(selection?.anchorNode && editor.contains(selection.anchorNode));
    const selected = inEditor ? String(selection.toString() || '').trim().slice(0, 180) : '';
    lookup.hidden = !selected;
    lookup.dataset.term = selected;
  }

  editor.addEventListener('input', () => { persist(); rememberRange(); syncToolbar(); });
  editor.addEventListener('keyup', () => { rememberRange(); syncToolbar(); syncSelection(); });
  editor.addEventListener('mouseup', () => { rememberRange(); syncToolbar(); syncSelection(); });
  document.addEventListener('selectionchange', rememberRange);

  // Pasting formatted text from elsewhere should not import a foreign
  // stylesheet into the draft.
  editor.addEventListener('paste', event => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  });

  root.querySelectorAll('.o-tool[data-command]').forEach(button => {
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      const command = button.dataset.command;
      restoreRange();
      if (command === 'createLink') {
        const href = window.prompt(t('write.tool_link_prompt'), 'https://');
        if (!href) return;
        document.execCommand('createLink', false, href);
      } else {
        document.execCommand(command);
      }
      persist();
      syncToolbar();
    });
  });

  const blockFormat = root.querySelector('#blockFormat');
  blockFormat.addEventListener('change', () => {
    restoreRange();
    document.execCommand('formatBlock', false, blockFormat.value);
    persist();
  });

  lookup.addEventListener('click', async () => {
    const term = lookup.dataset.term || '';
    if (!term) return;
    await openDictionary(term, {
      title: state.language === 'zh' ? `Pinyin · ${t('dictionary.title')}` : t('dictionary.title'),
      language: state.language,
      context: editor.innerText || state.draft.text || '',
    });
  });

  /* The saved stamp is a relative time, so it goes stale on its own. */
  const savedTicker = window.setInterval(() => {
    savedStamp.textContent = savedLabel(state.draft.savedAt);
  }, 30000);
  root._cleanupScreen = () => {
    window.clearInterval(savedTicker);
    document.removeEventListener('selectionchange', rememberRange);
  };

  /* ----------------------------------------------------------- setup --- */

  const mode = root.querySelector('#practiceMode');
  const level = root.querySelector('#practiceLevel');
  const length = root.querySelector('#practiceLength');
  const topic = root.querySelector('#practiceTopic');
  const audience = root.querySelector('#practiceAudience');

  mode.addEventListener('change', () => {
    saveDraft({mode: mode.value, prompt: '', generatedTask: null, practiceContext: null});
    renderWrite(root);
  });

  level.addEventListener('change', () => {
    saveDraft({level: level.value});
    renderWrite(root);
  });

  length.addEventListener('change', () => {
    saveDraft({length: Number(length.value), generatedTask: null, practiceContext: null});
  });

  topic.addEventListener('input', () => {
    saveDraft({topic: draftTopicValue(topic.value), generatedTask: null, practiceContext: null});
  });

  audience.addEventListener('input', () => saveDraft({audience: audience.value}));

  const customPrompt = root.querySelector('#customPrompt');
  customPrompt?.addEventListener('input', () => saveDraft({prompt: customPrompt.value}));

  root.querySelectorAll('[data-support]').forEach(box => {
    box.addEventListener('change', () => {
      saveDraft({support: {...supportState(), [box.dataset.support]: box.checked}});
    });
  });

  /* --------------------------------------------------------- actions --- */

  root.querySelector('#viewRubric').addEventListener('click', () => {
    showDialog(t('write.rubric_title'), `<p>${esc(t('write.rubric_intro'))}</p>
      <ul class="o-legend" style="margin-top:16px">
        ${RUBRIC_CATEGORIES.map(key => `<li style="align-items:flex-start">
          <span class="o-legend-dot" aria-hidden="true" style="margin-top:7px"></span>
          <span><strong>${esc(categoryLabel(key))}</strong><br>${esc(t(`rubric.${key}`))}</span>
        </li>`).join('')}
      </ul>`);
  });

  root.querySelector('#generateBrief')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    try {
      await runBusy(button, async () => {
        const task = await api.generateTask({
          task_type: taskTypeValue(state.draft.mode, state.language),
          topic: draftTopicValue(state.draft.topic),
          target_cefr: evaluatorLevelValue(state.draft.level, state.language),
          word_target: taskWordTargetValue(state.draft.length, state.language),
        });
        saveDraft({generatedTask: task, practiceContext: null, prompt: task.prompt || ''});
        toast(task.source === 'built-in' ? t('write.builtin_ready') : t('write.brief_ready'));
        renderWrite(root);
      }, {label: t('busy.creating')});
    } catch (error) {
      toast(error.message || t('write.brief_failed'));
    }
  });

  root.querySelector('#clearDraft').addEventListener('click', () => {
    if (!editor.innerText.trim()) return;
    if (!window.confirm(t('write.clear_confirm'))) return;
    editor.innerHTML = '';
    // The remembered range points into nodes that no longer exist.
    lastRange = null;
    saveDraft({html: '', text: '', savedAt: null, parentEssayId: null});
    count.textContent = `0 ${unitLabel(state.language)}`;
    savedStamp.textContent = savedLabel(null);
    editor.focus();
  });

  async function submitForReview(button) {
    // The evaluator reads prose, not markup: the draft keeps its formatting
    // locally while the request carries the plain text it has always carried.
    const text = editor.innerText.trim();
    if (text.length < 10) {
      toast(t('write.short_first'));
      editor.focus();
      return;
    }

    const practiceContext = evaluationPracticeContext();
    const evaluateOnce = parentEssayId => api.evaluate({
      prompt: promptText(),
      text,
      target_cefr: evaluatorLevelValue(state.draft.level, state.language),
      learning_language: evaluatorLanguageValue(state.language),
      parent_essay_id: parentEssayId || null,
      practice_context: practiceContext,
    });

    try {
      await runBusy(button, async () => {
        let result;
        const requestedParentId = draftParentEssayIdValue(state.draft.parentEssayId);
        try {
          result = await evaluateOnce(requestedParentId);
        } catch (error) {
          // A locally remembered parent essay can go stale (deleted, or from a
          // different learning-language scope). Recover by saving the
          // learner's text as a fresh entry instead of losing it.
          if (requestedParentId && error.status === 404 && error.category === 'parent_essay_not_found') {
            saveDraft({parentEssayId: null});
            toast(t('write.parent_missing_retry'));
            result = await evaluateOnce(null);
          } else {
            throw error;
          }
        }

        if (result.id && practiceContext) {
          try {
            const outcomePayload = await api.practiceOutcome(result.id);
            result.practice_outcome = outcomePayload?.outcome || null;
          } catch {
            result.practice_outcome = null;
          }
        }

        state.lastEvaluation = result;
        saveDraft({text, html: editor.innerHTML, parentEssayId: result.id});
        go('review');
      }, {label: [
        t('busy.preparing_review'),
        t('busy.preparing_review_2'),
        t('busy.preparing_review_3'),
        t('busy.preparing_review_4'),
      ]});
    } catch (error) {
      toast(writingEvaluationErrorMessage(error));
    }
  }

  root.querySelector('#reviewDraft').addEventListener('click', event => submitForReview(event.currentTarget));
  root.querySelector('#reviewDraftMobile').addEventListener('click', event => submitForReview(event.currentTarget));

  syncToolbar();
  editor.focus();
}
