import {api} from '../api.js';
import {
  state,
  saveProfile,
  clearProfile,
  setSupportLanguage,
} from '../store.js';
import {configFor} from '../language.js';
import {
  toast,
  helpTip,
  loadingBlock,
  spinner,
} from '../components/primitives.js';
import {go} from '../router.js';
import {t,localeLabel,applyChromeI18n} from '../domain/i18n.js';
import {
  applyPalette,
  activePalette,
  THEME_PALETTES,
} from '../theme.js';
import {deriveGrowthRank} from '../domain/rank.js';
import {growthRankFrame} from '../components/rank-frame.js';

const GOALS=['everyday','work','exam','voice'];
const STYLES=['guided','examples','concise','deep'];
const NATIVE_LANGUAGES=['vi','en','zh'];

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

function statusMarkup(){
  return `<div id="profileSaveStatus" class="profile-save-status" aria-live="polite"></div>`;
}

export async function renderProfile(root){
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
  const config=configFor(state.language);
  const rank=deriveGrowthRank(memory);
  const themePreset=profile.theme_preset||activePalette();

  root.innerHTML=`<section class="page profile-page">
    <header class="journey-header">
      <span class="editorial-kicker">${t('profile.kicker')}</span>
      <h1 class="editorial-title">${t('profile.title')}</h1>
      <p class="editorial-lead">${t('profile.lead')}</p>
      ${statusMarkup()}
    </header>

    <div class="profile-layout">
      <div class="profile-sections visual-section-surface">
        <section class="profile-section">
          <h2>${t('profile.learning_language')}</h2>
          <p>${t('profile.learning_language_desc')}</p>
          <div class="radio-list">
            <label class="radio-option">
              <input type="radio" name="profileLanguage" value="en" ${state.language==='en'?'checked':''}>
              <span><strong>English</strong><br><small>${t('profile.english_desc')}</small></span>
            </label>
            <label class="radio-option">
              <input type="radio" name="profileLanguage" value="zh" ${state.language==='zh'?'checked':''}>
              <span><strong>中文</strong><br><small>${t('profile.chinese_desc')}</small></span>
            </label>
          </div>
        </section>

        <section class="profile-section">
          <div class="section-title-row">
            <h2>${t('profile.interface_language')}</h2>
            ${helpTip(t('profile.interface_language_desc'),t('profile.interface_language'))}
          </div>
          <p>${t('profile.interface_language_desc')}</p>
          <div class="radio-list">
            ${NATIVE_LANGUAGES.map(value=>`<label class="radio-option">
              <input type="radio" name="profileNativeLanguage" value="${value}" ${(profile.native_language||'vi')===value?'checked':''}>
              <span><strong>${localeLabel(value)}</strong></span>
            </label>`).join('')}
          </div>
        </section>

        <section class="profile-section">
          <h2>${t('profile.current_goal')}</h2>
          <p>${t('profile.current_goal_desc')}</p>
          <div class="radio-list">
            ${GOALS.map(value=>`<label class="radio-option">
              <input type="radio" name="profileGoal" value="${value}" ${profile.goal===value?'checked':''}>
              <span>${t(`profile.goal.${value}`)}</span>
            </label>`).join('')}
          </div>
        </section>

        <section class="profile-section">
          <h2>${t('profile.guidance_style')}</h2>
          <p>${t('profile.guidance_style_desc')}</p>
          <div class="radio-list">
            ${STYLES.map(value=>`<label class="radio-option">
              <input type="radio" name="profileStyle" value="${value}" ${profile.style===value?'checked':''}>
              <span>${t(`profile.style.${value}`)}</span>
            </label>`).join('')}
          </div>
        </section>

        <section class="profile-section theme-preference-section">
          <div class="section-title-row">
            <h2>${t('profile.theme_title')}</h2>
            ${helpTip(t('theme.mode_tip'),t('profile.theme_title'))}
          </div>
          <p>${t('theme.description')}</p>
          <div class="theme-choice-grid">
            ${THEME_PALETTES.map(value=>themeChoice(value,themePreset)).join('')}
          </div>
          <p class="preference-footnote">${t('profile.theme_status')}</p>
        </section>

        ${state.language==='zh'?`<section class="profile-section">
          <div class="section-title-row">
            <h2>${t('profile.pinyin')}</h2>
            ${helpTip(t('profile.pinyin_desc'),t('profile.pinyin'))}
          </div>
          <p>${t('profile.pinyin_desc')}</p>
          <div class="radio-list">
            ${[
              ['auto',t('profile.pinyin_auto')],
              ['on',t('profile.pinyin_on')],
              ['off',t('profile.pinyin_off')],
            ].map(([value,label])=>`<label class="radio-option">
              <input type="radio" name="profilePinyin" value="${value}" ${(profile.pinyin||'auto')===value?'checked':''}>
              <span>${label}</span>
            </label>`).join('')}
          </div>
        </section>`:''}
      </div>

      <aside class="profile-identity-stack visual-identity-column">
        ${growthRankFrame(rank)}

        <section class="profile-note">
          <span class="context-label">${t('profile.identity')}</span>
          <h2>${state.me?.name||t('chrome.account')}</h2>
          <p>${t('profile.current_space',{space:config.name})}</p>
          <button id="redoOnboarding" class="text-link" type="button">${t('profile.redo')}</button>
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

  root.querySelectorAll('input[name="profileLanguage"]').forEach(input=>{
    input.addEventListener('change',async()=>{
      const next=input.value;
      setSaving(t('busy.switching'));
      try{
        await api.setLanguage(next);
        toast(t('toast.learning_space',{space:configFor(next).name}));
        window.dispatchEvent(new CustomEvent('becoming:language-changed',{detail:{language:next}}));
      }catch(error){
        toast(error.message||t('toast.switch_failed'));
      }finally{
        clearSaving();
      }
    });
  });

  root.querySelectorAll('input[name="profileGoal"]').forEach(input=>{
    input.addEventListener('change',()=>persistProfile(
      {goal:input.value},
      'toast.goal_saved',
    ));
  });

  root.querySelectorAll('input[name="profileStyle"]').forEach(input=>{
    input.addEventListener('change',()=>persistProfile(
      {style:input.value},
      'toast.guidance_saved',
    ));
  });

  root.querySelectorAll('input[name="profileNativeLanguage"]').forEach(input=>{
    input.addEventListener('change',async()=>{
      try{
        await persistProfile(
          {native_language:input.value},
          'toast.interface_saved',
        );
        await renderProfile(root);
        applyChromeI18n();
      }catch{}
    });
  });

  root.querySelectorAll('input[name="profilePinyin"]').forEach(input=>{
    input.addEventListener('change',()=>persistProfile(
      {pinyin:input.value},
      'toast.pinyin_saved',
    ));
  });

  root.querySelectorAll('input[name="profileTheme"]').forEach(input=>{
    input.addEventListener('change',async()=>{
      const previous=activePalette();
      applyPalette(input.value,{persist:true});
      try{
        await persistProfile(
          {theme_preset:input.value},
          'toast.theme_saved',
        );
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

  root.querySelector('#redoOnboarding').addEventListener('click',()=>{
    clearProfile();
    go('onboarding');
  });
}
