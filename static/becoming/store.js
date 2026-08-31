const PROFILE_KEY='becoming.profile.v1';
const SUPPORT_LANGUAGE_KEY='becoming.support-language.v1';
const LEGACY_DRAFT_KEY='becoming.draft.v1';
const DRAFT_PREFIX='becoming.draft.v2';

function readJSON(key,fallback){
  try{
    const value=localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  }catch{
    return fallback;
  }
}

function readText(key,fallback=''){
  try{
    return localStorage.getItem(key)||fallback;
  }catch{
    return fallback;
  }
}

function validSupportLanguage(value=''){
  return ['vi','en','zh'].includes(String(value))?String(value):'';
}

function normalizeTargetLanguage(value='en'){
  const code=String(value||'').trim().toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code)?code:'en';
}

function draftDefaults(language='en'){
  return {
    mode:'free',
    topic:'random',
    level:language==='zh'?'HSK4':'B2',
    length:language==='zh'?80:150,
    prompt:'',
    text:'',
    generatedTask:null,
    practiceContext:null,
    parentEssayId:null,
  };
}

function draftKey(language='en'){
  return `${DRAFT_PREFIX}.${normalizeTargetLanguage(language)}`;
}

function inferLegacyDraftLanguage(draft={}){
  const level=String(draft.level||'');
  return level.startsWith('HSK')?'zh':'en';
}

function loadDraft(language,{allowLegacyMigration=false}={}){
  const stored=readJSON(draftKey(language),null);
  if(stored)return {...draftDefaults(language),...stored};

  if(allowLegacyMigration){
    const legacy=readJSON(LEGACY_DRAFT_KEY,null);
    if(legacy && inferLegacyDraftLanguage(legacy)===language){
      const migrated={...draftDefaults(language),...legacy};
      localStorage.setItem(draftKey(language),JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      return migrated;
    }
  }

  return draftDefaults(language);
}

const legacyProfile=readJSON(PROFILE_KEY,null);
const storedSupportLanguage=validSupportLanguage(readText(SUPPORT_LANGUAGE_KEY,''));

export const state={
  me:null,
  health:null,
  languages:[],
  skills:[],
  language:'en',
  profile:null,
  legacyProfile,
  supportLanguage:storedSupportLanguage||validSupportLanguage(legacyProfile?.native_language||''),
  draft:loadDraft('en',{allowLegacyMigration:false}),
  dashboard:null,
  memory:null,
  practiceRecommendation:null,
  latestPracticeOutcome:null,
  libraryVocabulary:null,
  libraryReviewWord:null,
  libraryReviewLanguage:null,
  readingSession:null,
  readingResult:null,
  readingSessions:[],
  essays:[],
  lastEvaluation:null,
  grammarFocusId:null,
};

export function saveProfile(profile,{cache=true}={}){
  state.profile={...profile};
  if(cache){
    localStorage.setItem(PROFILE_KEY,JSON.stringify(state.profile));
  }
}

export function setSupportLanguage(value){
  const next=validSupportLanguage(value)||'vi';
  state.supportLanguage=next;
  localStorage.setItem(SUPPORT_LANGUAGE_KEY,next);
  return next;
}

export function supportLanguage(){
  return validSupportLanguage(state.supportLanguage)||'vi';
}

export function clearProfile(){
  state.profile=null;
  localStorage.removeItem(PROFILE_KEY);
}

export function saveDraft(patch){
  state.draft={...state.draft,...patch};
  localStorage.setItem(draftKey(state.language),JSON.stringify(state.draft));
}

export function resetDraft(defaults={}){
  state.draft={
    ...draftDefaults(state.language),
    ...defaults,
  };
  localStorage.setItem(draftKey(state.language),JSON.stringify(state.draft));
}

export function activateLanguage(language,{allowLegacyMigration=false}={}){
  state.language=normalizeTargetLanguage(language);
  state.libraryReviewWord=null;
  state.libraryReviewLanguage=null;
  state.draft=loadDraft(state.language,{allowLegacyMigration});
  clearLanguageDerivedState();
  return state.draft;
}

export function clearLanguageDerivedState(){
  state.dashboard=null;
  state.memory=null;
  state.practiceRecommendation=null;
  state.latestPracticeOutcome=null;
  state.libraryVocabulary=null;
  state.readingSession=null;
  state.readingResult=null;
  state.readingSessions=[];
  state.essays=[];
  state.lastEvaluation=null;
}
