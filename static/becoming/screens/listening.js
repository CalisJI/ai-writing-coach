import {api} from '../api.js';
import {supportLanguage} from '../store.js';
import {esc} from '../components/primitives.js';
import {mediaPlayer,replaySegment} from '../components/media-player.js';
import {uiLocale} from '../domain/i18n.js';

const COPY={
  en:{listen:'LISTEN · FOLLOW',title:'HEAR THE IDEA, ONE MOMENT AT A TIME.',lead:'Bring an external video into one shared media lesson. Watch, follow the original words, read the meaning when available, and replay a sentence.',url:'Video URL',placeholder:'https://…',prepare:'Import / Prepare lesson',validating:'Checking the URL…',processing:'Preparing the transcript…',original:'Original transcript',meaning:'Meaning',unavailable:'Meaning is not available yet.',transcriptMissing:'This video has no usable transcript.',unsupported:'This video source is not supported.',failed:'The lesson could not be prepared.',replay:'Replay',select:'Select a transcript segment to replay it.',shadow:'Shadow this',shared:'The same media and segments can move into Shadowing when Speaking is available.',playback:'Playback is unavailable for this source.'},
  vi:{listen:'NGHE · THEO DÕI',title:'NGHE TỪNG Ý, THEO TỪNG KHOẢNH KHẮC.',lead:'Đưa video bên ngoài vào một bài học media dùng chung. Xem, theo dõi lời gốc, đọc nghĩa khi có và nghe lại từng câu.',url:'URL video',placeholder:'https://…',prepare:'Nhập / Chuẩn bị bài học',validating:'Đang kiểm tra URL…',processing:'Đang chuẩn bị transcript…',original:'Transcript gốc',meaning:'Nghĩa',unavailable:'Bản dịch nghĩa chưa có.',transcriptMissing:'Video này không có transcript phù hợp.',unsupported:'Nguồn video này chưa được hỗ trợ.',failed:'Không thể chuẩn bị bài học.',replay:'Nghe lại',select:'Chọn một đoạn transcript để nghe lại.',shadow:'Shadow câu này',shared:'Cùng media và segment này có thể chuyển sang Shadowing khi Speaking sẵn sàng.',playback:'Không thể phát nguồn này.'},
  zh:{listen:'听力 · 跟随',title:'逐句听见意思。',lead:'把外部视频导入一个共享媒体课程。观看视频、跟随原文、在可用时阅读释义，并重听每个句子。',url:'视频网址',placeholder:'https://…',prepare:'导入 / 准备课程',validating:'正在检查网址…',processing:'正在准备字幕…',original:'原文字幕',meaning:'释义',unavailable:'释义暂时不可用。',transcriptMissing:'这个视频没有可用字幕。',unsupported:'暂不支持这个视频来源。',failed:'无法准备课程。',replay:'重听',select:'选择一段字幕后重听。',shadow:'跟读这句',shared:'Speaking 可用后，同一媒体和句段可直接进入跟读。',playback:'这个来源暂时无法播放。'},
};

const text=()=>COPY[uiLocale()]||COPY.en;
const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;

export function validMediaUrl(value){
  try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}
}

export function mediaImportState(payload){
  const asset=payload?.asset||{};
  if(asset.processing_state==='processing'||asset.processing_state==='registered')return 'processing';
  if(asset.processing_state==='failed')return 'error';
  if(asset.processing_state==='ready'&&!asset.transcript_available)return 'transcript-unavailable';
  if(asset.processing_state==='ready'&&payload?.transcript?.segments?.length)return 'ready';
  return 'error';
}

function stateMessage(kind,message=''){
  const c=text();
  const labels={validating:c.validating,processing:c.processing,unsupported:c.unsupported,'transcript-unavailable':c.transcriptMissing,error:message||c.failed};
  return labels[kind]?`<div class="listening-state listening-state-${kind}" role="status">${esc(labels[kind])}</div>`:'';
}

function workspace(payload,selectedId=null,{original=true,meaning=true}={}){
  const c=text();
  const segments=payload.transcript?.segments||[];
  const translations=new Map((payload.translations||[]).map(item=>[item.segment_id,item.translated_meaning]));
  const selected=selectedId||segments[0]?.segment_id;
  return `<div class="listening-workspace">
    <section class="listening-video visual-hero-surface">
      <div class="listening-video-frame">${mediaPlayer(payload.playback,payload.asset?.title).replace('Playback is unavailable for this source.',c.playback)}</div>
      <div class="listening-media-caption"><span>${esc(payload.asset?.source_provider||'media')}</span><h2>${esc(payload.asset?.title||'Media lesson')}</h2></div>
    </section>
    <section class="listening-transcript visual-section-surface" aria-label="${esc(c.original)}">
      <div class="listening-toolbar">
        <div><strong>${esc(c.original)}</strong><small>${esc(c.select)}</small></div>
        <label><input id="toggleOriginal" type="checkbox" ${original?'checked':''}> ${esc(c.original)}</label>
        <label><input id="toggleMeaning" type="checkbox" ${meaning?'checked':''}> ${esc(c.meaning)}</label>
      </div>
      <div class="listening-segments">
        ${segments.map(segment=>`<article class="listening-segment ${segment.segment_id===selected?'selected':''}" data-segment-id="${esc(segment.segment_id)}" tabindex="0">
          <button class="listening-segment-main" type="button" data-select-segment="${esc(segment.segment_id)}">
            <time>${stamp(segment.start_ms)}</time>
            <span class="listening-segment-copy">
              ${original?`<strong>${esc(segment.original_text)}</strong>`:''}
              ${meaning?(translations.has(segment.segment_id)?`<span>${esc(translations.get(segment.segment_id))}</span>`:`<span class="translation-unavailable">${esc(c.unavailable)}</span>`):''}
            </span>
          </button>
          ${segment.segment_id===selected?`<div class="listening-segment-actions"><button type="button" class="button button-secondary" data-replay-segment="${esc(segment.segment_id)}">${esc(c.replay)}</button><button type="button" class="button button-secondary" disabled title="${esc(c.shared)}">${esc(c.shadow)}</button></div>`:''}
        </article>`).join('')}
      </div>
      <p class="listening-shared-note">${esc(c.shared)}</p>
    </section>
  </div>`;
}

function bindWorkspace(root,payload,view){
  const rerender=()=>{
    root.querySelector('#listeningReady').innerHTML=workspace(payload,view.selected,view);
    bindWorkspace(root,payload,view);
  };
  root.querySelector('#toggleOriginal')?.addEventListener('change',event=>{view.original=event.target.checked;rerender();});
  root.querySelector('#toggleMeaning')?.addEventListener('change',event=>{view.meaning=event.target.checked;rerender();});
  root.querySelectorAll('[data-select-segment]').forEach(button=>button.addEventListener('click',()=>{view.selected=button.dataset.selectSegment;rerender();}));
  root.querySelectorAll('[data-replay-segment]').forEach(button=>button.addEventListener('click',()=>{
    const segment=payload.transcript.segments.find(item=>item.segment_id===button.dataset.replaySegment);
    if(segment)replaySegment(root,payload.playback,segment.start_ms);
  }));
}

export async function renderListening(root){
  const c=text();
  root.innerHTML=`<section class="page listening-page">
    <header class="listening-header"><span class="editorial-kicker">${esc(c.listen)}</span><h1 class="editorial-title">${esc(c.title)}</h1><p class="editorial-lead">${esc(c.lead)}</p></header>
    <form id="mediaImportForm" class="listening-import visual-section-surface" novalidate>
      <label for="mediaSourceUrl">${esc(c.url)}</label><div><input id="mediaSourceUrl" type="url" inputmode="url" placeholder="${esc(c.placeholder)}" required><button class="button button-primary" type="submit">${esc(c.prepare)}</button></div>
      <div id="listeningStatus" aria-live="polite"></div>
    </form>
    <div id="listeningReady"></div>
  </section>`;
  const form=root.querySelector('#mediaImportForm');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const input=root.querySelector('#mediaSourceUrl');
    const status=root.querySelector('#listeningStatus');
    const button=form.querySelector('button');
    status.innerHTML=stateMessage('validating');
    if(!validMediaUrl(input.value)){input.setCustomValidity(c.unsupported);input.reportValidity();status.innerHTML=stateMessage('unsupported');return;}
    input.setCustomValidity('');button.disabled=true;
    try{
      const payload=await api.importMedia({source_url:input.value,target_language:supportLanguage()});
      const kind=mediaImportState(payload);
      status.innerHTML=stateMessage(kind);
      if(kind==='ready'){
        const view={selected:payload.transcript.segments[0].segment_id,original:true,meaning:true};
        root.querySelector('#listeningReady').innerHTML=workspace(payload,view.selected,view);
        bindWorkspace(root,payload,view);
      }
    }catch(error){
      const message=String(error.message||error);
      const kind=/unsupported/i.test(message)?'unsupported':/transcript/i.test(message)?'transcript-unavailable':'error';
      status.innerHTML=stateMessage(kind,message);
    }finally{button.disabled=false;}
  });
}
