export function languageObject(language='en'){
  const zh=language==='zh';
  return `<div class="identity-object ${zh?'identity-object--zh':''}" aria-hidden="true">
    <div class="identity-object__well"></div>
    <div class="identity-object__tile">
      <span class="identity-object__glyph">${zh?'字':'Aa'}</span>
    </div>
  </div>`;
}

export function refinementObject(){
  return `<div class="refinement-object" aria-hidden="true">
    <div class="refinement-object__fragment">A</div>
    <div class="refinement-object__fragment">?</div>
    <div class="refinement-object__fragment">字</div>
    <div class="refinement-object__path"></div>
    <div class="refinement-object__result">→</div>
  </div>`;
}

export function masteryObject(stage='Developing'){
  const glyph={
    Emerging:'01',
    Developing:'02',
    Stable:'03',
    Mastered:'04',
  }[stage]||'02';
  return `<div class="mastery-object" aria-hidden="true">${glyph}</div>`;
}
