import {t} from '../domain/i18n.js';

export function esc(value=''){
  return String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;',
  }[char]));
}

export function attr(value=''){
  return esc(value);
}

export function toast(message,{duration=3200}={}){
  const region=document.getElementById('toastRegion');
  if(!region)return;
  const item=document.createElement('div');
  item.className='toast';
  item.textContent=message;
  region.appendChild(item);
  setTimeout(()=>item.remove(),duration);
}

export function showDialog(title,html){
  const backdrop=document.getElementById('dialogBackdrop');
  const dialogTitle=document.getElementById('dialogTitle');
  const body=document.getElementById('dialogBody');
  if(!backdrop||!dialogTitle||!body)return;
  dialogTitle.textContent=title;
  body.innerHTML=html;
  backdrop.classList.remove('hidden');
  backdrop.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  document.getElementById('dialogClose')?.focus();
}

export function closeDialog(){
  const backdrop=document.getElementById('dialogBackdrop');
  if(!backdrop)return;
  backdrop.classList.add('hidden');
  backdrop.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}


export function spinner(label=''){
  const text=label||t('chrome.loading');
  return `<span class="busy-indicator" role="status" aria-live="polite">
    <span class="busy-spinner" aria-hidden="true"></span>
    <span>${esc(text)}</span>
  </span>`;
}

const BUSY_ROTATION_MS=6000;
const busyRotationTimers=new WeakMap();

function busyLabelSpan(control){
  return control.querySelector(':scope > span:last-child');
}

export function setBusy(control,busy,{label=''}={}){
  if(!control)return;
  if(busy){
    if(control.dataset.busy==='true')return;
    control.dataset.busy='true';
    control.dataset.previousHtml=control.innerHTML;
    control.disabled=true;
    control.setAttribute('aria-busy','true');
    const messages=Array.isArray(label)?label.filter(Boolean):[label||t('busy.working')];
    control.innerHTML=`<span class="busy-spinner" aria-hidden="true"></span><span>${esc(messages[0])}</span>`;
    if(messages.length>1){
      let index=0;
      const timer=setInterval(()=>{
        index=(index+1)%messages.length;
        const span=busyLabelSpan(control);
        if(span)span.textContent=messages[index];
      },BUSY_ROTATION_MS);
      busyRotationTimers.set(control,timer);
    }
  }else{
    if(control.dataset.busy!=='true')return;
    const timer=busyRotationTimers.get(control);
    if(timer){
      clearInterval(timer);
      busyRotationTimers.delete(control);
    }
    control.innerHTML=control.dataset.previousHtml||control.textContent||'';
    delete control.dataset.previousHtml;
    delete control.dataset.busy;
    control.disabled=false;
    control.removeAttribute('aria-busy');
  }
}

export async function runBusy(control,task,{label=''}={}){
  setBusy(control,true,{label});
  try{
    return await task();
  }finally{
    setBusy(control,false);
  }
}

export function updateDialog(html,{title=null}={}){
  const body=document.getElementById('dialogBody');
  const dialogTitle=document.getElementById('dialogTitle');
  if(title!=null&&dialogTitle)dialogTitle.textContent=title;
  if(body)body.innerHTML=html;
}

export function showLoadingDialog(title,label=''){
  showDialog(title,`<div class="dialog-loading">${spinner(label||t('chrome.loading'))}</div>`);
}

export function loadingBlock(lines=3){
  return `<div class="state-message" aria-label="${attr(t('chrome.loading'))}">
    ${Array.from({length:lines},()=>'<div class="loading-line" style="margin-bottom:12px"></div>').join('')}
  </div>`;
}

export function errorBlock(message){
  return `<div class="error-state" role="alert">${esc(message)}</div>`;
}

export function button(label,{
  kind='primary',
  id='',
  type='button',
  attrs='',
}={}){
  return `<button ${id?`id="${attr(id)}"`:''} type="${attr(type)}" class="button button-${attr(kind)}" ${attrs}>${esc(label)}</button>`;
}


export function helpTip(text,label=''){
  label=label||t('chrome.details');
  if(!text)return '';
  return `<span class="help-tip">
    <button class="help-tip-trigger" type="button" aria-label="${attr(label)}" data-tooltip="${attr(text)}">?</button>
  </span>`;
}

let activeTooltipTarget=null;

function tooltipElement(){
  let node=document.getElementById('globalHelpTooltip');
  if(node)return node;

  node=document.createElement('div');
  node.id='globalHelpTooltip';
  node.className='global-help-tooltip hidden';
  node.setAttribute('role','tooltip');
  document.body.appendChild(node);
  return node;
}

function placeTooltip(target,node){
  if(!target||!node)return;
  const rect=target.getBoundingClientRect();
  const gap=10;
  const margin=12;

  node.style.left='0px';
  node.style.top='0px';
  node.classList.remove('hidden');

  const box=node.getBoundingClientRect();
  let left=rect.left+(rect.width/2)-(box.width/2);
  left=Math.max(margin,Math.min(left,window.innerWidth-box.width-margin));

  let top=rect.top-box.height-gap;
  let placement='top';
  if(top<margin){
    top=rect.bottom+gap;
    placement='bottom';
  }
  top=Math.max(margin,Math.min(top,window.innerHeight-box.height-margin));

  node.style.left=`${Math.round(left)}px`;
  node.style.top=`${Math.round(top)}px`;
  node.dataset.placement=placement;
}

function showTooltip(target){
  const text=String(target?.dataset?.tooltip||'').trim();
  if(!target||!text)return;

  const node=tooltipElement();
  activeTooltipTarget=target;
  node.textContent=text;
  node.classList.remove('hidden');
  target.setAttribute('aria-describedby','globalHelpTooltip');
  placeTooltip(target,node);
}

function hideTooltip(target=null){
  if(target&&activeTooltipTarget&&target!==activeTooltipTarget)return;
  const node=document.getElementById('globalHelpTooltip');
  activeTooltipTarget?.removeAttribute('aria-describedby');
  activeTooltipTarget=null;
  node?.classList.add('hidden');
}

export function installTooltipLayer(){
  tooltipElement();

  document.addEventListener('pointerover',event=>{
    const target=event.target instanceof Element
      ?event.target.closest('[data-tooltip]')
      :null;
    if(!target||target===activeTooltipTarget)return;
    showTooltip(target);
  });

  document.addEventListener('pointerout',event=>{
    const target=event.target instanceof Element
      ?event.target.closest('[data-tooltip]')
      :null;
    if(!target)return;
    const next=event.relatedTarget instanceof Element
      ?event.relatedTarget.closest('[data-tooltip]')
      :null;
    if(next===target)return;
    hideTooltip(target);
  });

  document.addEventListener('focusin',event=>{
    const target=event.target instanceof Element
      ?event.target.closest('[data-tooltip]')
      :null;
    if(target)showTooltip(target);
  });

  document.addEventListener('focusout',event=>{
    const target=event.target instanceof Element
      ?event.target.closest('[data-tooltip]')
      :null;
    if(target)hideTooltip(target);
  });

  const reposition=()=>{
    if(activeTooltipTarget){
      placeTooltip(activeTooltipTarget,tooltipElement());
    }
  };
  window.addEventListener('resize',reposition,{passive:true});
  window.addEventListener('scroll',reposition,{passive:true,capture:true});
}

export function metricRows(metrics={}){
  return Object.entries(metrics).map(([key,value])=>{
    const label=key.replaceAll('_',' ');
    const pct=Math.max(0,Math.min(100,Number(value)||0));
    return `<div class="metric-row">
      <span>${esc(label)}</span>
      <div class="metric-track" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <strong>${pct.toFixed(0)}</strong>
    </div>`;
  }).join('');
}
