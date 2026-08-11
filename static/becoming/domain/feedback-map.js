import {esc,attr} from '../components/primitives.js';
import {t} from './i18n.js';

function normalize(value=''){
  return String(value||'').trim();
}

function isWordChar(char=''){
  return /[A-Za-z0-9À-ỹ\u3400-\u4DBF\u4E00-\u9FFF]/u.test(char);
}

function expandLexicalRange(source,start,end){
  let left=start;
  let right=end;

  // Prevent fragments such as "responsib" from highlighting only part of a word.
  while(left>0 && isWordChar(source[left-1]) && isWordChar(source[left]))left-=1;
  while(right<source.length && isWordChar(source[right-1]) && isWordChar(source[right]))right+=1;

  return {start:left,end:right};
}

function findRange(source,lower,fragment,ranges){
  const needle=fragment.toLocaleLowerCase();
  let from=0;
  while(from<source.length){
    const rawStart=lower.indexOf(needle,from);
    if(rawStart<0)return null;
    const rawEnd=rawStart+fragment.length;
    const expanded=expandLexicalRange(source,rawStart,rawEnd);
    const overlaps=ranges.some(range=>expanded.start<range.end && expanded.end>range.start);
    if(!overlaps)return expanded;
    from=rawStart+Math.max(1,fragment.length);
  }
  return null;
}

function sentenceBounds(source,index){
  const leftBreak=/[.!?。！？\n]/u;
  let start=Math.max(0,index);
  let end=Math.max(0,index);

  while(start>0 && !leftBreak.test(source[start-1]))start-=1;
  while(end<source.length && !leftBreak.test(source[end]))end+=1;
  if(end<source.length)end+=1;

  while(start<end && /\s/u.test(source[start]))start+=1;
  while(end>start && /\s/u.test(source[end-1]))end-=1;
  return {start,end};
}

export function sentenceContext(text,fragment=''){
  const source=String(text||'');
  const value=normalize(fragment);
  if(!source||!value)return '';
  const start=source.toLocaleLowerCase().indexOf(value.toLocaleLowerCase());
  if(start<0)return '';
  const bounds=sentenceBounds(source,start);
  return source.slice(bounds.start,bounds.end).trim();
}

function findEvidenceRanges(text,errors=[],strengths=[]){
  const source=String(text||'');
  const lower=source.toLocaleLowerCase();
  const ranges=[];

  const candidates=[
    ...errors.map((item,index)=>({item,index,kind:'error'})),
    ...strengths.map((item,index)=>({item,index,kind:'strength'})),
  ];

  for(const candidate of candidates){
    const fragment=normalize(candidate.item?.fragment);
    if(!fragment)continue;
    const range=findRange(source,lower,fragment,ranges);
    if(!range)continue;
    ranges.push({
      ...range,
      kind:candidate.kind,
      index:candidate.index,
      key:`${candidate.kind}-${candidate.index}`,
    });
  }

  return ranges.sort((a,b)=>a.start-b.start);
}

const POS_VISUAL_GROUP={
  noun:'noun',
  verb:'verb',
  adjective:'modifier',
  adverb:'modifier',
  pronoun:'reference',
  determiner:'reference',
  preposition:'connector',
  conjunction:'connector',
  particle:'connector',
  numeral:'number',
  other:'other',
};

function normalizedPosAnnotations(text,annotations=[]){
  const source=String(text||'');
  const output=[];
  let lastEnd=-1;

  for(const item of [...(annotations||[])].sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0))){
    const start=Number(item?.start);
    const end=Number(item?.end);
    const fragment=String(item?.fragment||'');
    const pos=String(item?.pos||'other').toLowerCase();

    if(!Number.isInteger(start)||!Number.isInteger(end))continue;
    if(start<0||end<=start||end>source.length)continue;
    if(start<lastEnd)continue;
    if(source.slice(start,end)!==fragment)continue;

    output.push({
      start,
      end,
      fragment,
      pos:POS_VISUAL_GROUP[pos]?pos:'other',
      group:POS_VISUAL_GROUP[pos]||'other',
    });
    lastEnd=end;
  }

  return output;
}

function posTooltip(item){
  const posKey=`pos.${item.pos}`;
  const pos=t(posKey);
  return t('review.pos_tooltip',{
    word:item.fragment,
    pos:pos===posKey?item.pos:pos,
  });
}

function renderAnnotatedSlice(source,start,end,annotations=[]){
  if(start>=end)return '';
  const useful=annotations.filter(item=>item.start>=start&&item.end<=end);
  if(!useful.length)return esc(source.slice(start,end));

  let cursor=start;
  let html='';
  for(const item of useful){
    html+=esc(source.slice(cursor,item.start));
    html+=`<span class="pos-token pos-${attr(item.group)}" data-pos="${attr(item.pos)}" data-tooltip="${attr(posTooltip(item))}">${esc(source.slice(item.start,item.end))}</span>`;
    cursor=item.end;
  }
  html+=esc(source.slice(cursor,end));
  return html;
}

export function highlightedLearnerText(text,errors=[],strengths=[],annotations=[]){
  const source=String(text||'');
  const ranges=findEvidenceRanges(source,errors,strengths);
  const pos=normalizedPosAnnotations(source,annotations);

  if(!ranges.length){
    return renderAnnotatedSlice(source,0,source.length,pos);
  }

  let cursor=0;
  let html='';
  for(const range of ranges){
    html+=renderAnnotatedSlice(source,cursor,range.start,pos);
    const cls=range.kind==='strength'
      ?'evidence-mark strength-mark'
      :'evidence-mark error-mark';
    const label=range.kind==='strength'
      ?t('review.strength_evidence')
      :t('review.error_evidence');
    html+=`<mark class="${cls}" tabindex="0" data-feedback-key="${range.key}" aria-label="${attr(label)}">${renderAnnotatedSlice(source,range.start,range.end,pos)}</mark>`;
    cursor=range.end;
  }
  html+=renderAnnotatedSlice(source,cursor,source.length,pos);
  return html;
}

export function bindEvidenceLinks(root){
  const items=[...root.querySelectorAll('[data-feedback-key]')];
  if(!items.length)return;

  function activate(key,{scroll=false}={}){
    const value=String(key);
    items.forEach(node=>node.classList.toggle('feedback-active',node.dataset.feedbackKey===value));

    if(scroll){
      const safe=CSS.escape(value);
      const target=root.querySelector(`[data-feedback-key="${safe}"].evidence-item, [data-feedback-key="${safe}"].strength-evidence-item`);
      target?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }
  }

  function clear(){
    items.forEach(node=>node.classList.remove('feedback-active'));
  }

  items.forEach(node=>{
    const key=node.dataset.feedbackKey;
    node.addEventListener('mouseenter',()=>activate(key));
    node.addEventListener('mouseleave',clear);
    node.addEventListener('focus',()=>activate(key));
    node.addEventListener('blur',clear);
    node.addEventListener('click',()=>activate(key,{scroll:node.classList.contains('evidence-mark')}));
    node.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        activate(key,{scroll:node.classList.contains('evidence-mark')});
      }
    });
  });
}
