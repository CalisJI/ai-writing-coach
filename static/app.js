const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let revisionParentId=null;
const THEME_ORDER=['comfort','dark','light'];
const FONT_ORDER=['large','xlarge','normal'];
const THEME_LABELS={comfort:'◐ Comfort',dark:'☾ Dark',light:'☀ Light'};
const FONT_LABELS={normal:'A  Normal',large:'A+ Large',xlarge:'A++ Extra'};

function applyUIPreferences(){
  const theme=localStorage.getItem('writingCoachTheme')||'comfort';
  const fontScale=localStorage.getItem('writingCoachFontScale')||'large';
  document.body.dataset.theme=THEME_ORDER.includes(theme)?theme:'comfort';
  document.body.dataset.fontScale=FONT_ORDER.includes(fontScale)?fontScale:'large';
  const themeBtn=$('#themeBtn'),fontBtn=$('#fontBtn');
  if(themeBtn) themeBtn.textContent=THEME_LABELS[document.body.dataset.theme];
  if(fontBtn) fontBtn.textContent=FONT_LABELS[document.body.dataset.fontScale];
}
function cycleTheme(){
  const current=document.body.dataset.theme||'comfort';
  const next=THEME_ORDER[(THEME_ORDER.indexOf(current)+1)%THEME_ORDER.length];
  localStorage.setItem('writingCoachTheme',next);
  applyUIPreferences();
}
function cycleFontSize(){
  const current=document.body.dataset.fontScale||'large';
  const next=FONT_ORDER[(FONT_ORDER.indexOf(current)+1)%FONT_ORDER.length];
  localStorage.setItem('writingCoachFontScale',next);
  applyUIPreferences();
}
applyUIPreferences();
function activeLang(){return window.WRITING_COACH_LANGUAGE||'en';}
function defaultWritingLevel(){return activeLang()==='zh'?'HSK4':'B2';}
function defaultWritingLength(){return activeLang()==='zh'?'80':'150';}
function writingUnitCountClient(text=''){
  if(activeLang()==='zh'){
    const han=(String(text).match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g)||[]).length;
    const latin=(String(text).match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g)||[]).length;
    return han+latin;
  }
  return (String(text).match(/\b[\w'-]+\b/g)||[]).length;
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function go(page){$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$$('.page').forEach(x=>x.classList.toggle('active',x.id===`page-${page}`));if(page==='dashboard'||page==='analytics')loadDashboard();if(page==='history')loadHistory();if(page==='library')loadLibrary();}
$$('.nav').forEach(b=>b.onclick=()=>go(b.dataset.page));
$('#essayText').addEventListener('input',updateWordCount);
function updateWordCount(){const n=writingUnitCountClient($('#essayText').value);$('#wordCount').textContent=activeLang()==='zh'?`${n} 字`:`${n} words`;}

function promptLabel(s=''){
  const line=String(s||'').split(/\r?\n/).find(x=>x.trim())||'Free writing';
  const clean=line.replace(/^TASK:\s*/i,'').trim();
  return clean.length>86?clean.slice(0,83)+'…':clean;
}

function weakestMetric(metrics={}){
  const entries=Object.entries(metrics||{});
  if(!entries.length)return null;
  entries.sort((a,b)=>a[1]-b[1]);
  return entries[0];
}

function focusAdvice(metric){
  const advice={
    grammar:'Try one slower revision focused only on sentence accuracy and articles.',
    vocabulary:'Reuse fewer generic words and swap 2-3 phrases for more precise ones.',
    coherence:'Add clearer linking between ideas so each sentence leads naturally to the next.',
    task_achievement:'Answer every part of the task directly before polishing style.',
    naturalness:'Rewrite a few awkward phrases into simpler and more natural English.'
  };
  return advice[metric]||'Practice one focused revision on this area.';
}

function renderTodayFocus(metrics={}){
  const box=$('#todayFocus');
  if(!box)return;
  const weak=weakestMetric(metrics);
  if(!weak){
    box.innerHTML='<div class="empty">Write your first essay to unlock a personal focus area.</div>';
    return;
  }
  const [name,score]=weak;
  box.innerHTML=`
    <div class="focus-score">${esc(name.replaceAll('_',' '))}<span>${esc(score)} / 100</span></div>
    <p>${esc(focusAdvice(name))}</p>
  `;
}

function openGeneratedTask(mode='opinion'){
  newWriting();
  $('#taskMode').value=mode;
  $('#taskTopic').value='random';
  syncTaskMode();
  go('write');
  generateTask(false);
}

function taskOptionsChanged(){
  const mode=$('#taskMode').value;
  if(!['free','custom'].includes(mode)){
    $('#prompt').value='';
    $('#taskPreview').classList.add('hidden');
    $('#taskPreview').innerHTML='';
  }
  syncTaskMode();
}

function syncTaskMode(){
  const mode=$('#taskMode').value;
  const promptWrap=$('#promptWrap');
  const preview=$('#taskPreview');
  const generate=$('#generateTaskBtn');
  const topic=$('#taskTopic');
  const length=$('#taskLength');

  if(mode==='free'){
    $('#prompt').value='';
    promptWrap.classList.add('hidden');
    preview.classList.add('hidden');
    generate.disabled=true;
    topic.disabled=true;
    length.disabled=true;
    $('#taskHint').textContent=activeLang()==='zh'?'自由写作：不需要题目，AI Coach 仍会评估语言、表达和自然度。':'Free writing: no prompt is required. Your language and clarity will still be evaluated.';
    return;
  }

  if(mode==='custom'){
    promptWrap.classList.remove('hidden');
    preview.classList.add('hidden');
    $('#prompt').readOnly=false;
    generate.disabled=true;
    topic.disabled=true;
    length.disabled=true;
    $('#taskHint').textContent=activeLang()==='zh'?'自定义题目：输入你希望 AI Coach 用来评估任务完成度的中文写作要求。':'Custom prompt: enter the exact task you want the evaluator to use for Task Achievement.';
    return;
  }

  promptWrap.classList.add('hidden');
  $('#prompt').readOnly=true;
  generate.disabled=false;
  topic.disabled=false;
  length.disabled=false;
  $('#taskHint').textContent=$('#prompt').value
    ?'This generated task will be used for Task Achievement scoring.'
    :'Choose a topic and length, then generate a task.';
}

function renderGeneratedTask(d){
  const checklist=(d.checklist||[]).map(x=>`<li>${esc(x)}</li>`).join('');
  $('#taskPreview').innerHTML=`
    <div class="task-preview-head">
      <div><span class="task-type">${esc((d.task_type||'task').replaceAll('_',' '))}</span><h3>${esc(d.title)}</h3></div>
      <span class="task-source">${esc(d.source||'local')}</span>
    </div>
    <p>${esc(d.instruction)}</p>
    <div class="task-checklist"><b>Include:</b><ul>${checklist}</ul></div>
    <small>Target: about ${esc(d.word_target)} ${activeLang()==='zh'?'字':'words'} · ${esc($('#target').value)}</small>`;
  $('#taskPreview').classList.remove('hidden');
}

async function generateTask(surprise=false){
  const modes=window.WRITING_COACH_LANGUAGE_CONFIG?.taskModes||['opinion','email','review','story','toeic'];
  const topics=window.WRITING_COACH_LANGUAGE_CONFIG?.topics||['daily life','work','technology','education','travel','environment','culture and media','shopping and services','communication','community'];

  if(surprise){
    $('#taskMode').value=modes[Math.floor(Math.random()*modes.length)];
    $('#taskTopic').value=topics[Math.floor(Math.random()*topics.length)];
    syncTaskMode();
  }

  const mode=$('#taskMode').value;
  if(['free','custom'].includes(mode))return;

  const generate=$('#generateTaskBtn');
  const surpriseBtn=$('#surpriseTaskBtn');
  generate.disabled=true;
  surpriseBtn.disabled=true;
  const oldGenerate=generate.textContent;
  generate.textContent='Generating…';
  $('#taskHint').textContent='AI Coach is creating a writing challenge…';

  try{
    const r=await fetch('/api/tasks/generate',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        task_type:mode,
        topic:$('#taskTopic').value,
        target_cefr:$('#target').value,
        word_target:Number($('#taskLength').value)
      })
    });
    const d=await r.json();
    if(!r.ok)throw new Error(d.detail||'Could not generate a task');
    $('#prompt').value=d.prompt||'';
    renderGeneratedTask(d);
    $('#taskHint').textContent=d.source&&d.source!=='built-in'
      ?'Generated by the platform AI Coach. Generate again anytime for a new challenge.'
      :'A built-in task was used because AI task generation was unavailable.';
  }catch(e){
    $('#taskHint').textContent=e.message;
  }finally{
    generate.disabled=false;
    surpriseBtn.disabled=false;
    generate.textContent=oldGenerate;
  }
}

async function health(){
  try{
    const d=await fetch('/api/health').then(r=>r.json());
    $('#appVersion').textContent=`v${d.version}`;
    const el=$('#ollamaStatus');
    el.className='status '+(d.ai_ready?'ok':'warn');
    el.textContent=d.ai_ready?'● AI Coach ready':'● AI Coach unavailable';
    const buddy=$('#modelBuddy');
    if(buddy){
      buddy.classList.remove('loading');
      buddy.innerHTML=`<div class="buddy-avatar">🦉</div><div class="buddy-copy"><b>AI Writing Coach</b><small>${d.ai_ready?'Ready':'Unavailable'}</small><span>${d.ai_ready?'Ready to help with your writing':'Waiting for the coach engine'}</span></div>`;
    }
  }catch{}
}
function newWriting(){
  revisionParentId=null;
  $('#prompt').value='';
  $('#essayText').value='';
  $('#target').value=defaultWritingLevel();
  $('#taskMode').value='free';
  $('#taskTopic').value='random';
  $('#taskLength').value=defaultWritingLength();
  $('#taskPreview').innerHTML='';
  $('#taskPreview').classList.add('hidden');
  $('#writeTitle').textContent='Write';
  $('#writeSubtitle').textContent=activeLang()==='zh'?'Chọn bài luyện hoặc viết tự do bằng tiếng Trung, sau đó để AI Coach phân tích các mẫu cần cải thiện.':'Choose a practice task or write freely, then let the coach diagnose patterns.';
  $('#revisionBanner').classList.add('hidden');
  $('#cancelRevision').classList.add('hidden');
  $('#resultPane').className='card result-card placeholder';
  $('#resultPane').innerHTML='<div><b>AI feedback will appear here</b><p>Scores, explanations, priorities and reusable grammar rules.</p></div>';
  syncTaskMode();
  updateWordCount();
  go('write');
}
async function reviseEssay(id){
  const d=await fetch(`/api/essays/${id}`).then(r=>r.json());
  revisionParentId=d.id;
  $('#taskMode').value='custom';
  $('#target').value=d.target_cefr||defaultWritingLevel();
  $('#prompt').value=d.prompt||'';
  $('#essayText').value=d.text||'';
  syncTaskMode();
  $('#writeTitle').textContent=`Revise essay #${d.series_id}`;
  $('#writeSubtitle').textContent=`You are creating revision ${Math.max(...d.revisions.map(x=>x.revision_no))+1}.`;
  $('#revisionBanner').innerHTML=`<b>Revision mode</b> · Previous score ${d.overall} · Revision ${d.revision_no}`;
  $('#revisionBanner').classList.remove('hidden');
  $('#cancelRevision').classList.remove('hidden');
  updateWordCount();
  go('write');
}

function bars(obj,error=false){const e=Object.entries(obj||{});if(!e.length)return '<div class="empty">Not enough data yet.</div>';const max=error?Math.max(...e.map(x=>x[1]),1):100;return e.map(([k,v])=>`<div class="barrow"><div class="barlabel"><span>${esc(k.replaceAll('_',' '))}</span><b>${v}${error?'':' / 100'}</b></div><div class="bar"><i style="width:${Math.min(100,v/max*100)}%"></i></div></div>`).join('');}
function lineChart(data){
  if(!data.length)return '<div class="empty">Write your first essay to create the chart.</div>';
  const W=800,H=280,p=44;
  const vals=data.map(x=>x.overall);
  const min=Math.max(0,Math.floor((Math.min(...vals)-10)/10)*10);
  const max=Math.min(100,Math.ceil((Math.max(...vals)+10)/10)*10||100);
  const range=Math.max(10,max-min);
  const pts=data.map((d,i)=>({
    x:p+(W-2*p)*(data.length===1?.5:i/(data.length-1)),
    y:H-p-(d.overall-min)/range*(H-2*p),
    ...d
  }));
  const grid=[0,.25,.5,.75,1].map(t=>{
    const y=p+(H-2*p)*t;
    const value=Math.round(max-range*t);
    return `<line x1="${p}" y1="${y}" x2="${W-p}" y2="${y}" class="chart-grid"/><text x="7" y="${y+4}" class="svgtext">${value}</text>`;
  }).join('');
  const points=pts.map(q=>`
    <circle class="chart-point" tabindex="0" role="img"
      aria-label="Essay ${q.series_id}, score ${q.overall}, ${q.date||''}"
      data-series="${q.series_id}" data-score="${q.overall}" data-date="${q.date||''}"
      cx="${q.x}" cy="${q.y}" r="6"></circle>`).join('');
  return `<div class="chart-tooltip hidden" role="status"></div>
    <svg viewBox="0 0 ${W} ${H}" aria-label="Writing score progress chart">
      ${grid}
      <polyline points="${pts.map(q=>`${q.x},${q.y}`).join(' ')}" fill="none" class="trendline"/>
      ${points}
    </svg>`;
}

function bindChartTooltip(){
  const chart=$('#trendChart');
  if(!chart)return;
  const tip=chart.querySelector('.chart-tooltip');
  const points=[...chart.querySelectorAll('.chart-point')];
  if(!tip||!points.length)return;

  const show=(point)=>{
    const chartRect=chart.getBoundingClientRect();
    const pointRect=point.getBoundingClientRect();
    const series=point.dataset.series;
    const score=point.dataset.score;
    const date=point.dataset.date||'';
    tip.innerHTML=`<b>Essay #${esc(series)}</b><span>Score <strong>${esc(score)}</strong> / 100</span>${date?`<small>${esc(date)}</small>`:''}`;
    tip.classList.remove('hidden');
    const x=pointRect.left-chartRect.left+pointRect.width/2;
    const y=pointRect.top-chartRect.top;
    requestAnimationFrame(()=>{
      const half=tip.offsetWidth/2;
      const left=Math.max(half+8,Math.min(chartRect.width-half-8,x));
      const top=Math.max(8,y-tip.offsetHeight-13);
      tip.style.left=`${left}px`;
      tip.style.top=`${top}px`;
    });
    points.forEach(p=>p.classList.toggle('active',p===point));
  };

  const hide=()=>{
    tip.classList.add('hidden');
    points.forEach(p=>p.classList.remove('active'));
  };

  points.forEach(point=>{
    point.addEventListener('mouseenter',()=>show(point));
    point.addEventListener('focus',()=>show(point));
    point.addEventListener('mouseleave',hide);
    point.addEventListener('blur',hide);
  });
}

async function loadDashboard(){const d=await fetch('/api/dashboard').then(r=>r.json());$('#appVersion').textContent=`v${d.version||'—'}`;$('#skillScore').textContent=d.essay_count?d.skill_score:'—';$('#skillLevel').textContent=d.essay_count?`${d.cefr} estimate`:'No data yet';$('#recentAvg').textContent=d.essay_count?d.recent_average:'—';$('#streak').textContent=d.streak;$('#essayCount').textContent=d.essay_count;$('#revisionCount').textContent=`${d.revision_count} total submissions`;$('#trendChart').innerHTML=lineChart(d.trend);bindChartTooltip();$('#metricBars').innerHTML=bars(d.metrics);renderTodayFocus(d.metrics||{});$('#errorBars').innerHTML=bars(d.error_counts,true);renderErrorMemory(d.error_memory||[]);if(!d.essay_count)$('#milestone').innerHTML='<div class="empty">Your first milestone appears after one essay.</div>';else if(d.next_level){const pct=Math.min(100,d.skill_score/d.next_level.threshold*100);$('#milestone').innerHTML=`<div class="level-big">${d.cefr}<span>${d.skill_score}/100</span></div><div class="bar big"><i style="width:${pct}%"></i></div><p><b>${d.next_level.remaining}</b> points to ${d.next_level.level}.</p>`;}else $('#milestone').innerHTML=`<div class="level-big">${esc(d.cefr)} <span>90+</span></div><p>Top internal progress band reached.</p>`;}
function renderErrorMemory(items){const el=$('#errorMemory');if(!items.length){el.innerHTML='<div class="empty">No recurring errors yet.</div>';return;}el.innerHTML=items.map(x=>`<div class="memory-row"><div><b>${esc(x.category.replaceAll('_',' '))}</b><small>${x.total} occurrences · ${x.first_seen} → ${x.last_seen}</small></div><span class="memory-status ${x.status}">${x.status}</span></div>`).join('');}

let grammarLessons=[];
let currentDictionary=null;
let lastImprovement=null;

function feedbackHtml(d,includeHeader=true){
  const metrics={grammar:d.grammar,vocabulary:d.vocabulary,coherence:d.coherence,task_achievement:d.task_achievement,naturalness:d.naturalness};
  const delta=d.delta&&Object.keys(d.delta).length?`<div class="delta-box"><b>Revision improvement</b>${Object.entries(d.delta).map(([k,v])=>`<span class="${v>=0?'up':'down'}">${esc(k.replaceAll('_',' '))}: ${v>=0?'+':''}${v}</span>`).join('')}</div>`:'';
  const errors=(d.errors||[]).map((e,i)=>`<details ${i<3?'open':''}><summary><span class="tag">${esc((e.category||'other').replaceAll('_',' '))}</span> ${esc(e.fragment)}</summary><div class="feedback"><p>${esc(e.explanation_vi)}</p><p><b>Better:</b> ${esc(e.suggestion)}</p><p class="rule"><b>Rule:</b> ${esc(e.mini_rule_vi)}</p></div></details>`).join('');
  const head=includeHeader?`<div class="score-head"><div><span>OVERALL · REVISION ${d.revision_no}</span><strong>${d.overall}</strong><small>${esc(d.cefr_estimate)} estimate</small></div><span class="eval-badge ai">${esc(d.evaluator)}</span></div>`:'';
  return `${head}${delta}<div class="compact-bars">${bars(metrics)}</div><div class="summary"><h3>Coach summary</h3><p>${esc(d.summary_vi)}</p></div><div class="twocol"><div><h3>Strengths</h3><ul>${(d.strengths_vi||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><h3>Priorities</h3><ul>${(d.priorities_vi||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div><h3>Why & how</h3><div class="errors">${errors||'<p>No individual errors returned.</p>'}</div><div class="upgrade-panel"><div><h3>Upgrade this writing</h3><p>Correct it, strengthen the grammar, or build a better vocabulary set from the same ideas.</p></div><div class="upgrade-actions"><button class="secondary" onclick="improveEssay(${d.id},'correct')">Fix grammar</button><button class="secondary" onclick="improveEssay(${d.id},'grammar')">Stronger grammar</button><button class="secondary" onclick="improveEssay(${d.id},'vocabulary')">Better vocabulary</button><button class="primary" onclick="improveEssay(${d.id},'polish')">Polish both</button></div></div>`;
}

async function improveEssay(id,mode){
  $('#modal').classList.remove('hidden');
  $('#modalContent').innerHTML='<div class="improve-loading"><div class="spinner"></div><p>Local coach is rebuilding the writing…</p></div>';
  try{
    const essay=await fetch(`/api/essays/${id}`).then(r=>r.json());
    const r=await fetch('/api/improve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:essay.text,target_cefr:essay.target_cefr||defaultWritingLevel(),mode})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.detail||'Improvement failed');
    lastImprovement={essayId:id,text:d.upgraded_text||d.corrected_text||essay.text};
    const grammar=(d.grammar_upgrades||[]).map(x=>`<div class="upgrade-item"><span class="tag">grammar</span><b>${esc(x.pattern||'Improvement')}</b><p><s>${esc(x.original)}</s></p><p class="better-line">→ ${esc(x.improved)}</p><small>${esc(x.reason_vi)}</small></div>`).join('');
    const vocab=(d.vocabulary_upgrades||[]).map(x=>`<div class="upgrade-item"><span class="tag">vocabulary</span><b>${esc(x.original)} → ${esc(x.improved)}</b><p>${esc(x.note_vi)}</p><small>Example: ${esc(x.example)}</small></div>`).join('');
    $('#modalContent').innerHTML=`<div class="modal-head"><div><span>WRITING UPGRADE LAB</span><h2>${esc(mode.replaceAll('_',' '))}</h2><small>${esc(d.target_cefr||essay.target_cefr)} target</small></div></div><div class="summary"><h3>Coach note</h3><p>${esc(d.summary_vi)}</p></div><div class="compare-writing"><div><h3>Corrected version</h3><div class="original improved-text">${esc(d.corrected_text)}</div></div><div><h3>Upgraded version</h3><div class="original improved-text highlight-version">${esc(d.upgraded_text)}</div></div></div>${grammar?`<h3>Grammar patterns worth learning</h3><div class="upgrade-list">${grammar}</div>`:''}${vocab?`<h3>Vocabulary upgrades</h3><div class="upgrade-list">${vocab}</div>`:''}<div class="modal-actions"><button class="ghost" onclick="copyImprovedText()">Copy upgraded version</button><button class="primary" onclick="useImprovedAsRevision()">Use as a new revision</button></div>`;
  }catch(e){$('#modalContent').innerHTML=`<div class="error">${esc(e.message)}</div>`;}
}

async function copyImprovedText(){if(lastImprovement)await navigator.clipboard.writeText(lastImprovement.text);}
async function useImprovedAsRevision(){if(!lastImprovement)return;const x={...lastImprovement};closeModal();await reviseEssay(x.essayId);$('#essayText').value=x.text;updateWordCount();}

async function loadLibrary(){
  try{const d=await fetch('/api/library/grammar').then(r=>r.json());grammarLessons=d.lessons||[];}catch{}
  $('#courseStartLevel').value=courseStartLevel();renderGrammarLibrary();updateCourseProgress();loadSavedWords();
}
function switchLibraryTab(tab){
  const grammar=tab==='grammar';
  $('#grammarTabBtn').classList.toggle('active',grammar);$('#vocabTabBtn').classList.toggle('active',!grammar);
  $('#libraryGrammarPane').classList.toggle('hidden',!grammar);$('#libraryVocabularyPane').classList.toggle('hidden',grammar);
  if(!grammar)loadSavedWords();
}
function renderGrammarLibrary(){
  const el=$('#grammarLibrary');if(!el)return;
  const q=($('#grammarSearch')?.value||'').trim().toLowerCase(),level=$('#grammarLevel')?.value||'all';
  const rows=grammarLessons.filter(x=>(level==='all'||x.level===level)&&(!q||`${x.title} ${x.category} ${x.objective_vi}`.toLowerCase().includes(q)));
  if(!rows.length){el.innerHTML='<div class="card empty">No grammar lessons match this filter.</div>';return;}
  const groups={};rows.forEach(x=>(groups[x.level]??=[]).push(x));
  const names={A1:'Foundation',A2:'Core',B1:'Intermediate',B2:'Upper-intermediate',C1:'Advanced',C2:'Mastery'};
  el.innerHTML=Object.entries(groups).map(([lvl,items])=>`<div class="course-level-block"><div class="course-level-head"><div><span class="level-badge level-${lvl.toLowerCase()}">${lvl}</span><b>${names[lvl]}</b></div><small>${items.filter(x=>x.completed).length}/${items.length} completed</small></div><div class="lesson-grid">${items.map(x=>`<button class="lesson-card card ${x.completed?'completed':''}" onclick="openGrammarLesson('${esc(x.id)}')"><div class="lesson-meta"><span>#${x.order}</span><span>${esc(x.category)}</span></div><h3>${x.completed?'✓ ':''}${esc(x.title)}</h3><p>${esc(x.objective_vi)}</p><span class="lesson-open">${x.completed?'Review lesson':'Start lesson'} -></span></button>`).join('')}</div></div>`).join('');
  updateCourseProgress();
}
async function openGrammarLesson(id){
  $('#modal').classList.remove('hidden');$('#modalContent').innerHTML='<div class="improve-loading"><div class="spinner"></div><p>Preparing lesson…</p></div>';
  try{
    const x=await fetch(`/api/library/grammar/${encodeURIComponent(id)}`).then(r=>r.json()),prev=previousGrammarLesson(id),next=nextGrammarLesson(id);
    const cached=grammarLessons.find(y=>y.id===id);if(cached)cached.completed=x.completed;
    $('#modalContent').innerHTML=`<div class="modal-head"><div><span>LESSON ${x.order} · ${esc(x.level)} · ${esc(x.category)}</span><h2>${esc(x.title)}</h2><small>${esc(x.objective_vi)}</small></div></div><div class="summary"><h3>What you are learning</h3><p>${esc(x.explanation_vi)}</p></div><h3>Core rules</h3><ul class="lesson-list">${(x.rules||[]).map(r=>`<li>${esc(r)}</li>`).join('')}</ul><h3>Examples</h3><div class="example-grid">${(x.examples||[]).map(e=>`<div class="example-card"><b>${esc(e.en)}</b><span>${esc(e.vi)}</span></div>`).join('')}</div><h3>Common mistakes</h3><ul class="lesson-list warning-list">${(x.mistakes||[]).map(m=>`<li>${esc(m)}</li>`).join('')}</ul><div class="summary writing-tip"><h3>Writing tip</h3><p>${esc(x.writing_tip_vi||'')}</p></div><div class="lesson-actions">${prev?`<button class="ghost" onclick="openGrammarLesson('${esc(prev.id)}')">← Previous</button>`:'<span></span>'}<button class="${x.completed?'ghost':'primary'}" onclick="setGrammarComplete('${esc(x.id)}',${x.completed?'false':'true'});openGrammarLesson('${esc(x.id)}')">${x.completed?'Mark incomplete':'Mark complete ✓'}</button>${next?`<button class="primary" onclick="setGrammarComplete('${esc(x.id)}',true);openGrammarLesson('${esc(next.id)}')">Complete & next →</button>`:'<button class="primary" onclick="setGrammarComplete(\''+esc(x.id)+'\',true);closeModal()">Finish course ✓</button>'}</div>`;
  }catch(e){$('#modalContent').innerHTML=`<div class="error">${esc(e.message)}</div>`;}
}
async function loadSavedWords(){
  const el=$('#savedWords');if(!el)return;
  try{
    const d=await fetch('/api/vocabulary').then(r=>r.json()),items=d.items||[];
    $('#savedWordCount').textContent=`${items.length} word${items.length===1?'':'s'}`;
    el.innerHTML=items.length?items.map(x=>`<div class="card saved-word"><div class="saved-word-head"><div><h3>${esc(x.word)}</h3><span>${esc(x.phonetic||'')}</span></div><button class="mini-danger" onclick="removeSavedWord('${esc(x.word)}')">Remove</button></div><span class="pos-label">${esc(x.part_of_speech||'word')}</span><p>${esc(x.translation_vi||x.definition||'')}</p>${x.definition&&x.translation_vi?`<small>${esc(x.definition)}</small>`:''}<button class="ghost lookup-again" onclick="lookupWordCentered('${esc(x.word)}')">Look up again</button></div>`).join(''):'<div class="card empty">No saved words yet. Highlight a word anywhere in the app to start your vocabulary notebook.</div>';
  }catch(e){el.innerHTML=`<div class="error">${esc(e.message)}</div>`;}
}
async function removeSavedWord(word){await fetch(`/api/vocabulary/${encodeURIComponent(word)}`,{method:'DELETE'});loadSavedWords();}

function cleanSelectionText(text=''){const t=String(text).trim().replace(/\s+/g,' ');if(t.length<2||t.length>60||t.split(' ').length>4)return '';if(!/^[A-Za-z][A-Za-z' -]*$/.test(t))return '';return t;}
function selectedTextFromTarget(target){
  if(target&&((target.tagName==='TEXTAREA')||(target.tagName==='INPUT'&&['text','search'].includes(target.type)))){const a=target.selectionStart,b=target.selectionEnd;if(typeof a==='number'&&typeof b==='number'&&b>a)return cleanSelectionText(target.value.slice(a,b));}
  const sel=window.getSelection();return cleanSelectionText(sel?sel.toString():'');
}
function hideDictionary(){$('#dictionaryPopover')?.classList.add('hidden');}
async function lookupWordAt(word,x,y){
  word=cleanSelectionText(word);if(!word)return;
  const pop=$('#dictionaryPopover'),content=$('#dictionaryContent');pop.classList.remove('hidden');
  pop.style.left=`${Math.max(12,Math.min(window.innerWidth-360,x))}px`;pop.style.top=`${Math.max(12,Math.min(window.innerHeight-300,y))}px`;
  content.innerHTML=`<div class="dictionary-loading"><div class="spinner"></div><span>Looking up “${esc(word)}”…</span></div>`;
  try{
    const d=await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.detail||'Lookup failed');return b;});currentDictionary=d;
    const defs=(d.definitions||[]).map((m,i)=>`<div class="definition-row"><span class="pos-label">${esc(m.part_of_speech||'')}</span><b>${i+1}. ${esc(m.definition)}</b>${m.example?`<p>“${esc(m.example)}”</p>`:''}${(m.synonyms||[]).length?`<small>Similar: ${m.synonyms.map(esc).join(', ')}</small>`:''}</div>`).join('');
    content.innerHTML=`<div class="dictionary-head"><div><h3>${esc(d.word||word)}</h3><span>${esc(d.phonetic||'')}</span></div><span class="dictionary-source">${esc(d.source||'dictionary')}</span></div><div class="dictionary-definitions">${defs}</div><div class="dictionary-actions">${d.audio?`<button class="ghost" onclick="playDictionaryAudio()">▶ Pronunciation</button>`:''}<button class="ghost" onclick="translateDictionaryWord()">Dịch</button><button class="primary" onclick="saveCurrentWord()">+ Từ mới</button><a class="ghost dictionary-link" href="${esc(d.cambridge_url||'#')}" target="_blank" rel="noopener">Open Cambridge</a></div>`;
  }catch(e){currentDictionary=null;content.innerHTML=`<div class="error">${esc(e.message)}</div>`;}
}
function lookupWordCentered(word){lookupWordAt(word,Math.max(20,window.innerWidth/2-170),Math.max(20,window.innerHeight/2-160));}
function translateDictionaryWord(){if(currentDictionary?.word){selectedLookupText=currentDictionary.word;translateSelectedText();}}
function playDictionaryAudio(){if(currentDictionary?.audio)new Audio(currentDictionary.audio).play();}
async function saveCurrentWord(){
  const d=currentDictionary;if(!d)return;const first=(d.definitions||[])[0]||{};
  await fetch('/api/vocabulary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:d.word||'',phonetic:d.phonetic||'',part_of_speech:first.part_of_speech||'',definition:first.definition||'',translation_vi:d.translation_vi||''})});
  const btn=[...document.querySelectorAll('#dictionaryPopover button')].find(x=>x.textContent==='Save word');if(btn)btn.textContent='Saved ✓';loadSavedWords();
}
function selectedTextForTools(target){
  if(target&&((target.tagName==='TEXTAREA')||(target.tagName==='INPUT'&&['text','search'].includes(target.type)))){
    const a=target.selectionStart,b=target.selectionEnd;
    if(typeof a==='number'&&typeof b==='number'&&b>a)return String(target.value.slice(a,b)).trim().replace(/\s+/g,' ').slice(0,500);
  }
  return String(window.getSelection?.()?.toString()||'').trim().replace(/\s+/g,' ').slice(0,500);
}
function showSelectionToolbar(text,x,y){
  if(!text||text.length<2){hideSelectionToolbar();return;}
  selectedLookupText=text;selectionAnchor={x,y};
  const bar=$('#selectionToolbar');bar.classList.remove('hidden');
  requestAnimationFrame(()=>{bar.style.left=`${Math.max(8,Math.min(window.innerWidth-bar.offsetWidth-8,x))}px`;bar.style.top=`${Math.max(8,Math.min(window.innerHeight-bar.offsetHeight-8,y))}px`;});
  $('#selectionDictionaryBtn').disabled=text.split(/\s+/).length>4||!/^[A-Za-z][A-Za-z' -]*$/.test(text);
}
function hideSelectionToolbar(){$('#selectionToolbar')?.classList.add('hidden');}
function triggerSelectionLookup(ev){
  if(ev.target?.closest?.('#dictionaryPopover,#selectionToolbar,.modal,.sidebar'))return;
  setTimeout(()=>{const text=selectedTextForTools(ev.target);if(!text){hideSelectionToolbar();return;}showSelectionToolbar(text,(ev.clientX||window.innerWidth/2)+8,(ev.clientY||window.innerHeight/2)+8);},30);
}
async function translateSelectedText(){
  const text=selectedLookupText;if(!text)return;hideSelectionToolbar();
  const pop=$('#dictionaryPopover'),content=$('#dictionaryContent');pop.classList.remove('hidden');
  pop.style.left=`${Math.max(12,Math.min(window.innerWidth-380,selectionAnchor.x))}px`;pop.style.top=`${Math.max(12,Math.min(window.innerHeight-320,selectionAnchor.y))}px`;
  content.innerHTML='<div class="dictionary-loading"><div class="spinner"></div><span>Translating…</span></div>';
  try{
    const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}),d=await r.json();
    if(!r.ok)throw new Error(d.detail||'Translation failed');
    currentDictionary={word:text,phonetic:'',definitions:[],translation_vi:d.translation_vi,part_of_speech:d.part_of_speech||'',source:'local translation'};
    content.innerHTML=`<div class="dictionary-head"><div><h3>${esc(text)}</h3><span>${esc(d.part_of_speech||'')}</span></div><span class="dictionary-source">local AI</span></div><div class="translation-card"><span>Vietnamese</span><strong>${esc(d.translation_vi)}</strong>${d.natural_meaning_vi&&d.natural_meaning_vi!==d.translation_vi?`<p>${esc(d.natural_meaning_vi)}</p>`:''}${d.note_vi?`<small>${esc(d.note_vi)}</small>`:''}</div><div class="dictionary-actions"><button class="primary" onclick="saveCurrentTranslation()">+ Add to My Vocabulary</button>${text.split(/\s+/).length<=4?`<button class="ghost" onclick="dictionarySelectedText()">Dictionary</button>`:''}</div>`;
  }catch(e){content.innerHTML=`<div class="error">${esc(e.message)}</div>`;}
}
function dictionarySelectedText(){const text=selectedLookupText;if(!text)return;hideSelectionToolbar();lookupWordAt(text,selectionAnchor.x,selectionAnchor.y);}
async function saveVocabularyPayload(x){await fetch('/api/vocabulary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:x.word||'',phonetic:x.phonetic||'',part_of_speech:x.part_of_speech||'',definition:x.definition||'',translation_vi:x.translation_vi||''})});}
async function saveSelectedText(){
  const text=selectedLookupText;if(!text)return;hideSelectionToolbar();
  try{
    const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}),d=await r.json();
    if(!r.ok)throw new Error(d.detail||'Translation failed');
    await saveVocabularyPayload({word:text,translation_vi:d.translation_vi||'',part_of_speech:d.part_of_speech||''});showSavedToast(text);
  }catch(e){alert(e.message);}
}
async function saveCurrentTranslation(){const d=currentDictionary;if(!d)return;await saveVocabularyPayload({word:d.word,phonetic:d.phonetic||'',part_of_speech:d.part_of_speech||'',definition:(d.definitions||[])[0]?.definition||'',translation_vi:d.translation_vi||''});showSavedToast(d.word);}
function showSavedToast(word){const t=document.createElement('div');t.className='save-toast';t.textContent=`✓ Added “${word}” to My Vocabulary`;document.body.appendChild(t);setTimeout(()=>t.remove(),1800);loadSavedWords();}
function triggerSelectionLookup(ev){
  if(ev.target?.closest?.('#dictionaryPopover,.modal,.sidebar'))return;
  setTimeout(()=>{const word=selectedTextFromTarget(ev.target);if(word)lookupWordAt(word,(ev.clientX||window.innerWidth/2)+12,(ev.clientY||window.innerHeight/2)+12);},40);
}
document.addEventListener('mouseup',triggerSelectionLookup);
document.addEventListener('touchend',ev=>setTimeout(()=>{const text=selectedTextForTools(ev.target);if(text)showSelectionToolbar(text,12,window.innerHeight-120);},260));

let selectedLookupText='';
let selectionAnchor={x:20,y:20};

function courseStartLevel(){return localStorage.getItem('grammarCourseStartLevel')||'A1';}
function saveCourseStartLevel(){localStorage.setItem('grammarCourseStartLevel',$('#courseStartLevel').value);renderGrammarLibrary();}
function levelRank(l){return {A1:1,A2:2,B1:3,B2:4,C1:5,C2:6}[l]||1;}
function updateCourseProgress(){
  if(!grammarLessons.length)return;
  const done=grammarLessons.filter(x=>x.completed).length,total=grammarLessons.length,pct=Math.round(done/total*100);
  $('#courseProgressPct').textContent=`${pct}%`;$('#courseProgressText').textContent=`${done} / ${total} lessons`;$('#courseProgressBar').style.width=`${pct}%`;
  const start=courseStartLevel(),next=grammarLessons.find(x=>!x.completed&&levelRank(x.level)>=levelRank(start))||grammarLessons.find(x=>!x.completed);
  $('#courseNextText').textContent=next?`Next: ${next.level} · ${next.title}`:'Course completed.';
  $('#continueCourseBtn').textContent=next?'Continue course':'Course complete ✓';
}
function continueGrammarCourse(){
  const start=courseStartLevel(),next=grammarLessons.find(x=>!x.completed&&levelRank(x.level)>=levelRank(start))||grammarLessons.find(x=>!x.completed);
  if(next)openGrammarLesson(next.id);
}
async function setGrammarComplete(id,complete=true){
  await fetch(`/api/library/grammar/${encodeURIComponent(id)}/complete`,{method:complete?'POST':'DELETE'});
  const x=grammarLessons.find(y=>y.id===id);if(x)x.completed=complete;renderGrammarLibrary();updateCourseProgress();
}
function nextGrammarLesson(id){const i=grammarLessons.findIndex(x=>x.id===id);return i>=0&&i<grammarLessons.length-1?grammarLessons[i+1]:null;}
function previousGrammarLesson(id){const i=grammarLessons.findIndex(x=>x.id===id);return i>0?grammarLessons[i-1]:null;}
async function submitEssay(){const text=$('#essayText').value.trim();if(text.length<10){alert('Write at least a short paragraph first.');return;}const btn=$('#submitBtn');btn.disabled=true;btn.textContent='Evaluating…';$('#resultPane').className='card result-card loading';$('#resultPane').innerHTML='<div class="spinner"></div><p>AI Coach is reading your writing…</p>';try{const r=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:$('#prompt').value,text,target_cefr:$('#target').value,parent_essay_id:revisionParentId})});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Evaluation failed');revisionParentId=d.id;renderResult(d);loadDashboard();}catch(e){$('#resultPane').innerHTML=`<div class="error">${esc(e.message)}</div>`;}finally{btn.disabled=false;btn.textContent='Evaluate & save';}}
function renderResult(d){
  $('#resultPane').className='card result-card';
  $('#resultPane').innerHTML=feedbackHtml(d,true)+`<button class="primary wide" onclick="reviseEssay(${d.id})">Revise & check again</button>`;
}

async function loadHistory(){const rows=await fetch('/api/essays').then(r=>r.json());const el=$('#historyList');if(!rows.length){el.innerHTML='<div class="card empty">No essays yet.</div>';return;}const groups={};rows.forEach(r=>(groups[r.series_id]??=[]).push(r));el.innerHTML=Object.values(groups).map(g=>{g.sort((a,b)=>a.revision_no-b.revision_no);const latest=g[g.length-1],first=g[0],gain=(latest.overall-first.overall).toFixed(1);return `<div class="card series-card"><div class="series-head"><div><b>Essay #${latest.series_id} · ${esc(promptLabel(latest.prompt))}</b><small>${g.length} revision${g.length>1?'s':''} · latest ${latest.overall} ${g.length>1?`· ${gain>=0?'+':''}${gain} from first`:''}</small></div><button class="ghost" onclick="reviseEssay(${latest.id})">Revise</button></div><div class="revision-list">${g.map(r=>`<button class="revision-chip" onclick="openEssay(${r.id})">v${r.revision_no} <b>${r.overall}</b></button>`).join('')}</div></div>`}).join('');}
async function openEssay(id){
  const d=await fetch(`/api/essays/${id}`).then(r=>r.json());
  $('#modalContent').innerHTML=`<div class="modal-head"><div><span>ESSAY #${d.series_id} · REVISION ${d.revision_no}</span><h2>${esc(promptLabel(d.prompt))}</h2><small>${d.created_at.replace('T',' ').slice(0,16)} · ${d.word_count} words</small></div><div class="history-score bigscore"><strong>${d.overall}</strong><span>${d.cefr_estimate}</span></div></div><div class="revision-nav">${d.revisions.map(x=>`<button class="revision-chip ${x.id===d.id?'active':''}" onclick="openEssay(${x.id})">v${x.revision_no} · ${x.overall}</button>`).join('')}</div><h3>Original writing</h3><div class="original">${esc(d.text)}</div>${feedbackHtml(d,false)}<div class="modal-actions"><button class="primary" onclick="closeModal();reviseEssay(${d.id})">Revise this version</button></div>`;
  $('#modal').classList.remove('hidden');
}
function closeModal(){$('#modal').classList.add('hidden');}
syncTaskMode();
health();loadDashboard();
