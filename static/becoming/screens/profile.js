import {api} from '../api.js';
import {
  state,
  saveProfile,
  clearProfile,
  setSupportLanguage,
} from '../store.js';
import {configFor} from '../language.js';
import {
  esc,
  toast,
  helpTip,
  loadingBlock,
  spinner,
} from '../components/primitives.js';
import {installSelectEnhancements,syncSelectField} from '../components/select-field.js';
import {go} from '../router.js';
import {t,localeLabel,applyChromeI18n} from '../domain/i18n.js';
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

const GOALS=['everyday','work','exam','voice'];
const STYLES=['guided','examples','concise','deep'];
const NATIVE_LANGUAGES=['vi','en','zh'];
const LANGUAGE_FLAGS={en:'ðŸ‡ºðŸ‡¸',zh:'ðŸ‡¨ðŸ‡³'};
const SUPPORT_FLAGS={vi:'ðŸ‡»ðŸ‡³',en:'ðŸ‡ºðŸ‡¸',zh:'ðŸ‡¨ðŸ‡³'};

function learningLanguageLabel(value){
  const language=(state.languages||[]).find(item=>item.code===value);
  return language?.native_name||language?.name||configFor(value).name;
}

function selectOptions(options,current){
  return options.map(({value,label})=>
    `<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`
  ).join('');
}

function selectSetting({
  id,
  name=id,
  label,
  description='',
  tip='',
  options=[],
  current='',
}){
  return `<div class="o-profile-setting">
    <div class="o-profile-setting-copy">
      <span class="o-profile-setting-label">
        <label for="${esc(id)}">${esc(label)}</label>
        ${tip?helpTip(tip,label):''}
      </span>
      ${description?`<small>${esc(description)}</small>`:''}
    </div>
    <div class="o-profile-setting-control">
      <select id="${esc(id)}" name="${esc(name)}" aria-label="${esc(label)}">
        ${selectOptions(options,current)}
      </select>
    </div>
  </div>`;
}

function themeChoice(value,current){
  return `<label class="theme-choice ${current===value?'selected':''}">
    <input type="radio" name="profileTheme" value="${esc(value)}" ${current===value?'checked':''}>
    <span class="theme-swatch palette-${esc(value)}" aria-hidden="true">
      <i></i><b></b><em></em>
    </span>
    <span>
      <strong>${esc(t(`theme.${value}`))}</strong>
      <small>${esc(t(`theme.${value}_desc`))}</small>
    </span>
  </label>`;
}

function sectionMarkup({title,className='',body}){
  return `<section class="profile-section ${className}">
    <h2>${esc(title)}</h2>
    <div class="o-profile-section-body">${body}</div>
  </section>`;
}

function accountRow({label,value='',actionId='',danger=false,note=''}){
  const content=`<span class="o-profile-account-copy">
    <span>${esc(label)}</span>
    ${note?`<small>${esc(note)}</small>`:''}
  </span>
  <span class="o-profile-account-value">${esc(value)}</span>
  ${actionId?`<span class="o-profile-row-chevron" aria-hidden="true">${oIcon('chevronRight')}</span>`:''}`;
  if(!actionId){
    return `<div class="o-profile-account-row">${content}</div>`;
  }
  return `<button id="${esc(actionId)}" class="o-profile-account-row is-action${danger?' is-danger':''}" type="button">${content}</button>`;
}

function statusMarkup(){
  return `<div id="profileSaveStatus" class="profile-save-status" aria-live="polite"></div>`;
}

function setProfileChromeTitle(){
  const title=t('profile.kicker');
  const pageTitle=document.getElementById('pageTitle');
  const pageHeading=document.getElementById('pageHeading');
  if(pageTitle)pageTitle.textContent=title;
  if(pageHeading)pageHeading.textContent=title;
}

export async function renderProfile(root){
  if(typeof root._cleanupProfile==='function')root._cleanupProfile();
  root.innerHTML=`<section class="page">${loadingBlock(3)}</section>`;

  let memory={};
  try{
    memory=await api.learningMemory();
  }catch{
    memory={};
  }

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
  const pinyinEnabled=(profile.pinyin||'auto')!=='off';
  const pinyinCopyKey=pinyinMode==='on'
    ?'profile.pinyin_on'
    :pinyinMode==='off'
      ?'profile.pinyin_off'
      :'profile.pinyin_auto';
  const accountName=state.me?.name||state.me?.email||t('chrome.account');
  const accountEmail=state.me?.email||t('profile.account_local');
  const planName=state.me?.plan_name||t('chrome.plan_free');

  setProfileChromeTitle();

  const learning=sectionMarkup({
    title:t('profile.section_learning'),
    body:[
      selectSetting({
        id:'profileLanguage',
        label:t('profile.learning_language'),
        tip:t('profile.learning_language_desc'),
        current:state.language,
        options:['en','zh'].map(value=>({
          value,
          label:`${LANGUAGE_FLAGS[value]}  ${learningLanguageLabel(value)}`,
        })),
      }),
      selectSetting({
        id:'profileNativeLanguage',
        label:t('profile.support_language'),
        tip:t('profile.interface_language_desc'),
        current:profile.native_language||'vi',
        options:NATIVE_LANGUAGES.map(value=>({
          value,
          label:`${SUPPORT_FLAGS[value]}  ${localeLabel(value)}`,
        })),
      }),
    ].join(''),
  });

  const pinyinSetting=state.language==='zh'
    ?`<div class="o-profile-setting">
        <div class="o-profile-setting-copy">
          <span class="o-profile-setting-label">
            <label for="profilePinyin">${esc(t('profile.pinyin'))}</label>
            ${helpTip(t('profile.pinyin_desc'),t('profile.pinyin'))}
          </span>
          <small>${esc(t(pinyinCopyKey))}</small>
        </div>
        <div class="o-profile-setting-control is-switch">
          <label class="o-switch">
            <input id="profilePinyin" name="profilePinyin" type="checkbox" role="switch" ${pinyinEnabled?'checked':''}>
            <span aria-hidden="true"></span>
          </label>
        </div>
      </div>`
    :'';

  const experience=sectionMarkup({
    title:t('profile.section_experience'),
    body:[
      selectSetting({
        id:'profileStyle',
        label:t('profile.guidance_style'),
        description:t('profile.guidance_style_desc'),
        tip:t('profile.guidance_style_desc'),
        current:profile.style||'guided',
        options:STYLES.map(value=>({value,label:t(`profile.style.${value}`)})),
      }),
      selectSetting({
        id:'profileGoal',
        label:t('profile.current_goal'),
        description:t('profile.current_goal_desc'),
        tip:t('profile.current_goal_desc'),
        current:profile.goal||'everyday',
        options:GOALS.map(value=>({value,label:t(`profile.goal.${value}`)})),
      }),
      pinyinSetting,
    ].join(''),
  });

  const appearance=sectionMarkup({
    title:t('profile.section_appearance'),
    body:`${selectSetting({
      id:'profileColorMode',
      label:t('profile.color_mode'),
      description:t('profile.color_mode_desc'),
      current:activeTheme(),
      options:[
        {value:'light',label:`â˜€  ${t('profile.mode_light')}`},
        {value:'dark',label:`â˜¾  ${t('profile.mode_dark')}`},
      ],
    })}
    <div class="o-profile-palette">
      <div class="o-profile-setting-copy">
        <span class="o-profile-setting-label">${esc(t('profile.theme_title'))}</span>
        <small>${esc(t('profile.theme_status'))}</small>
      </div>
      <div class="theme-choice-grid">
        ${THEME_PALETTES.map(value=>themeChoice(value,themePreset)).join('')}
      </div>
    </div>`,
  });

  const account=sectionMarkup({
    title:t('profile.section_account'),
    body:`<div class="o-profile-account-list">
      ${accountRow({label:t('profile.account_name'),value:accountName})}
      ${accountRow({label:t('profile.account_email'),value:accountEmail})}
      ${accountRow({label:t('profile.account_plan'),value:planName})}
      ${accountRow({label:t('profile.setup_label'),actionId:'redoOnboarding'})}
    </div>`,
  });

  const danger=sectionMarkup({
    title:t('profile.section_danger'),
    className:'o-profile-danger',
    body:`<div class="o-profile-account-list">
      ${accountRow({label:t('chrome.sign_out'),actionId:'profileSignOut',danger:true})}
    </div>`,
  });

  root.innerHTML=`<section class="page profile-page o-profile">
    ${statusMarkup()}
    <div class="profile-layout">
      <div class="profile-sections visual-section-surface o-profile-panel">
        ${learning}
        ${experience}
        ${appearance}
        ${account}
        ${danger}
      </div>

      <aside class="profile-identity-stack visual-identity-column o-profile-about">
        <section class="o-profile-about-card">
          <div class="o-profile-about-heading">
            <span class="o-profile-about-icon" aria-hidden="true">${oIcon('rubric')}</span>
            <h2>${esc(t('profile.about_title'))}</h2>
          </div>
          <p>${esc(t('profile.about_desc'))}</p>
          <ul>
            <li>${oIcon('check')}<span>${esc(t('profile.about_change'))}</span></li>
            <li>${oIcon('check')}<span>${esc(t('profile.about_safe'))}</span></li>
            <li>${oIcon('check')}<span>${esc(t('profile.about_future'))}</span></li>
          </ul>
          <details class="o-profile-growth">
            <summary>
              <span>${esc(t('profile.evidence_title'))}</span>
              <strong>${esc(t(`profile.rank.${rank.stage.toLowerCase()}`))}</strong>
              ${oIcon('chevronDown')}
            </summary>
            ${growthRankFrame(rank)}
          </details>
        </section>
      </aside>
    </div>
  </section>`;

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

  root.querySelector('#profileLanguage')?.addEventListener('change',async event=>{
    const next=event.currentTarget.value;
    setSaving(t('busy.switching'));
    try{
      await api.setLanguage(next);
      toast(t('toast.learning_space',{space:configFor(next).name}));
      window.dispatchEvent(new CustomEvent('becoming:language-changed',{detail:{language:next}}));
    }catch(error){
      toast(error.message||t('toast.switch_failed'));
      event.currentTarget.value=state.language;
      event.currentTarget.orenaSelectField?.sync?.();
    }finally{
      clearSaving();
    }
  });

  root.querySelector('#profileGoal')?.addEventListener('change',async event=>{
    const previous=state.profile?.goal||'everyday';
    try{
      await persistProfile({goal:event.currentTarget.value},'toast.goal_saved');
    }catch{
      event.currentTarget.value=previous;
      event.currentTarget.orenaSelectField?.sync?.();
    }
  });

  root.querySelector('#profileStyle')?.addEventListener('change',async event=>{
    const previous=state.profile?.style||'guided';
    try{
      await persistProfile({style:event.currentTarget.value},'toast.guidance_saved');
    }catch{
      event.currentTarget.value=previous;
      event.currentTarget.orenaSelectField?.sync?.();
    }
  });

  root.querySelector('#profileNativeLanguage')?.addEventListener('change',async event=>{
    const previous=state.profile?.native_language||state.supportLanguage||'vi';
    try{
      await persistProfile({native_language:event.currentTarget.value},'toast.interface_saved');
      await renderProfile(root);
      applyChromeI18n();
    }catch{
      event.currentTarget.value=previous;
      event.currentTarget.orenaSelectField?.sync?.();
    }
  });

  root.querySelector('#profilePinyin')?.addEventListener('change',async event=>{
    const previous=(state.profile?.pinyin||'auto')!=='off';
    try{
      await persistProfile(
        {pinyin:event.currentTarget.checked?'auto':'off'},
        'toast.pinyin_saved',
      );
      const note=event.currentTarget.closest('.o-profile-setting')?.querySelector('small');
      if(note)note.textContent=t(event.currentTarget.checked?'profile.pinyin_auto':'profile.pinyin_off');
    }catch{
      event.currentTarget.checked=previous;
    }
  });

  root.querySelector('#profileColorMode')?.addEventListener('change',event=>{
    applyTheme(event.currentTarget.value,{persist:true});
    toast(t('toast.theme_saved'));
  });

  const syncColorMode=()=>{
    const select=root.querySelector('#profileColorMode');
    if(!select)return;
    select.value=activeTheme();
    syncSelectField(select);
  };
  window.addEventListener('becoming:theme-changed',syncColorMode);
  const cleanupProfile=()=>{
    window.removeEventListener('becoming:theme-changed',syncColorMode);
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
      }
    });
  });

  root.querySelector('#redoOnboarding')?.addEventListener('click',()=>{
    clearProfile();
    go('onboarding');
  });

  root.querySelector('#profileSignOut')?.addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    try{
      await api.logout();
    }finally{
      location.href='/login';
    }
  });

  installSelectEnhancements(root);
}
