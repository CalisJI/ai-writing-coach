import {api} from '../api.js';
import {
  state,
  saveProfile,
  resetDraft,
  setSupportLanguage,
  activateLanguage,
} from '../store.js';
import {go} from '../router.js';
import {
  esc,
  toast,
  helpTip,
  runBusy,
} from '../components/primitives.js';
import {languageObject} from '../components/identity.js';
import {t,localeLabel,applyChromeI18n} from '../domain/i18n.js';
import {activePalette,applyPalette} from '../theme.js';

const NATIVE_LANGUAGES=['vi','en','zh'];
const GOALS=['everyday','work','exam','voice'];
const STYLES=['guided','examples','concise','deep'];

export async function renderOnboarding(root){
  let step=0;
  const draft={
    language:state.language||'en',
    goal:state.profile?.goal||'everyday',
    style:state.profile?.style||'guided',
    pinyin:state.profile?.pinyin||'auto',
    native_language:state.profile?.native_language||state.supportLanguage||'vi',
    theme_preset:state.profile?.theme_preset||activePalette(),
  };

  function render(){
    document.querySelector('#primaryNav')?.classList.add('hidden');

    if(step===0){
      root.innerHTML=`<section class="page onboarding">
        <div class="onboarding-step visual-onboarding-stage">
          <span class="editorial-kicker">${t('onboarding.step1')}</span>
          <h1 class="editorial-title">${t('onboarding.express.kicker')}</h1>
          <p class="editorial-lead">${t('onboarding.step1_lead')}</p>
          <div class="choice-grid">
            <button class="choice visual-raised-surface language-choice ${draft.language==='en'?'selected':''}" data-language="en">
              ${languageObject('en')}
              <span class="choice-copy">
                <strong>English</strong>
                <span>${t('onboarding.english_desc')}</span>
              </span>
            </button>
            <button class="choice visual-raised-surface language-choice cjk ${draft.language==='zh'?'selected':''}" data-language="zh">
              ${languageObject('zh')}
              <span class="choice-copy">
                <strong>中文</strong>
                <span>${t('onboarding.chinese_desc')}</span>
              </span>
            </button>
          </div>

          <div class="onboarding-support-language">
            <div class="section-title-row">
              <strong>${t('onboarding.support_title')}</strong>
              ${helpTip(t('onboarding.support_desc'),t('onboarding.support_title'))}
            </div>
            <select id="onboardingNativeLanguage" aria-label="${esc(t('onboarding.support_title'))}">
              ${NATIVE_LANGUAGES.map(value=>`<option value="${value}" ${draft.native_language===value?'selected':''}>${localeLabel(value)}</option>`).join('')}
            </select>
            <p>${t('onboarding.support_desc')}</p>
          </div>

          <div class="action-row">
            <button id="onboardingNext" class="button button-primary">${t('common.continue')}</button>
          </div>
        </div>
      </section>`;

      root.querySelectorAll('[data-language]').forEach(button=>{
        button.addEventListener('click',()=>{
          draft.language=button.dataset.language;
          render();
        });
      });

      root.querySelector('#onboardingNativeLanguage')?.addEventListener('change',event=>{
        draft.native_language=event.currentTarget.value;
        setSupportLanguage(draft.native_language);
        applyChromeI18n();
        render();
      });

      root.querySelector('#onboardingNext').addEventListener('click',()=>{step=1;render();});
      return;
    }

    if(step===1){
      root.innerHTML=`<section class="page onboarding">
        <div class="onboarding-step visual-onboarding-stage">
          <span class="editorial-kicker">${t('onboarding.step2')}</span>
          <h1 class="editorial-title">${t('onboarding.focus.kicker')}</h1>
          <p class="editorial-lead">${t('onboarding.step2_lead')}</p>
          <div class="choice-grid">
            ${GOALS.map(key=>`
              <button class="choice visual-raised-surface ${draft.goal===key?'selected':''}" data-goal="${esc(key)}">
                <strong>${t(`profile.goal.${key}`)}</strong>
                <span>${t(`onboarding.goal.${key}_desc`)}</span>
              </button>`).join('')}
          </div>
          <div class="action-row">
            <button id="onboardingBack" class="button button-tertiary">${t('common.back')}</button>
            <button id="onboardingNext" class="button button-primary">${t('common.continue')}</button>
          </div>
        </div>
      </section>`;

      root.querySelectorAll('[data-goal]').forEach(button=>{
        button.addEventListener('click',()=>{
          draft.goal=button.dataset.goal;
          render();
        });
      });
      root.querySelector('#onboardingBack').addEventListener('click',()=>{step=0;render();});
      root.querySelector('#onboardingNext').addEventListener('click',()=>{step=2;render();});
      return;
    }

    root.innerHTML=`<section class="page onboarding">
      <div class="onboarding-step visual-onboarding-stage">
        <span class="editorial-kicker">${t('onboarding.step3')}</span>
        <h1 class="editorial-title">${t('onboarding.learn.kicker')}</h1>
        <p class="editorial-lead">${t('onboarding.learn.body')}</p>
        <div class="choice-grid">
          ${STYLES.map(key=>`
            <button class="choice visual-raised-surface ${draft.style===key?'selected':''}" data-style="${esc(key)}">
              <strong>${t(`profile.style.${key}`)}</strong>
              <span>${t(`onboarding.style.${key}_desc`)}</span>
            </button>`).join('')}
        </div>
        <div class="action-row">
          <button id="onboardingBack" class="button button-tertiary">${t('common.back')}</button>
          <button id="onboardingFinish" class="button button-primary">${t('onboarding.enter')}</button>
        </div>
      </div>
    </section>`;

    root.querySelectorAll('[data-style]').forEach(button=>{
      button.addEventListener('click',()=>{
        draft.style=button.dataset.style;
        render();
      });
    });
    root.querySelector('#onboardingBack').addEventListener('click',()=>{step=1;render();});
    root.querySelector('#onboardingFinish').addEventListener('click',async()=>{
      const button=root.querySelector('#onboardingFinish');
      try{
        await runBusy(button,async()=>{
          await api.setLanguage(draft.language);
          activateLanguage(draft.language,{allowLegacyMigration:false});
          const saved=await api.saveLearnerProfile({
            goal:draft.goal,
            style:draft.style,
            pinyin:draft.pinyin,
            native_language:draft.native_language,
            theme_preset:draft.theme_preset||activePalette(),
          });
          setSupportLanguage(saved.native_language||draft.native_language||'vi');
          applyPalette(saved.theme_preset||draft.theme_preset||'editorial',{persist:true});
          saveProfile(saved);
          resetDraft();
          applyChromeI18n();
          toast(t('onboarding.ready'));
          document.querySelector('#primaryNav')?.classList.remove('hidden');
          go('home');
        },{label:t('onboarding.preparing')});
      }catch(error){
        toast(error.message||t('onboarding.failed'));
      }
    });
  }

  render();
}
