import {api} from '../api.js';
import {supportLanguage} from '../store.js';
import {esc} from '../components/primitives.js';
import {mediaPlayer,replaySegment,setPlaybackRate as setMediaPlaybackRate} from '../components/media-player.js';
import {uiLocale} from '../domain/i18n.js';

const COPY={
  en:{listen:'LISTEN · FOLLOW',title:'HEAR THE IDEA, ONE MOMENT AT A TIME.',lead:'Bring an external video into one shared media lesson. Watch, follow the original words, read the meaning when available, and replay a sentence.',url:'Video URL',placeholder:'https://…',prepare:'Import / Prepare lesson',validating:'Checking the URL…',processing:'Preparing the transcript…',original:'Original transcript',meaning:'Meaning',unavailable:'Meaning is not available yet.',notRequired:'Translation is not required for the selected support language.',translationUnavailable:'Meaning could not be generated right now. Continue with the original transcript.',translationTooLarge:'This lesson is too large for automatic meaning generation. Continue with the original transcript.',transcriptMissing:'This video has no usable transcript.',unsupported:'This video source is not supported.',malformedUrl:'Enter a valid public media URL.',unsupportedProvider:'This media provider is not supported yet.',mediaUnavailable:'This media is private or unavailable.',providerTimeout:'The media provider did not respond in time. Please try again.',providerFailure:'The media provider could not prepare this lesson. Please try again.',unsupportedSourceLanguage:'This media language is not supported yet.',invalidTargetLanguage:'Choose a valid support language.',failed:'The lesson could not be prepared.',previous:'Previous segment',next:'Next segment',replay:'Replay',speed:'Speed',select:'Select a transcript segment to replay it.',shadow:'Shadow this',shared:'The same media and segments can move into Shadowing when Speaking is available.',playback:'Playback is unavailable for this source.'},
  vi:{listen:'NGHE · THEO DÕI',title:'NGHE TỪNG Ý, THEO TỪNG KHOẢNH KHẮC.',lead:'Đưa video bên ngoài vào một bài học media dùng chung. Xem, theo dõi lời gốc, đọc nghĩa khi có và nghe lại từng câu.',url:'URL video',placeholder:'https://…',prepare:'Nhập / Chuẩn bị bài học',validating:'Đang kiểm tra URL…',processing:'Đang chuẩn bị transcript…',original:'Transcript gốc',meaning:'Nghĩa',unavailable:'Bản dịch nghĩa chưa có.',notRequired:'Không cần bản dịch cho ngôn ngữ hỗ trợ đã chọn.',translationUnavailable:'Hiện chưa thể tạo phần nghĩa. Bạn vẫn có thể tiếp tục với transcript gốc.',translationTooLarge:'Bài học này quá lớn để tự động tạo phần nghĩa. Bạn vẫn có thể tiếp tục với transcript gốc.',transcriptMissing:'Video này không có transcript phù hợp.',unsupported:'Nguồn video này chưa được hỗ trợ.',malformedUrl:'Hãy nhập URL media công khai hợp lệ.',unsupportedProvider:'Nhà cung cấp media này chưa được hỗ trợ.',mediaUnavailable:'Media này đang riêng tư hoặc không khả dụng.',providerTimeout:'Nhà cung cấp media không phản hồi kịp thời. Vui lòng thử lại.',providerFailure:'Nhà cung cấp media không thể chuẩn bị bài học này. Vui lòng thử lại.',unsupportedSourceLanguage:'Ngôn ngữ của media này chưa được hỗ trợ.',invalidTargetLanguage:'Hãy chọn ngôn ngữ hỗ trợ hợp lệ.',failed:'Không thể chuẩn bị bài học.',previous:'Đoạn trước',next:'Đoạn sau',replay:'Nghe lại',speed:'Tốc độ',select:'Chọn một đoạn transcript để nghe lại.',shadow:'Shadow câu này',shared:'Cùng media và segment này có thể chuyển sang Shadowing khi Speaking sẵn sàng.',playback:'Không thể phát nguồn này.'},
  zh:{listen:'听力 · 跟随',title:'逐句听见意思。',lead:'把外部视频导入一个共享媒体课程。观看视频、跟随原文、在可用时阅读释义，并重听每个句子。',url:'视频网址',placeholder:'https://…',prepare:'导入 / 准备课程',validating:'正在检查网址…',processing:'正在准备字幕…',original:'原文字幕',meaning:'释义',unavailable:'释义暂时不可用。',notRequired:'所选辅助语言不需要翻译。',translationUnavailable:'目前无法生成释义。你仍可继续使用原文字幕。',translationTooLarge:'本课内容过大，当前无法自动生成释义。你仍可继续使用原文字幕。',transcriptMissing:'这个视频没有可用字幕。',unsupported:'暂不支持这个视频来源。',malformedUrl:'请输入有效的公开视频网址。',unsupportedProvider:'暂不支持这个媒体提供方。',mediaUnavailable:'该媒体为私密内容或暂不可用。',providerTimeout:'媒体提供方响应超时，请重试。',providerFailure:'媒体提供方无法准备本课，请重试。',unsupportedSourceLanguage:'暂不支持该媒体语言。',invalidTargetLanguage:'请选择有效的辅助语言。',failed:'无法准备课程。',previous:'上一句',next:'下一句',replay:'重听',speed:'速度',select:'选择一段字幕后重听。',shadow:'跟读这句',shared:'Speaking 可用后，同一媒体和句段可直接进入跟读。',playback:'这个来源暂时无法播放。'},
};
let listeningViewSequence=0;

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

const UNSUPPORTED_CATEGORIES=new Set(['malformed_url','unsupported_provider']);
const ERROR_CATEGORIES=new Set([
  'media_unavailable','provider_timeout','provider_failure','malformed_transcript',
  'unsupported_source_language','invalid_target_language',
]);

export function mediaImportErrorState(error){
  if(UNSUPPORTED_CATEGORIES.has(error?.category))return 'unsupported';
  if(ERROR_CATEGORIES.has(error?.category))return 'error';
  return 'error';
}

function stateMessage(kind,error=null){
  const c=text();
  const categoryLabels={
    malformed_url:c.malformedUrl,
    unsupported_provider:c.unsupportedProvider,
    media_unavailable:c.mediaUnavailable,
    provider_timeout:c.providerTimeout,
    provider_failure:c.providerFailure,
    unsupported_source_language:c.unsupportedSourceLanguage,
    invalid_target_language:c.invalidTargetLanguage,
  };
  const category=typeof error?.category==='string'?error.category:'';
  const categoryMessage=categoryLabels[category];
  const unknownMessage=typeof error?.message==='string'&&error.message ? error.message : c.failed;
  const labels={validating:c.validating,processing:c.processing,unsupported:categoryMessage||c.unsupported,'transcript-unavailable':c.transcriptMissing,error:categoryMessage||(category?c.failed:unknownMessage)};
  const categoryClass=categoryMessage?` listening-state-${category}`:'';
  return labels[kind]?`<div class="listening-state listening-state-${kind}${categoryClass}" role="status">${esc(labels[kind])}</div>`:'';
}

function workspace(payload,selectedId=null,{original=true,meaning=true,playbackRate=1}={}){
  const c=text();
  const segments=payload.transcript?.segments||[];
  const translations=new Map((payload.translations||[]).map(item=>[item.segment_id,item.translated_meaning]));
  const translationStatus=payload.translation?.status;
  const translationNotRequired=translationStatus==='not_required';
  const translationDegraded=translationStatus==='unavailable'||translationStatus==='too_large';
  const translationStatusMessage=translationStatus==='unavailable'?c.translationUnavailable:translationStatus==='too_large'?c.translationTooLarge:null;
  const selected=selectedId||segments[0]?.segment_id;
  const selectedIndex=segments.findIndex(segment=>segment.segment_id===selected);
  return `<div class="listening-workspace">
    <section class="listening-video visual-hero-surface">
      <div class="listening-video-frame">${mediaPlayer(payload.playback,payload.asset?.title).replace('Playback is unavailable for this source.',c.playback)}</div>
      <div class="listening-media-caption"><span>${esc(payload.asset?.source_provider||'media')}</span><h2>${esc(payload.asset?.title||'Media lesson')}</h2></div>
    </section>
    <section class="listening-transcript visual-section-surface" aria-label="${esc(c.original)}">
      <div class="listening-toolbar">
        <div><strong>${esc(c.original)}</strong><small>${esc(c.select)}</small></div>
        <label><input id="toggleOriginal" type="checkbox" ${original?'checked':''}> ${esc(c.original)}</label>
        <label><input id="toggleMeaning" type="checkbox" ${meaning?'checked':''} ${translationNotRequired||translationDegraded?'disabled':''}> ${esc(c.meaning)}</label>
      </div>
      ${translationNotRequired?`<p class="translation-not-required" role="status">${esc(c.notRequired)}</p>`:''}
      ${translationStatusMessage?`<p class="translation-status translation-status-${esc(translationStatus)}" role="status">${esc(translationStatusMessage)}</p>`:''}
      <div class="listening-practice-controls" aria-label="${esc(c.select)}">
        <button type="button" class="button button-secondary" data-previous-segment ${selectedIndex<=0?'disabled':''}>${esc(c.previous)}</button>
        <button type="button" class="button button-primary" data-replay-current>${esc(c.replay)}</button>
        <button type="button" class="button button-secondary" data-next-segment ${selectedIndex<0||selectedIndex>=segments.length-1?'disabled':''}>${esc(c.next)}</button>
        <label>${esc(c.speed)} <select id="listeningPlaybackRate">${[.75,1,1.25].map(rate=>`<option value="${rate}" ${rate===playbackRate?'selected':''}>${rate.toFixed(2).replace(/0$/,'')}x</option>`).join('')}</select></label>
      </div>
      <div class="listening-segments">
        ${segments.map(segment=>`<article class="listening-segment ${segment.segment_id===selected?'selected':''}" data-segment-id="${esc(segment.segment_id)}" ${segment.segment_id===selected?'aria-current="true"':''}>
          <button class="listening-segment-main" type="button" data-select-segment="${esc(segment.segment_id)}">
            <time>${stamp(segment.start_ms)}</time>
            <span class="listening-segment-copy">
              ${original?`<strong>${esc(segment.original_text)}</strong>`:''}
              ${meaning&&!translationNotRequired&&!translationDegraded?(translations.has(segment.segment_id)?`<span>${esc(translations.get(segment.segment_id))}</span>`:`<span class="translation-unavailable">${esc(c.unavailable)}</span>`):''}
            </span>
          </button>
          ${segment.segment_id===selected?`<div class="listening-segment-actions"><button type="button" class="button button-secondary" disabled title="${esc(c.shared)}">${esc(c.shadow)}</button></div>`:''}
        </article>`).join('')}
      </div>
      <p class="listening-shared-note">${esc(c.shared)}</p>
    </section>
  </div>`;
}

function listeningPage(model,viewId){
  const c=text();
  const busy=model.status==='validating';
  return `<section class="page listening-page" data-listening-view="${viewId}">
    <header class="listening-header"><span class="editorial-kicker">${esc(c.listen)}</span><h1 class="editorial-title">${esc(c.title)}</h1><p class="editorial-lead">${esc(c.lead)}</p></header>
    <form id="mediaImportForm" class="listening-import visual-section-surface" novalidate>
      <label for="mediaSourceUrl">${esc(c.url)}</label><div><input id="mediaSourceUrl" type="url" inputmode="url" placeholder="${esc(c.placeholder)}" required><button class="button button-primary" type="submit" ${busy?'disabled':''}>${esc(c.prepare)}</button></div>
      <div id="listeningStatus" aria-live="polite">${stateMessage(model.status,model.error)}</div>
    </form>
    <div id="listeningReady">${model.status==='ready'?workspace(model.payload,model.selected,model):''}</div>
  </section>`;
}

export function createListeningController({importMedia,targetLanguage,onChange=()=>{}}){
  const model={status:'empty',payload:null,error:null,selected:null,original:true,meaning:true,playbackRate:1};
  const viewId=`listening-${++listeningViewSequence}`;
  let importGeneration=0;
  const changed=()=>onChange({...model});
  return {
    model,
    viewId,
    html:()=>listeningPage(model,viewId),
    async importUrl(sourceUrl){
      const generation=++importGeneration;
      model.status='validating';model.error=null;changed();
      if(!validMediaUrl(sourceUrl)){model.status='unsupported';changed();return;}
      try{
        const payload=await importMedia({source_url:sourceUrl,target_language:targetLanguage()});
        if(generation!==importGeneration)return;
        model.payload=payload;
        model.status=mediaImportState(model.payload);
        model.selected=model.status==='ready'?model.payload.transcript.segments[0].segment_id:null;
      }catch(error){
        if(generation!==importGeneration)return;
        model.error=error;
        model.status=mediaImportErrorState(error);
      }
      changed();
    },
    select(segmentId){
      if(!model.payload?.transcript?.segments?.some(segment=>segment.segment_id===segmentId))return false;
      model.selected=segmentId;changed();return true;
    },
    moveSelection(offset){
      const segments=model.payload?.transcript?.segments||[];
      const index=segments.findIndex(segment=>segment.segment_id===model.selected);
      const target=segments[index+offset];
      if(!target)return false;
      model.selected=target.segment_id;changed();return true;
    },
    toggleOriginal(value){model.original=value;changed();},
    toggleMeaning(value){model.meaning=value;changed();},
    setPlaybackRate(value){
      if(![.75,1,1.25].includes(value))return false;
      model.playbackRate=value;return true;
    },
  };
}

export async function renderListening(root,{importMedia=api.importMedia,targetLanguage=supportLanguage}={}){
  let controller;
  let mounted=false;
  let visibleSelection=null;
  const render=()=>{
    if(mounted&&!root.querySelector(`[data-listening-view="${controller.viewId}"]`))return;
    root.innerHTML=controller.html();
    mounted=true;
    root.querySelector('#mediaImportForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      controller.importUrl(root.querySelector('#mediaSourceUrl').value);
    });
    root.querySelector('#toggleOriginal')?.addEventListener('change',event=>controller.toggleOriginal(event.target.checked));
    root.querySelector('#toggleMeaning')?.addEventListener('change',event=>controller.toggleMeaning(event.target.checked));
    root.querySelectorAll('[data-select-segment]').forEach(button=>button.addEventListener('click',()=>controller.select(button.dataset.selectSegment)));
    root.querySelector('[data-previous-segment]')?.addEventListener('click',()=>controller.moveSelection(-1));
    root.querySelector('[data-next-segment]')?.addEventListener('click',()=>controller.moveSelection(1));
    root.querySelector('[data-replay-current]')?.addEventListener('click',()=>{
      const payload=controller.model.payload;
      const segment=payload.transcript.segments.find(item=>item.segment_id===controller.model.selected);
      if(segment)replaySegment(root,payload.playback,segment.start_ms);
    });
    root.querySelector('#listeningPlaybackRate')?.addEventListener('change',event=>{
      const rate=Number(event.target.value);
      if(setMediaPlaybackRate(root,controller.model.payload.playback,rate))controller.setPlaybackRate(rate);
      else event.target.value=String(controller.model.playbackRate);
    });
    if(controller.model.playbackRate!==1){
      root.querySelector('#listeningPlayer')?.addEventListener('load',()=>setMediaPlaybackRate(root,controller.model.payload.playback,controller.model.playbackRate),{once:true});
    }
    if(controller.model.selected!==visibleSelection){
      const selected=[...root.querySelectorAll('[data-segment-id]')].find(item=>item.dataset.segmentId===controller.model.selected);
      selected?.scrollIntoView?.({block:'nearest'});
      visibleSelection=controller.model.selected;
    }
  };
  controller=createListeningController({importMedia,targetLanguage,onChange:render});
  render();
  return controller;
}
