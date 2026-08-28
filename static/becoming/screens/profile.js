import {api} from '../api.js';
import {
  state,
  saveProfile,
  clearProfile,
  setSupportLanguage,
} from '../store.js';
import {
  esc,
  attr,
  toast,
  loadingBlock,
  spinner,
} from '../components/primitives.js';
import {configFor} from '../language.js';
import {go} from '../router.js';
import {installSelectEnhancements,syncSelectField} from '../components/select-field.js';
import {t,localeLabel,applyChromeI18n,uiLocale} from '../domain/i18n.js';
import {
  applyPalette,
  activePalette,
  applyTheme,
  activeTheme,
  THEME_PALETTES,
} from '../theme.js';
import {deriveGrowthRank} from '../domain/rank.js';
import {growthRankFrame} from '../components/rank-frame.js';
import {oIcon} from '../orena/icons.js';

/* ORENA-PROFILE-*: preferences as a settings sheet.
 *
 * The reference groups every preference into one card - Learning, Learning
 * experience, Appearance, Account - with the name and its explanation on the
 * left of each row and the control on the right.
 *
 * Three of its rows are not built, and the reason is the same each time: this
 * product has nothing behind them.
 *
 *   Password        - sign-in is Google OAuth. There is no password to change,
 *                     so the row says how you actually sign in instead.
 *   Plan / Manage   - there is no billing anywhere in this product. The plan
 *     subscription     row states the one true fact: every feature is on.
 *   Delete account  - no endpoint exists, and account deletion is an explicit
 *                     human gate rather than something a screen may offer.
 *
 * The reference's "Quick links" (keyboard shortcuts, help centre, what's new)
 * are left out for the same reason: none of those destinations exist. A link
 * that goes nowhere is worse than no link.
 */

const GOALS=['everyday','work','exam','voice'];
const STYLES=['guided','examples','concise','deep'];
const NATIVE_LANGUAGES=['vi','en','zh'];
/* Spelled out rather than assembled from a template, so the three copy keys
   are greppable: a key that only exists as `profile.pinyin_${mode}` cannot be
   found by anything that reads this file, the release gate included. */
const PINYIN_MODES=[
  ['auto','profile.pinyin_auto'],
  ['on','profile.pinyin_on'],
  ['off','profile.pinyin_off'],
];
const pinyinKey=mode=>(PINYIN_MODES.find(([value])=>value===mode)||PINYIN_MODES[0])[1];
const MODES=['light','dark'];
const FEATURE_LABELS={
  en:{'writing.evaluate':'Writing evaluation','writing.improve':'Writing improvements','library.grammar':'Grammar library','dictionary.lookup':'Dictionary lookups','vocabulary.save':'Saved vocabulary','analytics.basic':'Basic analytics','analytics.advanced':'Advanced analytics','practice.personalized':'Personalized practice','export.report':'Report export'},
  vi:{'writing.evaluate':'Đánh giá bài viết','writing.improve':'Cải thiện bài viết','library.grammar':'Thư viện ngữ pháp','dictionary.lookup':'Tra từ điển','vocabulary.save':'Từ vựng đã lưu','analytics.basic':'Phân tích cơ bản','analytics.advanced':'Phân tích nâng cao','practice.personalized':'Luyện tập cá nhân hóa','export.report':'Xuất báo cáo'},
  zh:{'writing.evaluate':'写作评估','writing.improve':'写作改进','library.grammar':'语法库','dictionary.lookup':'词典查询','vocabulary.save':'已保存词汇','analytics.basic':'基础分析','analytics.advanced':'高级分析','practice.personalized':'个性化练习','export.report':'报告导出'},
};
const PLAN_NAMES={en:{free:'Free plan',premium:'Premium plan'},vi:{free:'Gói miễn phí',premium:'Gói Premium'},zh:{free:'免费方案',premium:'Premium 方案'}};

const COPY={
  en:{
    learning:'Learning',
    experience:'Learning experience',
    appearance:'Appearance',
    account:'Account',
    session:'Session',
    palette:'Colour family',
    mode:'Theme',
    modeDesc:'Choose your preferred theme.',
    light:'Light',
    dark:'Dark',
    setupAgain:'Run setup again',
    setupAgainDesc:'Answer the opening questions once more and rebuild these preferences from scratch.',
    name:'Name',
    email:'Email',
    signIn:'Sign-in',
    signInGoogle:'Google account',
    signInLocal:'Local mode — this instance does not ask you to sign in',
    fromGoogle:'From your Google account.',
    notSignedIn:'Not signed in',
    plan:'Plan',
    switchAccount:'Switch account',
    signOut:'Sign out',
    quickLinks:'Quick links',
    linkJourney:'Your journey',
    linkJourneyNote:'Where the evidence and progress these settings never touch actually live.',
    linkLibrary:'Your library',
    linkLibraryNote:'Every word you have saved, in both languages.',
    aboutTitle:'About your settings',
    aboutBody:'These preferences shape how Orena supports your learning.',
    about1:'You can change any of them at any time.',
    about2:'Your writing evidence, saved words and progress are not affected.',
    about3:'Changes apply to what you do next, not to work already reviewed.',
  },
  vi:{
    learning:'Học tập',
    experience:'Trải nghiệm học',
    appearance:'Giao diện',
    account:'Tài khoản',
    session:'Phiên đăng nhập',
    palette:'Bảng màu',
    mode:'Chế độ hiển thị',
    modeDesc:'Chọn chế độ sáng hoặc tối.',
    light:'Sáng',
    dark:'Tối',
    setupAgain:'Chạy lại phần thiết lập',
    setupAgainDesc:'Trả lời lại các câu hỏi ban đầu và dựng lại toàn bộ tùy chỉnh từ đầu.',
    name:'Tên',
    email:'Email',
    signIn:'Cách đăng nhập',
    signInGoogle:'Tài khoản Google',
    signInLocal:'Chế độ cục bộ — bản cài này không yêu cầu đăng nhập',
    fromGoogle:'Lấy từ tài khoản Google của bạn.',
    notSignedIn:'Chưa đăng nhập',
    plan:'Gói',
    switchAccount:'Đổi tài khoản',
    signOut:'Đăng xuất',
    quickLinks:'Lối tắt',
    linkJourney:'Hành trình của bạn',
    linkJourneyNote:'Nơi lưu bằng chứng và tiến trình mà các tùy chỉnh này không đụng tới.',
    linkLibrary:'Thư viện của bạn',
    linkLibraryNote:'Mọi từ bạn đã lưu, ở cả hai ngôn ngữ.',
    aboutTitle:'Về các tùy chỉnh này',
    aboutBody:'Các tùy chỉnh này quyết định cách Orena đồng hành cùng việc học của bạn.',
    about1:'Bạn có thể đổi lại bất cứ lúc nào.',
    about2:'Bằng chứng bài viết, từ đã lưu và tiến trình học không bị ảnh hưởng.',
    about3:'Thay đổi áp dụng cho những gì bạn làm tiếp theo, không sửa lại phần đã nhận xét.',
  },
  zh:{
    learning:'学习',
    experience:'学习体验',
    appearance:'外观',
    account:'账户',
    session:'登录状态',
    palette:'配色系列',
    mode:'明暗模式',
    modeDesc:'选择你偏好的明暗模式。',
    light:'浅色',
    dark:'深色',
    setupAgain:'重新进行初始设置',
    setupAgainDesc:'重新回答开始时的问题，从头建立这些偏好。',
    name:'姓名',
    email:'邮箱',
    signIn:'登录方式',
    signInGoogle:'Google 账户',
    signInLocal:'本地模式 — 此实例无需登录',
    fromGoogle:'来自你的 Google 账户。',
    notSignedIn:'尚未登录',
    plan:'方案',
    switchAccount:'切换账户',
    signOut:'退出登录',
    quickLinks:'快速入口',
    linkJourney:'你的学习历程',
    linkJourneyNote:'这些设置不会改动的证据与进度都在这里。',
    linkLibrary:'你的词汇库',
    linkLibraryNote:'你保存过的所有词，两种语言都在。',
    aboutTitle:'关于这些设置',
    aboutBody:'这些偏好决定 Orena 以什么方式陪伴你的学习。',
    about1:'随时都可以再改。',
    about2:'你的写作证据、已存词汇和学习进度不会受到影响。',
    about3:'更改只影响你接下来要做的事，不会改写已经批阅过的内容。',
  },
};

function copy(){
  return COPY[uiLocale()]||COPY.en;
}

/* The reference shows a flag inside the language control, so the control says
   which language before it is read. These are drawn rather than emoji: the flag
   emoji have no glyph on Windows and fall back to two letters in a box.
 *
 * A flag is a country and a language is not, which is why the fallback below is
 * a globe: it is used for any language whose flag would be a guess. English is
 * drawn as the reference draws it.
 */
const FLAGS={
  en:`<svg class="o-flag" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect y="4" width="24" height="16" rx="2.6" fill="#F5F5F7"/><g fill="#D7362F"><rect y="4" width="24" height="2.3"/><rect y="8.6" width="24" height="2.3"/><rect y="13.2" width="24" height="2.3"/><rect y="17.7" width="24" height="2.3"/></g><path d="M0 6.6A2.6 2.6 0 0 1 2.6 4H11v7.2H0Z" fill="#2C3E8F"/></svg>`,
  zh:`<svg class="o-flag" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect y="4" width="24" height="16" rx="2.6" fill="#DE2910"/><path d="m6.4 7 .85 2.5 2.6.03-2.1 1.55.77 2.5-2.12-1.5-2.12 1.5.77-2.5-2.1-1.55 2.6-.03z" fill="#FFDE00"/></svg>`,
  vi:`<svg class="o-flag" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect y="4" width="24" height="16" rx="2.6" fill="#DA251D"/><path d="m12 7.4 1.28 3.75 3.95.05-3.18 2.33 1.17 3.78L12 15.05 8.78 17.3l1.17-3.78-3.18-2.33 3.95-.05z" fill="#FFDE00"/></svg>`,
};

function flagFor(code){
  return FLAGS[code]||oIcon('globe');
}

/* An info affordance that is a real button, so a keyboard reaches it and the
   global tooltip layer announces it. */
function info(text){
  if(!text)return '';
  return `<button class="o-info" type="button" tabindex="0" data-tooltip="${attr(text)}" aria-label="${attr(t('chrome.details'))}">${oIcon('info')}</button>`;
}

function optionMarkup(value,label,selected){
  return `<option value="${attr(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`;
}

/* Name, explanation, control. The label is a real <label for>, so the enhanced
   listbox inherits the name the native select already had. */
function settingRow({id,label,tip,desc,options,value,icon,iconMarkup}){
  const glyph=iconMarkup||(icon?oIcon(icon):'');
  return `<div class="o-set-row">
    <div class="o-set-copy">
      <span class="o-set-label"><label for="${attr(id)}">${esc(label)}</label>${tip?info(tip):''}</span>
      ${desc?`<p>${esc(desc)}</p>`:''}
    </div>
    <div class="o-set-control">
      <select id="${attr(id)}" name="${attr(id)}"${glyph?` data-icon="${attr(glyph)}"`:''}>
        ${options.map(([optionValue,optionLabel])=>optionMarkup(optionValue,optionLabel,value)).join('')}
      </select>
    </div>
  </div>`;
}

/* A row whose right side is a fact rather than a choice. */
function factRow({label,value,note,tip}){
  return `<div class="o-set-row">
    <div class="o-set-copy">
      <span class="o-set-label">${esc(label)}${tip?info(tip):''}</span>
    </div>
    <div class="o-set-value">
      <strong>${esc(value)}</strong>
      ${note?`<small>${esc(note)}</small>`:''}
    </div>
  </div>`;
}

function actionRow({action,label,desc,quiet}){
  return `<button type="button" class="o-set-action ${quiet?'o-set-action--quiet':''}" data-profile-action="${attr(action)}">
    <span class="o-set-copy">
      <span class="o-set-label">${esc(label)}</span>
      ${desc?`<span class="o-set-note">${esc(desc)}</span>`:''}
    </span>
    ${oIcon('chevronRight')}
  </button>`;
}

function themeChoice(value,current){
  return `<label class="theme-choice ${current===value?'selected':''}">
    <input type="radio" name="profileTheme" value="${value}" ${current===value?'checked':''}>
    <span class="theme-swatch palette-${value}" aria-hidden="true">
      <i></i><b></b><em></em>
    </span>
    <span>
      <strong>${t(`theme.${value}`)}</strong>
      <small>${t(`theme.${value}_desc`)}</small>
    </span>
  </label>`;
}

/* "Auto — show Pinyin for visible feedback evidence" is one string in every
   locale: the head names the choice and the tail explains it. The control shows
   the head, the row shows the tail, rather than a control carrying a sentence. */
function splitOption(text){
  const parts=String(text).split('—');
  return {
    head:(parts[0]||text).trim(),
    tail:parts.slice(1).join('—').trim(),
  };
}

function statusMarkup(){
  return `<div id="profileSaveStatus" class="profile-save-status" aria-live="polite"></div>`;
}

function accountPlanMarkup(account){
  const locale=uiLocale();
  if(!account || account.available===false){
    return `<div class="profile-plan-state unavailable">${esc(t('profile.plan_unavailable'))}</div>`;
  }
  const planId=account.plan?.id==='premium'?'premium':'free';
  const planName=PLAN_NAMES[locale]?.[planId]||PLAN_NAMES.en[planId];
  const state=account.plan_state==='active'?t('profile.plan_active'):account.plan_state==='unknown'?t('profile.plan_unknown'):t('profile.plan_default');
  const features=Object.entries(account.features||{}).map(([key,item])=>{
    const label=FEATURE_LABELS[locale]?.[key]||FEATURE_LABELS.en[key]||key;
    let usage=t('profile.usage_unavailable');
    if(item.usage_state==='known'){
      usage=item.monthly_limit===null?t('profile.unlimited'):
        item.remaining===0?t('profile.exhausted',{limit:item.monthly_limit}):
        t('profile.remaining',{remaining:item.remaining,limit:item.monthly_limit});
    }
    return `<li><span>${esc(label)}</span><small>${esc(usage)}</small></li>`;
  }).join('');
  return `<div class="profile-plan-state"><strong>${esc(planName)}</strong><small>${esc(state)}</small><ul class="profile-plan-features">${features}</ul></div>`;
}

export async function renderProfile(root){
  if(typeof root._cleanupProfile==='function')root._cleanupProfile();
  root.innerHTML=`<section class="o-page">${loadingBlock(3)}</section>`;

  let memory={};
  try{
    memory=await api.learningMemory();
  }catch{
    memory={};
  }
  let accountState=null;
  try{accountState=await api.productMe();}catch{accountState={available:false};}

  const c=copy();
  const profile=state.profile||{
    language:state.language,
    goal:'everyday',
    style:'guided',
    pinyin:'auto',
    native_language:state.supportLanguage||'vi',
    theme_preset:activePalette(),
  };
  const rank=deriveGrowthRank(memory);
  const themePreset=profile.theme_preset||activePalette();
  const pinyinMode=profile.pinyin||'auto';
  const me=state.me||{};
  const signedIn=Boolean(me.email);

  root.innerHTML=`<section class="o-page profile-page o-fit">
    ${statusMarkup()}

    <div class="o-prefs">
      <div class="o-card o-set">

        <section class="o-set-group">
          <h2 class="o-set-title">${esc(c.learning)}</h2>
          <div class="o-set-body">
            ${settingRow({
              id:'profileLanguage',
              label:t('profile.learning_language'),
              tip:t('profile.learning_language_desc'),
              iconMarkup:flagFor(state.language),
              options:[['en','English'],['zh','中文']],
              value:state.language,
            })}
            ${settingRow({
              id:'profileNativeLanguage',
              label:t('profile.interface_language'),
              tip:t('profile.interface_language_desc'),
              iconMarkup:flagFor(profile.native_language||'vi'),
              options:NATIVE_LANGUAGES.map(value=>[value,localeLabel(value)]),
              value:profile.native_language||'vi',
            })}
            ${settingRow({
              id:'profileGoal',
              label:t('profile.current_goal'),
              desc:t('profile.current_goal_desc'),
              icon:'flag',
              options:GOALS.map(value=>[value,t(`profile.goal.${value}`)]),
              value:profile.goal||'everyday',
            })}
          </div>
        </section>

        <section class="o-set-group">
          <h2 class="o-set-title">${esc(c.experience)}</h2>
          <div class="o-set-body">
            ${settingRow({
              id:'profileStyle',
              label:t('profile.guidance_style'),
              desc:t('profile.guidance_style_desc'),
              icon:'sliders',
              options:STYLES.map(value=>[value,t(`profile.style.${value}`)]),
              value:profile.style||'guided',
            })}
            ${state.language==='zh'?settingRow({
              id:'profilePinyin',
              label:t('profile.pinyin'),
              tip:t('profile.pinyin_desc'),
              desc:splitOption(t(pinyinKey(pinyinMode))).tail,
              options:PINYIN_MODES.map(([value,key])=>[value,splitOption(t(key)).head]),
              value:pinyinMode,
            }):''}
          </div>
        </section>

        <section class="o-set-group">
          <h2 class="o-set-title">${esc(c.appearance)}</h2>
          <div class="o-set-body">
            ${settingRow({
              id:'profileMode',
              label:c.mode,
              desc:c.modeDesc,
              icon:activeTheme()==='dark'?'moon':'sun',
              options:MODES.map(value=>[value,c[value]]),
              value:activeTheme(),
            })}
            <div class="o-set-block">
              <div class="o-set-copy">
                <span class="o-set-label">${esc(c.palette)}${info(t('theme.mode_tip'))}</span>
                <p>${esc(t('theme.description'))}</p>
              </div>
              <div class="theme-choice-grid">
                ${THEME_PALETTES.map(value=>themeChoice(value,themePreset)).join('')}
              </div>
              <p class="o-set-foot">${esc(t('profile.theme_status'))}</p>
            </div>
          </div>
        </section>

        <section class="o-set-group">
          <h2 class="o-set-title">${esc(c.account)}</h2>
          <div class="o-set-body o-set-list">
            ${factRow({
              label:c.name,
              value:me.name||c.notSignedIn,
              note:signedIn?c.fromGoogle:'',
            })}
            ${signedIn?factRow({label:c.email,value:me.email}):''}
            ${factRow({
              label:c.signIn,
              value:signedIn?c.signInGoogle:c.signInLocal,
            })}
            ${factRow({
              label:c.plan,
              value:accountState?.available===false?t('profile.plan_unavailable'):(PLAN_NAMES[uiLocale()]?.[accountState?.plan?.id]||PLAN_NAMES.en[accountState?.plan?.id]||t('chrome.plan_free')),
              note:accountState?.available===false?'':(accountState?.plan_state==='active'?t('profile.plan_active'):t('profile.plan_default')),
            })}
            <div class="profile-account-entitlements">${accountPlanMarkup(accountState)}</div>
          </div>
        </section>

        ${signedIn?`<section class="o-set-group">
          <h2 class="o-set-title">${esc(c.session)}</h2>
          <div class="o-set-body o-set-list">
            ${actionRow({action:'switch-account',label:c.switchAccount,quiet:true})}
            ${actionRow({action:'sign-out',label:c.signOut,quiet:true})}
          </div>
        </section>`:''}

      </div>

      <!-- Not pinned: with the links added, the rail is as long as the form, so
           pinning it only bought a second scrollbar inside a column that was
           already going to scroll with the page. -->
      <aside class="profile-identity-stack visual-identity-column">
        ${growthRankFrame(rank)}

<section class="o-card o-about">
          <div class="o-about-head">
            <span class="o-about-tile" aria-hidden="true">${oIcon('sliders')}</span>
            <h2>${esc(c.aboutTitle)}</h2>
          </div>
          <p>${esc(c.aboutBody)}</p>
          <ul class="o-about-points">
            ${[c.about1,c.about2,c.about3].map(line=>`<li>${oIcon('check')}<span>${esc(line)}</span></li>`).join('')}
          </ul>

          <hr class="o-divider">

          <!-- The reference closes this card with a list of links. Its three
               (shortcuts, help centre, what's new) have no destination in this
               product, so the list carries the ones that do - including the
               setup run, which is a journey out of this screen rather than a
               row of the form. -->
          <h3 class="o-quick-title">${esc(c.quickLinks)}</h3>
          <div class="o-quick">
            <a class="o-quick-row" href="#/journey">
              <span>
                <strong>${esc(c.linkJourney)}</strong>
                <small>${esc(c.linkJourneyNote)}</small>
              </span>
              ${oIcon('chevronRight')}
            </a>
            <a class="o-quick-row" href="#/library">
              <span>
                <strong>${esc(c.linkLibrary)}</strong>
                <small>${esc(c.linkLibraryNote)}</small>
              </span>
              ${oIcon('chevronRight')}
            </a>
            <button type="button" class="o-quick-row" data-profile-action="redo-onboarding">
              <span>
                <strong>${esc(c.setupAgain)}</strong>
                <small>${esc(c.setupAgainDesc)}</small>
              </span>
              ${oIcon('chevronRight')}
            </button>
          </div>
        </section>
      </aside>
    </div>
  </section>`;


  /* This screen re-renders itself when a preference changes, and that path does
     not go back through the router's post-render pass - without this the
     listbox enhancement is lost and the native select comes back. */
  installSelectEnhancements(root);

  const status=root.querySelector('#profileSaveStatus');

  function setSaving(label=t('busy.saving')){
    if(status)status.innerHTML=spinner(label);
  }

  function clearSaving(){
    if(status)status.innerHTML='';
  }

  async function persistProfile(patch,messageKey='toast.preference_saved'){
    const next={
      goal:patch.goal??state.profile?.goal??'everyday',
      style:patch.style??state.profile?.style??'guided',
      pinyin:patch.pinyin??state.profile?.pinyin??'auto',
      native_language:patch.native_language??state.profile?.native_language??state.supportLanguage??'vi',
      theme_preset:patch.theme_preset??state.profile?.theme_preset??activePalette(),
    };

    setSaving();
    try{
      const saved=await api.saveLearnerProfile(next);
      setSupportLanguage(saved.native_language||next.native_language||'vi');
      applyPalette(saved.theme_preset||next.theme_preset||'editorial',{persist:true});
      saveProfile(saved);
      applyChromeI18n();
      toast(t(messageKey));
      return saved;
    }catch(error){
      toast(error.message||t('dictionary.failed'));
      throw error;
    }finally{
      clearSaving();
    }
  }

  function onChange(id,handler){
    root.querySelector(`#${id}`)?.addEventListener('change',event=>handler(event.currentTarget.value));
  }

  function restoreSelect(id,value){
    const select=root.querySelector(`#${id}`);
    if(!select)return;
    select.value=value;
    syncSelectField(select);
  }

  onChange('profileLanguage',async value=>{
    setSaving(t('busy.switching'));
    try{
      await api.setLanguage(value);
      toast(t('toast.learning_space',{space:configFor(value).name}));
      window.dispatchEvent(new CustomEvent('becoming:language-changed',{detail:{language:value}}));
    }catch(error){
      toast(error.message||t('toast.switch_failed'));
      restoreSelect('profileLanguage',state.language);
    }finally{
      clearSaving();
    }
  });

  onChange('profileGoal',async value=>{
    const previous=state.profile?.goal||'everyday';
    try{await persistProfile({goal:value},'toast.goal_saved');}
    catch{restoreSelect('profileGoal',previous);}
  });
  onChange('profileStyle',async value=>{
    const previous=state.profile?.style||'guided';
    try{await persistProfile({style:value},'toast.guidance_saved');}
    catch{restoreSelect('profileStyle',previous);}
  });

  onChange('profilePinyin',async value=>{
    const previous=state.profile?.pinyin||'auto';
    try{
      await persistProfile({pinyin:value},'toast.pinyin_saved');
      /* The row's explanation belongs to the chosen mode, so it is re-read
         from the same string the control was built from. */
      await renderProfile(root);
    }catch{restoreSelect('profilePinyin',previous);}
  });

  onChange('profileNativeLanguage',async value=>{
    const previous=state.profile?.native_language||state.supportLanguage||'vi';
    try{
      await persistProfile({native_language:value},'toast.interface_saved');
      await renderProfile(root);
      applyChromeI18n();
    }catch{restoreSelect('profileNativeLanguage',previous);}
  });

  /* Light and dark are a display preference held on this device, which is why
     the header button changes them too. They are not part of the server
     profile, so nothing is saved here. */
  onChange('profileMode',value=>{
    const mode=value==='dark'?'dark':'light';
    applyTheme(mode,{persist:true});
    /* The glyph inside the control is baked in at render time, and this change
       does not re-render the screen - so it is swapped here, or the control
       would keep showing a moon after the learner chose Light. */
    const select=root.querySelector('#profileMode');
    const glyph=oIcon(mode==='dark'?'moon':'sun');
    if(select){
      select.dataset.icon=glyph;
      const painted=select.closest('.orena-select')?.querySelector('.orena-select-icon');
      if(painted)painted.innerHTML=glyph;
    }
  });

  const syncProfileMode=()=>{
    const mode=activeTheme();
    const select=root.querySelector('#profileMode');
    if(!select)return;
    select.value=mode;
    select.dataset.icon=oIcon(mode==='dark'?'moon':'sun');
    syncSelectField(select);
  };
  window.addEventListener('becoming:theme-changed',syncProfileMode);
  const cleanupProfile=()=>{
    window.removeEventListener('becoming:theme-changed',syncProfileMode);
    if(root._cleanupProfile===cleanupProfile)delete root._cleanupProfile;
    if(root._cleanupScreen===cleanupProfile)delete root._cleanupScreen;
  };
  root._cleanupProfile=cleanupProfile;
  root._cleanupScreen=cleanupProfile;

  root.querySelectorAll('input[name="profileTheme"]').forEach(input=>{
    input.addEventListener('change',async()=>{
      const previous=activePalette();
      applyPalette(input.value,{persist:true});
      try{
        await persistProfile({theme_preset:input.value},'toast.theme_saved');
        root.querySelectorAll('.theme-choice').forEach(label=>{
          label.classList.toggle(
            'selected',
            label.querySelector('input')?.value===input.value,
          );
        });
      }catch{
        applyPalette(previous,{persist:true});
        input.checked=input.value===previous;
        root.querySelectorAll('.theme-choice').forEach(label=>{
          const option=label.querySelector('input');
          const selected=option?.value===previous;
          if(option)option.checked=selected;
          label.classList.toggle('selected',selected);
        });
      }
    });
  });

  root.querySelectorAll('[data-profile-action]').forEach(button=>{
    button.addEventListener('click',async()=>{
      const action=button.dataset.profileAction;
      if(action==='redo-onboarding'){
        clearProfile();
        go('onboarding');
        return;
      }
      if(action==='switch-account'){
        try{await api.logout();}finally{location.href='/auth/google';}
        return;
      }
      if(action==='sign-out'){
        try{await api.logout();}finally{location.href='/login';}
      }
    });
  });
}
