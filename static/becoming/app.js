import {api} from './api.js';
import {state,saveProfile,activateLanguage,setSupportLanguage,supportLanguage} from './store.js';
import {currentRoute,go,syncNav} from './router.js?v=2.15.12';
import {configFor} from './language.js';
import {closeDialog,toast,setBusy,installTooltipLayer} from './components/primitives.js';
import {installTheme,applyPalette,activePalette,storedPalette} from './theme.js';
import {t,applyChromeI18n,uiHtmlLang} from './domain/i18n.js';
import {screenContract} from './domain/screen-contract.js?v=2.15.12';
import {applySkillNavigation,routeAvailable} from './domain/skill-release.js?v=2.15.12';
import {renderOnboarding} from './screens/onboarding.js';
import {renderHome} from './screens/home.js';
import {renderWrite} from './screens/write.js';
import {renderReview} from './screens/review.js';
import {renderReading} from './screens/reading.js';
import {renderListening} from './screens/listening.js';
import {renderSpeaking} from './screens/speaking.js';
import {renderLibrary} from './screens/library.js';
import {renderGrammar} from './screens/grammar.js?v=2.15.12';
import {renderJourney} from './screens/journey.js';
import {renderProfile} from './screens/profile.js';

const root=document.getElementById('mainContent');

const SCREEN_INDEX={
  home:'01',
  write:'02',
  review:'03',
  read:'04',
  listen:'05',
  speak:'06',
  library:'06',
  grammar:'06G',
  journey:'07',
  profile:'08',
  onboarding:'00',
};

const SCREENS={
  onboarding:renderOnboarding,
  home:renderHome,
  write:renderWrite,
  review:renderReview,
  read:renderReading,
  listen:renderListening,
  speak:renderSpeaking,
  library:renderLibrary,
  grammar:renderGrammar,
  journey:renderJourney,
  profile:renderProfile,
};

function setDocumentLanguage(){
  document.documentElement.lang=uiHtmlLang();
  document.documentElement.dataset.learningLanguage=state.language;
  applyChromeI18n();
}

function renderAccount(){
  const me=state.me||{};
  const avatar=document.getElementById('accountAvatar');
  const name=document.getElementById('accountName');
  const menuName=document.getElementById('accountMenuName');
  const menuEmail=document.getElementById('accountMenuEmail');

  const display=me.name||me.email||t('chrome.account');
  name.textContent=display;
  menuName.textContent=display;
  menuEmail.textContent=me.email||'';

  if(me.picture){
    avatar.innerHTML=`<img src="${String(me.picture).replace(/"/g,'&quot;')}" alt="" referrerpolicy="no-referrer">`;
  }else{
    avatar.textContent=display.slice(0,1).toUpperCase();
  }
}

function renderLanguages(){
  const select=document.getElementById('languageSelect');
  const enabled=(state.languages||[]).filter(item=>item.enabled);
  select.innerHTML=enabled.map(item=>{
    const label=item.code==='zh'?'中文':'English';
    return `<option value="${item.code}" ${item.code===state.language?'selected':''}>${label}</option>`;
  }).join('');
  select.disabled=enabled.length<2;
}


async function loadProfileForActiveLanguage({allowLegacyMigration=true}={}){
  let remote=await api.learnerProfile();
  if(remote.exists){
    if(!state.supportLanguage){
      setSupportLanguage(remote.native_language||'vi');
    }

    const localPalette=storedPalette();
    if(!localPalette){
      applyPalette(remote.theme_preset||'editorial',{persist:true});
    }

    const desiredPalette=localPalette||remote.theme_preset||'editorial';
    if(
      remote.native_language!==supportLanguage()
      || remote.theme_preset!==desiredPalette
    ){
      remote=await api.saveLearnerProfile({
        goal:remote.goal||'everyday',
        style:remote.style||'guided',
        pinyin:remote.pinyin||'auto',
        native_language:supportLanguage(),
        theme_preset:desiredPalette,
      });
    }

    applyPalette(remote.theme_preset||desiredPalette,{persist:true});
    saveProfile(remote);
    return remote;
  }

  if(
    allowLegacyMigration
    && state.legacyProfile
    && (!state.legacyProfile.language || state.legacyProfile.language===state.language)
  ){
    const legacy=state.legacyProfile;
    const saved=await api.saveLearnerProfile({
      goal:legacy.goal||'everyday',
      style:legacy.style||'guided',
      pinyin:legacy.pinyin||'auto',
      native_language:state.supportLanguage||legacy.native_language||'vi',
      theme_preset:legacy.theme_preset||activePalette(),
    });
    setSupportLanguage(saved.native_language||'vi');
    saveProfile(saved);
    state.legacyProfile=null;
    return saved;
  }

  state.profile=null;
  return null;
}

async function changeLanguage(language){
  if(!language || language===state.language)return;
  await api.setLanguage(language);

  const previousRoute=currentRoute();
  activateLanguage(language,{allowLegacyMigration:false});
  setDocumentLanguage();
  renderLanguages();

  const profile=await loadProfileForActiveLanguage({allowLegacyMigration:false});
  toast(t('toast.learning_space',{space:configFor(language).name}));

  if(!profile){
    go('onboarding');
    return;
  }

  // A review belongs to the language evidence that created it.
  // Never keep an English review alive inside the Chinese space (or vice versa).
  if(previousRoute==='review'){
    go('write');
    return;
  }

  await renderCurrent();
}

async function renderCurrent(){
  if(typeof root._cleanupScreen==='function'){
    root._cleanupScreen();
    delete root._cleanupScreen;
  }
  if(typeof root._cleanupReviewSheet==='function'){
    root._cleanupReviewSheet();
    delete root._cleanupReviewSheet;
  }

  let route=currentRoute();
  const internal=Boolean(state.me?.is_admin);

  if(!routeAvailable(route,state.skills,{internal})){
    route='home';
    if(location.hash!=='#/home'){
      history.replaceState(null,'','#/home');
    }
  }

  if(!state.profile && route!=='onboarding'){
    route='onboarding';
    if(location.hash!=='#/onboarding'){
      history.replaceState(null,'','#/onboarding');
    }
  }

  document.body.classList.toggle('onboarding-mode',route==='onboarding');
  syncNav(route);
  const screen=SCREENS[route]||SCREENS.home;
  const contract=screenContract(route);
  if(!contract){
    throw new Error(`Missing BECOMING screen contract for route: ${route}`);
  }
  root.dataset.screenContract=route;
  root.dataset.primaryAction=contract.primaryAction;
  root.dataset.screenIndex=SCREEN_INDEX[route]||'';
  root.setAttribute('aria-busy','true');

  try{
    await screen(root);
  }catch(error){
    console.error('BECOMING screen failed:',error);
    root.innerHTML=`<section class="page error-state" role="alert">
      <strong>${t('app.view_failed')}</strong>
      <div style="margin-top:6px">${String(error.message||error)}</div>
    </section>`;
  }finally{
    root.setAttribute('aria-busy','false');
    requestAnimationFrame(()=>root.focus({preventScroll:true}));
  }
}

function installHeaderEvents(){
  document.getElementById('languageSelect').addEventListener('change',async event=>{
    const select=event.currentTarget;
    select.disabled=true;
    select.setAttribute('aria-busy','true');
    document.querySelector('.header-actions')?.classList.add('is-processing');
    try{
      await changeLanguage(select.value);
    }catch(error){
      toast(error.message||t('toast.switch_failed'));
      renderLanguages();
    }finally{
      select.disabled=false;
      select.removeAttribute('aria-busy');
      document.querySelector('.header-actions')?.classList.remove('is-processing');
    }
  });

  const accountButton=document.getElementById('accountButton');
  const accountMenu=document.getElementById('accountMenu');

  accountButton.addEventListener('click',()=>{
    const open=accountMenu.classList.toggle('hidden')===false;
    accountButton.setAttribute('aria-expanded',open?'true':'false');
  });

  document.addEventListener('click',event=>{
    if(!accountMenu.classList.contains('hidden')
      && !accountMenu.contains(event.target)
      && !accountButton.contains(event.target)){
      accountMenu.classList.add('hidden');
      accountButton.setAttribute('aria-expanded','false');
    }
  });

  accountMenu.querySelector('[data-account-action="switch"]').addEventListener('click',async()=>{
    try{await api.logout();}finally{location.href='/auth/google';}
  });

  accountMenu.querySelector('[data-account-action="logout"]').addEventListener('click',async()=>{
    try{await api.logout();}finally{location.href='/login';}
  });
}

function installDialogEvents(){
  const backdrop=document.getElementById('dialogBackdrop');
  document.getElementById('dialogClose').addEventListener('click',closeDialog);
  backdrop.addEventListener('click',event=>{
    if(event.target===backdrop)closeDialog();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      closeDialog();
      document.getElementById('accountMenu').classList.add('hidden');
      document.getElementById('accountButton').setAttribute('aria-expanded','false');
    }
  });
}

async function bootstrap(){
  installTheme();
  installTooltipLayer();
  installHeaderEvents();
  installDialogEvents();

  try{
    const [me,languages,skills,health]=await Promise.all([
      api.me(),
      api.languages(),
      api.skills(),
      api.health(),
    ]);
    state.me=me;
    state.languages=languages.languages||[];
    state.skills=skills.skills||[];
    applySkillNavigation(state.skills,{internal:Boolean(me.is_admin)});
    const activeLanguage=languages.active||state.legacyProfile?.language||'en';
    activateLanguage(activeLanguage,{allowLegacyMigration:true});
    state.health=health;

    await loadProfileForActiveLanguage({allowLegacyMigration:true});

    setDocumentLanguage();
    renderAccount();
    renderLanguages();

    window.addEventListener('hashchange',renderCurrent);
    window.addEventListener('becoming:language-changed',async event=>{
      const previousRoute=currentRoute();
      activateLanguage(event.detail.language,{allowLegacyMigration:false});
      setDocumentLanguage();
      renderLanguages();
      const profile=await loadProfileForActiveLanguage({allowLegacyMigration:false});
      if(!profile){
        go('onboarding');
        return;
      }
      if(previousRoute==='review'){
        go('write');
        return;
      }
      await renderCurrent();
    });

    if(!location.hash){
      history.replaceState(null,'',state.profile?'#/home':'#/onboarding');
    }
    await renderCurrent();
  }catch(error){
    console.error('BECOMING bootstrap failed:',error);
    root.innerHTML=`<section class="page empty-state">
      <span class="editorial-kicker">${t('app.connection_kicker')}</span>
      <h1 class="editorial-title">${t('app.connection_title')}</h1>
      <p class="editorial-lead">${String(error.message||error)}</p>
      <div class="action-row" style="margin-top:32px"><button id="retryApp" class="button button-primary">${t('app.retry')}</button></div>
    </section>`;
    document.getElementById('retryApp')?.addEventListener('click',()=>location.reload());
  }
}

bootstrap();
