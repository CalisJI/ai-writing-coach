import {api} from '../api.js';
import {supportLanguage} from '../store.js';
import {esc} from '../components/primitives.js';
import {mediaPlayer,playbackAvailable,replaySegment,setPlaybackRate as setMediaPlaybackRate} from '../components/media-player.js';
import {uiLocale} from '../domain/i18n.js';
import {
  MAX_LISTENING_EVALUATION_UNITS,
  MAX_LISTENING_RECONSTRUCTION_CHARS,
  createListeningPracticeSession,
  evaluateListeningReconstruction,
  listeningPracticeSummary,
  listeningUnits,
  recordListeningPracticeAttempt,
  retryListeningPracticeSegment,
  revealListeningPracticeAnswer,
  selectListeningPracticeSegment,
  setListeningPracticeDraft,
} from '../domain/listening-practice.js';

const COPY={
  en:{listen:'LISTEN · FOLLOW',title:'HEAR THE IDEA, ONE MOMENT AT A TIME.',lead:'Bring an external video into one shared media lesson. Watch, follow the original words, read the meaning when available, and replay a sentence.',url:'Video URL',placeholder:'https://…',prepare:'Import / Prepare lesson',validating:'Checking the URL…',processing:'Preparing the transcript…',original:'Original transcript',meaning:'Meaning',unavailable:'Meaning is not available yet.',notRequired:'Translation is not required for the selected support language.',translationUnavailable:'Meaning could not be generated right now. Continue with the original transcript.',translationTooLarge:'This lesson is too large for automatic meaning generation. Continue with the original transcript.',transcriptMissing:'This video has no usable transcript.',unsupported:'This video source is not supported.',malformedUrl:'Enter a valid public media URL.',unsupportedProvider:'This media provider is not supported yet.',mediaUnavailable:'This media is private or unavailable.',providerTimeout:'The media provider did not respond in time. Please try again.',providerFailure:'The media provider could not prepare this lesson. Please try again.',unsupportedSourceLanguage:'This media language is not supported yet.',invalidTargetLanguage:'Choose a valid support language.',failed:'The lesson could not be prepared.',previous:'Previous segment',next:'Next segment',replay:'Replay',speed:'Speed',select:'Select a transcript segment to replay it.',shadow:'Shadow this',shared:'The same media and segments can move into Shadowing when Speaking is available.',playback:'Playback is unavailable for this source.'},
  vi:{listen:'NGHE · THEO DÕI',title:'NGHE TỪNG Ý, THEO TỪNG KHOẢNH KHẮC.',lead:'Đưa video bên ngoài vào một bài học media dùng chung. Xem, theo dõi lời gốc, đọc nghĩa khi có và nghe lại từng câu.',url:'URL video',placeholder:'https://…',prepare:'Nhập / Chuẩn bị bài học',validating:'Đang kiểm tra URL…',processing:'Đang chuẩn bị transcript…',original:'Transcript gốc',meaning:'Nghĩa',unavailable:'Bản dịch nghĩa chưa có.',notRequired:'Không cần bản dịch cho ngôn ngữ hỗ trợ đã chọn.',translationUnavailable:'Hiện chưa thể tạo phần nghĩa. Bạn vẫn có thể tiếp tục với transcript gốc.',translationTooLarge:'Bài học này quá lớn để tự động tạo phần nghĩa. Bạn vẫn có thể tiếp tục với transcript gốc.',transcriptMissing:'Video này không có transcript phù hợp.',unsupported:'Nguồn video này chưa được hỗ trợ.',malformedUrl:'Hãy nhập URL media công khai hợp lệ.',unsupportedProvider:'Nhà cung cấp media này chưa được hỗ trợ.',mediaUnavailable:'Media này đang riêng tư hoặc không khả dụng.',providerTimeout:'Nhà cung cấp media không phản hồi kịp thời. Vui lòng thử lại.',providerFailure:'Nhà cung cấp media không thể chuẩn bị bài học này. Vui lòng thử lại.',unsupportedSourceLanguage:'Ngôn ngữ của media này chưa được hỗ trợ.',invalidTargetLanguage:'Hãy chọn ngôn ngữ hỗ trợ hợp lệ.',failed:'Không thể chuẩn bị bài học.',previous:'Đoạn trước',next:'Đoạn sau',replay:'Nghe lại',speed:'Tốc độ',select:'Chọn một đoạn transcript để nghe lại.',shadow:'Shadow câu này',shared:'Cùng media và segment này có thể chuyển sang Shadowing khi Speaking sẵn sàng.',playback:'Không thể phát nguồn này.'},
  zh:{listen:'听力 · 跟随',title:'逐句听见意思。',lead:'把外部视频导入一个共享媒体课程。观看视频、跟随原文、在可用时阅读释义，并重听每个句子。',url:'视频网址',placeholder:'https://…',prepare:'导入 / 准备课程',validating:'正在检查网址…',processing:'正在准备字幕…',original:'原文字幕',meaning:'释义',unavailable:'释义暂时不可用。',notRequired:'所选辅助语言不需要翻译。',translationUnavailable:'目前无法生成释义。你仍可继续使用原文字幕。',translationTooLarge:'本课内容过大，当前无法自动生成释义。你仍可继续使用原文字幕。',transcriptMissing:'这个视频没有可用字幕。',unsupported:'暂不支持这个视频来源。',malformedUrl:'请输入有效的公开视频网址。',unsupportedProvider:'暂不支持这个媒体提供方。',mediaUnavailable:'该媒体为私密内容或暂不可用。',providerTimeout:'媒体提供方响应超时，请重试。',providerFailure:'媒体提供方无法准备本课，请重试。',unsupportedSourceLanguage:'暂不支持该媒体语言。',invalidTargetLanguage:'请选择有效的辅助语言。',failed:'无法准备课程。',previous:'上一句',next:'下一句',replay:'重听',speed:'速度',select:'选择一段字幕后重听。',shadow:'跟读这句',shared:'Speaking 可用后，同一媒体和句段可直接进入跟读。',playback:'这个来源暂时无法播放。'},
};
const ACTIVE_COPY={
  en:{follow:'Follow',active:'Active',mode:'Listening mode',activeUnavailable:'Active Listening needs usable provider playback.',practice:'Active Listening',prompt:'Type what you heard',check:'Check answer',reveal:'Reveal answer',retry:'Retry',yourAnswer:'Your answer',textMatch:'Text match',exact:'Exact match',close:'Close match',tryAgain:'Try again',disclaimer:'Text match compares your reconstruction with this transcript. It is not a proficiency score.',progress:'Session practice',practiced:'Practiced',exactCount:'Exact',average:'Average best text match',attempts:'Checked attempts',revealed:'Revealed only',segment:'Segment',answerEmpty:'Type what you heard before checking.',answerTooLarge:'Your reconstruction is too long to check safely.',segmentTooLarge:'This transcript segment is too large to check safely. Follow mode remains available.',meaningUnavailable:'Meaning is currently unavailable. The original transcript remains usable.',meaningTooLarge:'Meaning is unavailable because this lesson is too large for automatic translation.',meaningNotRequired:'Translation is not required for the selected support language.'},
  vi:{follow:'Theo dõi',active:'Chủ động',mode:'Chế độ nghe',activeUnavailable:'Luyện nghe chủ động cần nguồn phát từ nhà cung cấp khả dụng.',practice:'Luyện nghe chủ động',prompt:'Gõ lại điều bạn nghe được',check:'Kiểm tra',reveal:'Xem đáp án',retry:'Thử lại',yourAnswer:'Câu trả lời của bạn',textMatch:'Độ khớp văn bản',exact:'Khớp chính xác',close:'Gần khớp',tryAgain:'Hãy thử lại',disclaimer:'Độ khớp văn bản so sánh phần bạn nghe được với transcript này. Đây không phải điểm năng lực.',progress:'Luyện tập trong phiên',practiced:'Đã luyện',exactCount:'Chính xác',average:'Độ khớp tốt nhất trung bình',attempts:'Lượt đã kiểm tra',revealed:'Chỉ xem đáp án',segment:'Đoạn',answerEmpty:'Hãy gõ lại điều bạn nghe được trước khi kiểm tra.',answerTooLarge:'Câu trả lời quá dài để kiểm tra an toàn.',segmentTooLarge:'Đoạn transcript này quá dài để kiểm tra an toàn. Chế độ Theo dõi vẫn khả dụng.',meaningUnavailable:'Hiện chưa có phần nghĩa. Transcript gốc vẫn khả dụng.',meaningTooLarge:'Không có phần nghĩa vì bài học quá lớn để dịch tự động.',meaningNotRequired:'Không cần bản dịch cho ngôn ngữ hỗ trợ đã chọn.'},
  zh:{follow:'跟随',active:'主动练习',mode:'听力模式',activeUnavailable:'主动听力练习需要可用的提供方播放。',practice:'主动听力',prompt:'输入你听到的内容',check:'检查答案',reveal:'显示答案',retry:'重试',yourAnswer:'你的答案',textMatch:'文本匹配度',exact:'完全匹配',close:'接近匹配',tryAgain:'再试一次',disclaimer:'文本匹配只比较你的重构与本段字幕，并不是语言能力分数。',progress:'本次练习',practiced:'已练习',exactCount:'完全匹配',average:'最佳文本匹配平均值',attempts:'已检查次数',revealed:'仅查看答案',segment:'句段',answerEmpty:'请先输入你听到的内容。',answerTooLarge:'你的答案过长，无法安全检查。',segmentTooLarge:'本段字幕过长，无法安全检查。跟随模式仍可使用。',meaningUnavailable:'释义目前不可用，原文字幕仍可使用。',meaningTooLarge:'本课内容过大，无法自动生成释义。',meaningNotRequired:'所选辅助语言不需要翻译。'},
};
let listeningViewSequence=0;

const text=()=>COPY[uiLocale()]||COPY.en;
const activeText=()=>ACTIVE_COPY[uiLocale()]||ACTIVE_COPY.en;
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

function segmentNavigation(segments,selected,playbackRate){
  const c=text();
  const selectedIndex=segments.findIndex(segment=>segment.segment_id===selected);
  return `<div class="listening-practice-controls" aria-label="${esc(c.select)}">
    <button type="button" class="button button-secondary" data-previous-segment ${selectedIndex<=0?'disabled':''}>${esc(c.previous)}</button>
    <button type="button" class="button button-primary" data-replay-current>${esc(c.replay)}</button>
    <button type="button" class="button button-secondary" data-next-segment ${selectedIndex<0||selectedIndex>=segments.length-1?'disabled':''}>${esc(c.next)}</button>
    <label>${esc(c.speed)} <select id="listeningPlaybackRate">${[.75,1,1.25].map(rate=>`<option value="${rate}" ${rate===playbackRate?'selected':''}>${rate.toFixed(2).replace(/0$/,'')}x</option>`).join('')}</select></label>
  </div>`;
}

function followWorkspace(payload,selected,{original,meaning,playbackRate}){
  const c=text();
  const segments=payload.transcript?.segments||[];
  const translations=new Map((payload.translations||[]).map(item=>[item.segment_id,item.translated_meaning]));
  const translationStatus=payload.translation?.status;
  const translationNotRequired=translationStatus==='not_required';
  const translationDegraded=translationStatus==='unavailable'||translationStatus==='too_large';
  const translationStatusMessage=translationStatus==='unavailable'?c.translationUnavailable:translationStatus==='too_large'?c.translationTooLarge:null;
  return `<section class="listening-transcript visual-section-surface" aria-label="${esc(c.original)}">
    <div class="listening-toolbar">
      <div><strong>${esc(c.original)}</strong><small>${esc(c.select)}</small></div>
      <label><input id="toggleOriginal" type="checkbox" ${original?'checked':''}> ${esc(c.original)}</label>
      <label><input id="toggleMeaning" type="checkbox" ${meaning?'checked':''} ${translationNotRequired||translationDegraded?'disabled':''}> ${esc(c.meaning)}</label>
    </div>
    ${translationNotRequired?`<p class="translation-not-required" role="status">${esc(c.notRequired)}</p>`:''}
    ${translationStatusMessage?`<p class="translation-status translation-status-${esc(translationStatus)}" role="status">${esc(translationStatusMessage)}</p>`:''}
    ${segmentNavigation(segments,selected,playbackRate)}
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
  </section>`;
}

function activeMeaning(payload,translations,segmentId){
  const c=activeText();
  const status=payload.translation?.status;
  if(status==='ready'&&translations.has(segmentId))return `<p class="active-listening-meaning"><strong>${esc(text().meaning)}</strong> ${esc(translations.get(segmentId))}</p>`;
  if(status==='not_required')return `<p class="active-listening-meaning translation-not-required">${esc(c.meaningNotRequired)}</p>`;
  if(status==='unavailable')return `<p class="active-listening-meaning translation-status-unavailable">${esc(c.meaningUnavailable)}</p>`;
  if(status==='too_large')return `<p class="active-listening-meaning translation-status-too_large">${esc(c.meaningTooLarge)}</p>`;
  return '';
}

function activeWorkspace(payload,selected,model){
  const c=activeText();
  const segments=payload.transcript?.segments||[];
  const segment=segments.find(item=>item.segment_id===selected);
  const state=model.practiceSession?.segments?.[selected];
  const translations=new Map((payload.translations||[]).map(item=>[item.segment_id,item.translated_meaning]));
  const visible=state?.presentation==='checked'||state?.presentation==='revealed';
  const lastAttempt=state?.presentation==='checked'?state.attempts.at(-1)||null:null;
  const result=lastAttempt?.result;
  const summary=listeningPracticeSummary(model.practiceSession);
  const evaluable=segment&&listeningUnits(segment.original_text,payload.asset?.source_language).length<=MAX_LISTENING_EVALUATION_UNITS;
  const validation=model.practiceValidation==='answer_empty'?c.answerEmpty:model.practiceValidation==='answer_too_large'?c.answerTooLarge:model.practiceValidation==='evaluation_too_large'?c.segmentTooLarge:'';
  const quality=result?.exact?c.exact:result?.accuracy_percent>=80?c.close:c.tryAgain;
  return `<section class="listening-transcript listening-active visual-section-surface" aria-label="${esc(c.practice)}">
    <div class="listening-toolbar"><div><strong>${esc(c.practice)}</strong><small>${esc(c.disclaimer)}</small></div></div>
    ${segmentNavigation(segments,selected,model.playbackRate)}
    <div class="listening-segments listening-active-segments">
      ${segments.map((item,index)=>`<article class="listening-segment ${item.segment_id===selected?'selected':''}" data-segment-id="${esc(item.segment_id)}" ${item.segment_id===selected?'aria-current="true"':''}>
        <button class="listening-segment-main" type="button" data-select-segment="${esc(item.segment_id)}"><time>${stamp(item.start_ms)}</time><span>${esc(c.segment)} ${index+1}</span></button>
      </article>`).join('')}
    </div>
    ${evaluable?`<form id="activeListeningForm" class="active-listening-form">
      <label for="activeListeningAnswer">${esc(c.prompt)}</label>
      <textarea id="activeListeningAnswer" maxlength="${MAX_LISTENING_RECONSTRUCTION_CHARS}" rows="3">${esc(state?.draft||'')}</textarea>
      ${validation?`<p class="active-listening-validation" role="status">${esc(validation)}</p>`:''}
      <div class="active-listening-actions">
        <button class="button button-primary" type="submit">${esc(c.check)}</button>
        <button class="button button-secondary" type="button" data-reveal-answer>${esc(c.reveal)}</button>
        ${visible?`<button class="button button-secondary" type="button" data-retry-active>${esc(c.retry)}</button>`:''}
      </div>
    </form>`:`<p class="active-listening-unavailable" role="status">${esc(c.segmentTooLarge)}</p>`}
    ${visible?`<div class="active-listening-result" role="status">
      ${lastAttempt?`<p><strong>${esc(c.yourAnswer)}</strong> ${esc(lastAttempt.answer)}</p><p class="active-listening-text-match"><strong>${esc(c.textMatch)}</strong> ${result.accuracy_percent}% · ${esc(quality)}</p>`:''}
      <p><strong>${esc(text().original)}</strong> ${esc(segment.original_text)}</p>
      ${activeMeaning(payload,translations,selected)}
      <p class="active-listening-disclaimer">${esc(c.disclaimer)}</p>
    </div>`:''}
    <div class="active-listening-summary" role="status"><strong>${esc(c.progress)}</strong>
      <span>${esc(c.practiced)} ${summary.practiced_segments} / ${summary.total_segments}</span>
      <span>${esc(c.attempts)} ${summary.checked_attempts}</span>
      <span>${esc(c.exactCount)} ${summary.exact_match_segments}</span>
      <span>${esc(c.revealed)} ${summary.revealed_only_segments}</span>
      <span>${esc(c.average)} ${summary.average_best_text_match===null?'—':`${summary.average_best_text_match}%`}</span>
    </div>
  </section>`;
}

function workspace(payload,selectedId=null,model={}){
  const c=text();
  const a=activeText();
  const segments=payload.transcript?.segments||[];
  const selected=selectedId||segments[0]?.segment_id;
  const activeAvailable=segments.length>0&&playbackAvailable(payload.playback);
  const mode=model.mode==='active'&&activeAvailable?'active':'follow';
  return `<div class="listening-workspace" data-listening-mode="${mode}">
    <section class="listening-video visual-hero-surface">
      <div class="listening-video-frame">${mediaPlayer(payload.playback,payload.asset?.title).replace('Playback is unavailable for this source.',c.playback)}</div>
      <div class="listening-media-caption"><span>${esc(payload.asset?.source_provider||'media')}</span><h2>${esc(payload.asset?.title||'Media lesson')}</h2></div>
    </section>
    <div class="listening-learning-column">
      <div class="listening-mode-switch" role="group" aria-label="${esc(a.mode)}">
        <button type="button" class="button ${mode==='follow'?'button-primary':'button-secondary'}" data-listening-mode="follow" aria-pressed="${mode==='follow'}">${esc(a.follow)}</button>
        <button type="button" class="button ${mode==='active'?'button-primary':'button-secondary'}" data-listening-mode="active" aria-pressed="${mode==='active'}" ${activeAvailable?'':'disabled'}>${esc(a.active)}</button>
      </div>
      ${activeAvailable?'':`<p class="active-listening-playback-unavailable" role="status">${esc(a.activeUnavailable)}</p>`}
      ${mode==='active'?activeWorkspace(payload,selected,model):followWorkspace(payload,selected,model)}
    </div>
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
  const model={status:'empty',payload:null,error:null,selected:null,original:true,meaning:true,playbackRate:1,mode:'follow',practiceSession:null,practiceValidation:null};
  const viewId=`listening-${++listeningViewSequence}`;
  let importGeneration=0;
  const changed=()=>onChange({...model});
  const selectedSegment=()=>model.payload?.transcript?.segments?.find(segment=>segment.segment_id===model.selected);
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
        model.practiceSession=model.status==='ready'?createListeningPracticeSession({
          asset_id:model.payload.asset.asset_id,
          segment_ids:model.payload.transcript.segments.map(segment=>segment.segment_id),
        }):null;
        model.practiceValidation=null;
        if(model.mode==='active'&&!playbackAvailable(model.payload?.playback))model.mode='follow';
      }catch(error){
        if(generation!==importGeneration)return;
        model.error=error;
        model.status=mediaImportErrorState(error);
      }
      changed();
    },
    select(segmentId){
      if(!model.payload?.transcript?.segments?.some(segment=>segment.segment_id===segmentId))return false;
      model.selected=segmentId;
      if(model.practiceSession)selectListeningPracticeSegment(model.practiceSession,segmentId);
      model.practiceValidation=null;changed();return true;
    },
    moveSelection(offset){
      const segments=model.payload?.transcript?.segments||[];
      const index=segments.findIndex(segment=>segment.segment_id===model.selected);
      const target=segments[index+offset];
      if(!target)return false;
      model.selected=target.segment_id;
      if(model.practiceSession)selectListeningPracticeSegment(model.practiceSession,target.segment_id);
      model.practiceValidation=null;changed();return true;
    },
    setMode(value){
      if(!['follow','active'].includes(value))return false;
      if(value==='active'&&(!model.practiceSession||!playbackAvailable(model.payload?.playback)))return false;
      model.mode=value;model.practiceValidation=null;changed();return true;
    },
    setPracticeDraft(value){
      if(!model.practiceSession)return false;
      const accepted=setListeningPracticeDraft(model.practiceSession,value);
      model.practiceValidation=accepted?null:'answer_too_large';
      return accepted;
    },
    checkPractice(){
      if(!model.practiceSession)return false;
      if(model.practiceValidation==='answer_too_large'){changed();return false;}
      const segment=selectedSegment();
      if(!segment)return false;
      try{
        const state=model.practiceSession.segments[model.selected];
        const result=evaluateListeningReconstruction({source_language:model.payload.asset.source_language,expected:segment.original_text,answer:state.draft});
        recordListeningPracticeAttempt(model.practiceSession,result);
        model.practiceValidation=null;changed();return true;
      }catch(error){
        model.practiceValidation=error?.code||'evaluation_unavailable';changed();return false;
      }
    },
    revealPractice(){
      if(!model.practiceSession)return false;
      revealListeningPracticeAnswer(model.practiceSession);
      model.practiceValidation=null;changed();return true;
    },
    retryPractice(){
      if(!model.practiceSession)return false;
      retryListeningPracticeSegment(model.practiceSession);
      model.practiceValidation=null;changed();return true;
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
    root.querySelectorAll('button[data-listening-mode]').forEach(button=>button.addEventListener('click',()=>controller.setMode(button.dataset.listeningMode)));
    root.querySelector('#activeListeningAnswer')?.addEventListener('input',event=>controller.setPracticeDraft(event.target.value));
    root.querySelector('#activeListeningForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      controller.setPracticeDraft(root.querySelector('#activeListeningAnswer').value);
      controller.checkPractice();
    });
    root.querySelector('[data-reveal-answer]')?.addEventListener('click',()=>controller.revealPractice());
    root.querySelector('[data-retry-active]')?.addEventListener('click',()=>controller.retryPractice());
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
