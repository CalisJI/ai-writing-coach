const JSON_HEADERS = {'Content-Type':'application/json'};

async function request(url, options={}){
  const response = await fetch(url,{
    credentials:'same-origin',
    cache:'no-store',
    ...options,
  });

  let payload=null;
  const type=response.headers.get('content-type')||'';
  if(type.includes('application/json')){
    payload=await response.json();
  }else{
    payload=await response.text();
  }

  if(!response.ok){
    if(response.status===401)location.href='/login';
    const detail=payload && typeof payload==='object' ? payload.detail : payload;
    const structured=detail && typeof detail==='object';
    const message=structured ? detail.message : detail;
    const error=new Error(typeof message==='string'&&message ? message : `Request failed (${response.status})`);
    if(structured&&typeof detail.category==='string')error.category=detail.category;
    error.status=response.status;
    throw error;
  }
  return payload;
}

export const api={
  me:()=>request('/api/me'),
  health:()=>request('/api/health'),
  languages:()=>request('/api/platform/languages'),
  skills:()=>request('/api/platform/skills'),
  setLanguage:(language)=>request('/api/platform/language',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify({language}),
  }),
  dashboard:()=>request('/api/dashboard'),
  learnerProfile:()=>request('/api/learner-profile'),
  saveLearnerProfile:(payload)=>request('/api/learner-profile',{
    method:'PUT',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload),
  }),
  learningMemory:()=>request('/api/learning-memory'),
  practiceRecommendation:()=>request('/api/practice-recommendation'),
  nextPractice:(payload)=>request('/api/practice/next',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload||{}),
  }),
  practiceOutcome:(id)=>request(`/api/practice-outcome/${encodeURIComponent(id)}`),
  practiceOutcomes:(limit=20)=>request(`/api/practice-outcomes?limit=${encodeURIComponent(limit)}`),
  dictionary:(word)=>request(`/api/dictionary?word=${encodeURIComponent(word)}`),
  libraryVocabulary:()=>request('/api/library/vocabulary'),
  saveLibraryVocabulary:(payload)=>request('/api/library/vocabulary',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload),
  }),
  reviewLibraryVocabulary:(word,result)=>request(`/api/library/vocabulary/${encodeURIComponent(word)}/review`,{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify({result}),
  }),
  deleteLibraryVocabulary:(word)=>request(`/api/library/vocabulary/${encodeURIComponent(word)}`,{
    method:'DELETE',
  }),
  readingSessions:(limit=8)=>request(`/api/reading/sessions?limit=${encodeURIComponent(limit)}`),
  readingSession:(id)=>request(`/api/reading/session/${encodeURIComponent(id)}`),
  createReadingSession:(payload)=>request('/api/reading/session',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload||{}),
  }),
  submitReadingAnswers:(id,answers)=>request(`/api/reading/session/${encodeURIComponent(id)}/answer`,{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify({answers}),
  }),
  importMedia:(payload)=>request('/api/media-learning/import',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload),
  }),
  transcribeSpeech:(blob,language,filename='recording.webm')=>{
    const form=new FormData();
    form.append('file',blob,filename);
    if(language)form.append('language',language);
    return request('/api/speech/transcribe',{
      method:'POST',
      body:form,
    });
  },
  assessPronunciation:(blob,language,referenceText,filename='recording.webm')=>{
    const form=new FormData();
    form.append('file',blob,filename);
    form.append('language',language||'');
    form.append('reference_text',referenceText||'');
    return request('/api/speech/pronunciation',{
      method:'POST',
      body:form,
    });
  },
  essays:()=>request('/api/essays'),
  essay:(id)=>request(`/api/essays/${encodeURIComponent(id)}`),
  linguisticAnnotations:(id)=>request(`/api/essays/${encodeURIComponent(id)}/linguistic-annotations`,{
    method:'POST',
  }),
  generateTask:(payload)=>request('/api/tasks/generate',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload),
  }),
  evaluate:(payload)=>request('/api/evaluate',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload),
  }),
  improve:(payload)=>request('/api/improve',{
    method:'POST',
    headers:JSON_HEADERS,
    body:JSON.stringify(payload),
  }),
  logout:()=>request('/auth/logout',{method:'POST'}),
};
