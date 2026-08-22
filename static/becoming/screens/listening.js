import {api} from '../api.js';
import {go} from '../router.js';
import {state,supportLanguage} from '../store.js';
import {esc} from '../components/primitives.js';
import {connectMediaPlayer,disconnectMediaPlayer,mediaPlayer,playbackAvailable,replaySegment,togglePlayback,setPlaybackRate as setMediaPlaybackRate} from '../components/media-player.js';
import {uiLocale} from '../domain/i18n.js';
import {transcriptTokens} from '../domain/transcript-tokens.js';
import {buildTranscriptDisplayUnits,displayUnitContains,displayUnitMeaning} from '../domain/transcript-display-units.js';
import {activeCanonicalSegment} from '../domain/transcript-playback.js';
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
import {
  createShadowingPracticeSession,
  recordShadowingPracticeRound,
  selectShadowingPracticeSegment,
  shadowingPracticeSummary,
} from '../domain/shadowing-practice.js';
import {getSharedMediaSession,selectSharedMediaSegment,setSharedMediaSession} from '../domain/shared-media-session.js';
import {clearPendingMediaImport,getPendingMediaImport,setPendingMediaImport} from '../domain/media-import-resume.js';

const COPY={
  en:{listen:'LISTEN · FOLLOW',title:'HEAR THE IDEA, ONE MOMENT AT A TIME.',lead:'Bring an external video into one shared media lesson. Watch, follow the original words, read the meaning when available, and replay a sentence.',url:'Video URL',placeholder:'https://…',prepare:'Import / Prepare lesson',retryTranslation:'Retry preparation',validating:'Checking the URL…',processing:'Preparing lesson…',translationFailed:'Meaning could not be prepared. Retry preparation to start this lesson.',original:'Original transcript',meaning:'Meaning',unavailable:'Meaning is not available yet.',notRequired:'Translation is not required for the selected support language.',translationUnavailable:'Meaning could not be generated right now. Continue with the original transcript.',translationTooLarge:'This lesson is too large for automatic meaning generation. Continue with the original transcript.',generatedTranscript:'This transcript was generated automatically and may contain mistakes.',transcriptMissing:'This video has no usable transcript.',unsupported:'This video source is not supported.',malformedUrl:'Enter a valid public media URL.',unsupportedProvider:'This media provider is not supported yet.',mediaUnavailable:'This media is private or unavailable.',providerTimeout:'The media provider did not respond in time. Please try again.',providerFailure:'The media provider could not prepare this lesson. Please try again.',unsupportedSourceLanguage:'This media language is not supported yet.',invalidTargetLanguage:'Choose a valid support language.',failed:'The lesson could not be prepared.',previous:'Previous segment',next:'Next segment',replay:'Replay',speed:'Speed',select:'Select a transcript segment to replay it.',shadow:'Shadow this',shared:'Shadowing reuses this same media and segment. No separate import is needed.',playback:'Playback is unavailable for this source.'},
  vi:{listen:'NGHE · THEO DÕI',title:'NGHE TỪNG Ý, THEO TỪNG KHOẢNH KHẮC.',lead:'Đưa video bên ngoài vào một bài học media dùng chung. Xem, theo dõi lời gốc, đọc nghĩa khi có và nghe lại từng câu.',url:'URL video',placeholder:'https://…',prepare:'Nhập / Chuẩn bị bài học',retryTranslation:'Thử chuẩn bị lại',validating:'Đang kiểm tra URL…',processing:'Đang chuẩn bị bài học…',translationFailed:'Chưa thể chuẩn bị phần nghĩa. Hãy thử lại để bắt đầu bài học.',original:'Transcript gốc',meaning:'Nghĩa',unavailable:'Bản dịch nghĩa chưa có.',notRequired:'Không cần bản dịch cho ngôn ngữ hỗ trợ đã chọn.',translationUnavailable:'Hiện chưa thể tạo phần nghĩa. Bạn vẫn có thể tiếp tục với transcript gốc.',translationTooLarge:'Bài học này quá lớn để tự động tạo phần nghĩa. Bạn vẫn có thể tiếp tục với transcript gốc.',generatedTranscript:'Transcript này được tạo tự động và có thể có sai sót.',transcriptMissing:'Video này không có transcript phù hợp.',unsupported:'Nguồn video này chưa được hỗ trợ.',malformedUrl:'Hãy nhập URL media công khai hợp lệ.',unsupportedProvider:'Nhà cung cấp media này chưa được hỗ trợ.',mediaUnavailable:'Media này đang riêng tư hoặc không khả dụng.',providerTimeout:'Nhà cung cấp media không phản hồi kịp thời. Vui lòng thử lại.',providerFailure:'Nhà cung cấp media không thể chuẩn bị bài học này. Vui lòng thử lại.',unsupportedSourceLanguage:'Ngôn ngữ của media này chưa được hỗ trợ.',invalidTargetLanguage:'Hãy chọn ngôn ngữ hỗ trợ hợp lệ.',failed:'Không thể chuẩn bị bài học.',previous:'Đoạn trước',next:'Đoạn sau',replay:'Nghe lại',speed:'Tốc độ',select:'Chọn một đoạn transcript để nghe lại.',shadow:'Shadow câu này',shared:'Shadowing dùng lại chính media và đoạn này, không cần nhập lại video.',playback:'Không thể phát nguồn này.'},
  zh:{listen:'听力 · 跟随',title:'逐句听见意思。',lead:'把外部视频导入一个共享媒体课程。观看视频、跟随原文、在可用时阅读释义，并重听每个句子。',url:'视频网址',placeholder:'https://…',prepare:'导入 / 准备课程',retryTranslation:'重试准备',validating:'正在检查网址…',processing:'正在准备课程…',translationFailed:'暂时无法准备释义。请重试准备后开始课程。',original:'原文字幕',meaning:'释义',unavailable:'释义暂时不可用。',notRequired:'所选辅助语言不需要翻译。',translationUnavailable:'目前无法生成释义。你仍可继续使用原文字幕。',translationTooLarge:'本课内容过大，当前无法自动生成释义。你仍可继续使用原文字幕。',generatedTranscript:'此字幕由系统自动生成，可能有误。',transcriptMissing:'这个视频没有可用字幕。',unsupported:'暂不支持这个视频来源。',malformedUrl:'请输入有效的公开视频网址。',unsupportedProvider:'暂不支持这个媒体提供方。',mediaUnavailable:'该媒体为私密内容或暂不可用。',providerTimeout:'媒体提供方响应超时，请重试。',providerFailure:'媒体提供方无法准备本课，请重试。',unsupportedSourceLanguage:'暂不支持这个媒体语言。',invalidTargetLanguage:'请选择有效的辅助语言。',failed:'无法准备课程。',previous:'上一句',next:'下一句',replay:'重听',speed:'速度',select:'选择一段字幕后重听。',shadow:'跟读这句',shared:'跟读直接复用同一媒体和句段，不需要再次导入视频。',playback:'这个来源暂时无法播放。'},
};
const ACTIVE_COPY={
  en:{follow:'Follow',active:'Active',mode:'Listening mode',activeUnavailable:'Active Listening and Shadowing need usable provider playback.',practice:'Active Listening',prompt:'Type what you heard',check:'Check answer',reveal:'Reveal answer',retry:'Retry',yourAnswer:'Your answer',textMatch:'Text match',exact:'Exact match',close:'Close match',tryAgain:'Try again',disclaimer:'Text match compares your reconstruction with this transcript. It is not a proficiency score.',progress:'Session practice',practiced:'Practiced',exactCount:'Exact',average:'Average best text match',attempts:'Checked attempts',revealed:'Revealed only',segment:'Segment',answerEmpty:'Type what you heard before checking.',answerTooLarge:'Your reconstruction is too long to check safely.',segmentTooLarge:'This transcript segment is too large to check safely. Follow mode remains available.',meaningUnavailable:'Meaning is currently unavailable. The original transcript remains usable.',meaningTooLarge:'Meaning is unavailable because this lesson is too large for automatic translation.',meaningNotRequired:'Translation is not required for the selected support language.'},
  vi:{follow:'Theo dõi',active:'Chủ động',mode:'Chế độ nghe',activeUnavailable:'Luyện nghe chủ động và Shadowing cần nguồn phát khả dụng.',practice:'Luyện nghe chủ động',prompt:'Gõ lại điều bạn nghe được',check:'Kiểm tra',reveal:'Xem đáp án',retry:'Thử lại',yourAnswer:'Câu trả lời của bạn',textMatch:'Độ khớp văn bản',exact:'Khớp chính xác',close:'Gần khớp',tryAgain:'Hãy thử lại',disclaimer:'Độ khớp văn bản so sánh phần bạn nghe được với transcript này. Đây không phải điểm năng lực.',progress:'Luyện tập trong phiên',practiced:'Đã luyện',exactCount:'Chính xác',average:'Độ khớp tốt nhất trung bình',attempts:'Lượt đã kiểm tra',revealed:'Chỉ xem đáp án',segment:'Đoạn',answerEmpty:'Hãy gõ lại điều bạn nghe được trước khi kiểm tra.',answerTooLarge:'Câu trả lời quá dài để kiểm tra an toàn.',segmentTooLarge:'Đoạn transcript này quá dài để kiểm tra an toàn. Chế độ Theo dõi vẫn khả dụng.',meaningUnavailable:'Hiện chưa có phần nghĩa. Transcript gốc vẫn khả dụng.',meaningTooLarge:'Không có phần nghĩa vì bài học quá lớn để dịch tự động.',meaningNotRequired:'Không cần bản dịch cho ngôn ngữ hỗ trợ đã chọn.'},
  zh:{follow:'跟随',active:'主动练习',mode:'听力模式',activeUnavailable:'主动听力和跟读练习需要可用的媒体播放。',practice:'主动听力',prompt:'输入你听到的内容',check:'检查答案',reveal:'显示答案',retry:'重试',yourAnswer:'你的答案',textMatch:'文本匹配度',exact:'完全匹配',close:'接近匹配',tryAgain:'再试一次',disclaimer:'文本匹配只比较你的重构与本段字幕，并不是语言能力分数。',progress:'本次练习',practiced:'已练习',exactCount:'完全匹配',average:'最佳文本匹配平均值',attempts:'已检查次数',revealed:'仅查看答案',segment:'句段',answerEmpty:'请先输入你听到的内容。',answerTooLarge:'你的答案过长，无法安全检查。',segmentTooLarge:'本段字幕过长，无法安全检查。跟随模式仍可使用。',meaningUnavailable:'释义目前不可用，原文字幕仍可使用。',meaningTooLarge:'本课内容过大，无法自动生成释义。',meaningNotRequired:'所选辅助语言不需要翻译。'},
};
const SHADOW_COPY={
  en:{mode:'Shadowing',practice:'Shadow this segment',guide:'Listen to the selected segment, repeat it aloud, then mark one completed round.',markRound:'Mark round complete',rounds:'Rounds',progress:'Session shadowing',practiced:'Practiced segments',totalRounds:'Completed rounds',noScore:'Self-guided repetition here does not record or score pronunciation. Open Speaking Core when you want to record and replay your voice.',openSpeaking:'Open Speaking Core',segment:'Segment'},
  vi:{mode:'Shadowing',practice:'Shadow đoạn này',guide:'Nghe đoạn đã chọn, lặp lại thành tiếng rồi đánh dấu một lượt đã hoàn thành.',markRound:'Đánh dấu hoàn thành 1 lượt',rounds:'Số lượt',progress:'Shadowing trong phiên',practiced:'Đoạn đã luyện',totalRounds:'Tổng lượt hoàn thành',noScore:'Phần Shadowing này không ghi âm hay chấm phát âm. Mở Speaking Core khi bạn muốn ghi và nghe lại giọng của mình.',openSpeaking:'Mở Speaking Core',segment:'Đoạn'},
  zh:{mode:'跟读',practice:'跟读这一句',guide:'先听所选句段，再大声跟读，然后记录一次已完成练习。',markRound:'记录完成一轮',rounds:'轮次',progress:'本次跟读',practiced:'已练句段',totalRounds:'已完成轮次',noScore:'这里的跟读模式不录音，也不生成发音评分。需要录制并回放自己的声音时，请打开 Speaking Core。',openSpeaking:'打开 Speaking Core',segment:'句段'},
};
let listeningViewSequence=0;

const text=()=>COPY[uiLocale()]||COPY.en;
const activeText=()=>ACTIVE_COPY[uiLocale()]||ACTIVE_COPY.en;
const shadowText=()=>SHADOW_COPY[uiLocale()]||SHADOW_COPY.en;
const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const transcriptTokenMarkup=value=>transcriptTokens(value).map(token=>token.word
  ?`<span class="transcript-token" data-it-term="${esc(token.text)}" tabindex="0" role="button">${esc(token.text)}</span>`
  :esc(token.text)).join('');

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
  const labels={validating:c.validating,processing:c.processing,'translation-failed':c.translationFailed,unsupported:categoryMessage||c.unsupported,'transcript-unavailable':c.transcriptMissing,error:categoryMessage||(category?c.failed:unknownMessage)};
  const categoryClass=categoryMessage?` listening-state-${category}`:'';
  return labels[kind]?`<div class="listening-state listening-state-${kind}${categoryClass}" role="status">${esc(labels[kind])}</div>`:'';
}

function segmentNavigation(segments,selected,playbackRate){
  const c=text();
  const locale=uiLocale();
  const playPauseLabel=locale==='vi'?'Phát / Dừng':locale==='zh'?'播放 / 暂停':'Play / Pause';
  const currentLabel=locale==='vi'?'Đang nghe':locale==='zh'?'当前字幕':'Current';
  const selectedIndex=segments.findIndex(segment=>segment.segment_id===selected);
  return `<div class="listening-practice-controls" aria-label="${esc(c.select)}">
    <button type="button" class="button button-secondary listening-icon-button" data-toggle-playback aria-label="${esc(playPauseLabel)}" title="${esc(playPauseLabel)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/><path d="M5 5h2v14H5z"/></svg></button>
    <button type="button" class="button button-secondary listening-icon-button" data-follow-playing aria-label="${esc(currentLabel)}" title="${esc(currentLabel)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg></button>
    <button type="button" class="button button-secondary listening-icon-button" data-previous-segment ${selectedIndex<=0?'disabled':''} aria-label="${esc(c.previous)}" title="${esc(c.previous)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-9 6 9 6z"/></svg></button>
    <button type="button" class="button button-primary listening-icon-button" data-replay-current aria-label="${esc(c.replay)}" title="${esc(c.replay)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6"/><path d="M5.5 9A8 8 0 1 1 4 14"/></svg></button>
    <button type="button" class="button button-secondary listening-icon-button" data-next-segment ${selectedIndex<0||selectedIndex>=segments.length-1?'disabled':''} aria-label="${esc(c.next)}" title="${esc(c.next)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l9 6-9 6z"/></svg></button>
    <label class="listening-speed-control" aria-label="${esc(c.speed)}" title="${esc(c.speed)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L5 14h6l-1 8 9-13h-6z"/></svg><select id="listeningPlaybackRate">${[.75,1,1.25].map(rate=>`<option value="${rate}" ${rate===playbackRate?'selected':''}>${rate.toFixed(2).replace(/0$/,'')}x</option>`).join('')}</select></label>
  </div>`;
}

function followWorkspace(payload,selected,{original,meaning,playbackRate,manualSelection}){
  const c=text();
  const canonical=payload.transcript?.segments||[];
  const segments=buildTranscriptDisplayUnits(canonical);
  const selectedUnit=segments.find(unit=>displayUnitContains(unit,selected));
  const selectedDisplayId=selectedUnit?.segment_id||segments[0]?.segment_id||null;
  const translations=new Map((payload.translations||[]).map(item=>[item.segment_id,item.translated_meaning]));
  const displayMeaning=segment=>displayUnitMeaning(segment,translations);
  const translationStatus=payload.translation?.status;
  const translationNotRequired=translationStatus==='not_required';
  const translationPreparing=!translationStatus;
  const translationDegraded=translationStatus==='unavailable'||translationStatus==='too_large';
  const translationStatusMessage=translationPreparing?c.unavailable:translationStatus==='unavailable'?c.translationUnavailable:translationStatus==='too_large'?c.translationTooLarge:null;
  return `<section class="listening-transcript visual-section-surface" aria-label="${esc(c.original)}">
    <div class="listening-toolbar">
      <div><strong>${esc(c.original)}</strong><small>${esc(c.select)}</small></div>
      <label><input id="toggleOriginal" type="checkbox" ${original?'checked':''}> ${esc(c.original)}</label>
      <label><input id="toggleMeaning" type="checkbox" ${meaning?'checked':''} ${translationPreparing||translationNotRequired||translationDegraded?'disabled':''}> ${esc(c.meaning)}</label>
    </div>
    ${translationNotRequired?`<p class="translation-not-required" role="status">${esc(c.notRequired)}</p>`:''}
    ${translationStatusMessage?`<p class="translation-status translation-status-${esc(translationStatus||'preparing')}" role="status">${esc(translationStatusMessage)}</p>`:''}
    ${segmentNavigation(segments,selectedDisplayId,playbackRate)}
    <div class="listening-segments">
      ${segments.map(segment=>`<article class="listening-segment ${manualSelection&&segment.segment_id===selectedDisplayId?'selected':''}" data-segment-id="${esc(segment.segment_id)}" data-canonical-segment-ids="${esc(segment.canonical_segment_ids.join(' '))}" ${segment.segment_id===selectedDisplayId?'aria-current="true"':''}>
        <button class="listening-segment-main" type="button" data-select-segment="${esc(segment.segment_id)}">
          <time>${stamp(segment.start_ms)}</time>
          <span class="listening-segment-copy">
            ${original?`<strong class="listening-token-line" aria-label="${esc(segment.original_text)}">${transcriptTokenMarkup(segment.original_text)}</strong>`:''}
            ${meaning&&!translationNotRequired&&!translationDegraded&&displayMeaning(segment)?`<span class="listening-meaning-inline">${esc(displayMeaning(segment))}</span>`:''}
          </span>
        </button>
        ${displayUnitContains(segment,selected)?`<div class="listening-segment-actions">
          <button type="button" class="button button-secondary" data-shadow-selected title="${esc(c.shared)}">${esc(c.shadow)}</button>
          <button type="button" class="button button-primary" data-open-speaking title="${esc(c.shared)}">${esc(shadowText().openSpeaking)}</button>
        </div>`:''}
      </article>`).join('')}
    </div>
    <p class="listening-shared-note">${esc(c.shared)}</p>
  </section>`;
}

function activeMeaning(payload,translations,segmentId){
  const c=activeText();
  const status=payload.translation?.status;
  if(status==='ready'&&translations.has(segmentId))return `<p class="active-listening-meaning">${esc(translations.get(segmentId))}</p>`;
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
      <p class="active-listening-source" aria-label="${esc(segment.original_text)}"><strong>${esc(text().original)}</strong> <span>${transcriptTokenMarkup(segment.original_text)}</span></p>
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

function shadowingWorkspace(payload,selected,model){
  const c=shadowText();
  const segments=payload.transcript?.segments||[];
  const segment=segments.find(item=>item.segment_id===selected);
  const segmentIndex=segments.findIndex(item=>item.segment_id===selected);
  const translations=new Map((payload.translations||[]).map(item=>[item.segment_id,item.translated_meaning]));
  const state=model.shadowingSession?.segments?.[selected];
  const summary=shadowingPracticeSummary(model.shadowingSession);
  return `<section class="listening-transcript listening-shadowing visual-section-surface" aria-label="${esc(c.practice)}">
    <div class="listening-toolbar">
      <div><strong>${esc(c.practice)}</strong><small>${esc(c.guide)}</small></div>
    </div>
    ${segmentNavigation(segments,selected,model.playbackRate)}
    <div class="listening-segments listening-shadowing-segments">
      ${segments.map((item,index)=>`<article class="listening-segment ${item.segment_id===selected?'selected':''}" data-segment-id="${esc(item.segment_id)}" ${item.segment_id===selected?'aria-current="true"':''}>
        <button class="listening-segment-main" type="button" data-select-segment="${esc(item.segment_id)}"><time>${stamp(item.start_ms)}</time><span>${esc(c.segment)} ${index+1}</span></button>
      </article>`).join('')}
    </div>
    ${segment?`<div class="shadowing-focus" role="group" aria-label="${esc(c.practice)}">
      <span class="context-label">${esc(c.segment)} ${segmentIndex+1}</span>
      <p class="shadowing-source" aria-label="${esc(segment.original_text)}">${transcriptTokenMarkup(segment.original_text)}</p>
      ${activeMeaning(payload,translations,selected)}
      <div class="shadowing-round-actions">
        <button class="button button-primary" type="button" data-shadow-round>${esc(c.markRound)}</button>
        <button class="button button-secondary" type="button" data-open-speaking>${esc(c.openSpeaking)}</button>
        <span class="shadowing-round-count">${esc(c.rounds)}: ${state?.rounds||0}</span>
      </div>
      <p class="shadowing-disclaimer">${esc(c.noScore)}</p>
    </div>`:''}
    <div class="active-listening-summary shadowing-summary" role="status"><strong>${esc(c.progress)}</strong>
      <span>${esc(c.practiced)} ${summary.practiced_segments} / ${summary.total_segments}</span>
      <span>${esc(c.totalRounds)} ${summary.total_rounds}</span>
    </div>
  </section>`;
}

function listeningMode(payload,model={}){
  const segments=payload.transcript?.segments||[];
  const playbackReady=segments.length>0&&playbackAvailable(payload.playback);
  const requested=['active','shadowing'].includes(model.mode)?model.mode:'follow';
  return requested!=='follow'&&playbackReady?requested:'follow';
}

function learningWorkspace(payload,selected,model,mode){
  const a=activeText();
  const s=shadowText();
  const segments=payload.transcript?.segments||[];
  const playbackReady=segments.length>0&&playbackAvailable(payload.playback);
  return `<div class="listening-mode-switch" role="group" aria-label="${esc(a.mode)}">
      <button type="button" class="button ${mode==='follow'?'button-primary':'button-secondary'}" data-listening-mode="follow" aria-pressed="${mode==='follow'}">${esc(a.follow)}</button>
      <button type="button" class="button ${mode==='active'?'button-primary':'button-secondary'}" data-listening-mode="active" aria-pressed="${mode==='active'}" ${playbackReady?'':'disabled'}>${esc(a.active)}</button>
      <button type="button" class="button ${mode==='shadowing'?'button-primary':'button-secondary'}" data-listening-mode="shadowing" aria-pressed="${mode==='shadowing'}" ${playbackReady?'':'disabled'}>${esc(s.mode)}</button>
    </div>
    ${payload.transcript_generation?.status==='generated'?`<p class="generated-transcript-notice" role="status">${esc(text().generatedTranscript)}</p>`:''}
    ${playbackReady?'':`<p class="active-listening-playback-unavailable" role="status">${esc(a.activeUnavailable)}</p>`}
    ${mode==='active'?activeWorkspace(payload,selected,model):mode==='shadowing'?shadowingWorkspace(payload,selected,model):followWorkspace(payload,selected,model)}`;
}

function workspace(payload,selectedId=null,model={}){
  const c=text();
  const segments=payload.transcript?.segments||[];
  const selected=selectedId||segments[0]?.segment_id;
  const mode=listeningMode(payload,model);
  return `<div class="listening-workspace" data-listening-mode="${mode}">
    <section class="listening-video visual-hero-surface">
      <div class="listening-video-frame">${mediaPlayer(payload.playback,payload.asset?.title).replace('Playback is unavailable for this source.',c.playback)}</div>
      <div class="listening-media-caption"><span>${esc(payload.asset?.source_provider||'media')}</span><h2>${esc(payload.asset?.title||'Media lesson')}</h2></div>
    </section>
    <div class="listening-learning-column">${learningWorkspace(payload,selected,model,mode)}</div>
  </div>`;
}

function listeningPage(model,viewId){
  const c=text();
  const busy=['validating','processing'].includes(model.status);
  return `<section class="page listening-page" data-listening-view="${viewId}">
    <header class="listening-header"><span class="editorial-kicker">${esc(c.listen)}</span><h1 class="editorial-title">${esc(c.title)}</h1><p class="editorial-lead">${esc(c.lead)}</p></header>
    <form id="mediaImportForm" class="listening-import visual-section-surface" novalidate>
      <label for="mediaSourceUrl">${esc(c.url)}</label><div><input id="mediaSourceUrl" type="url" inputmode="url" placeholder="${esc(c.placeholder)}" required><button class="button button-primary" type="submit" ${busy?'disabled':''}>${esc(c.prepare)}</button></div>
      <div id="listeningStatus" aria-live="polite">${stateMessage(model.status,model.error)}${model.payload?.translation?.status==='unavailable'?`<button class="button button-secondary" type="button" data-retry-translation>${esc(c.retryTranslation)}</button>`:''}</div>
    </form>
    <div id="listeningReady">${model.status==='ready'?workspace(model.payload,model.selected,model):''}</div>
  </section>`;
}

function translationRequest(payload,targetLanguage){
  const asset=payload?.asset||{};
  const transcript=payload?.transcript||{};
  return {
    target_language:targetLanguage,
    asset:{
      asset_id:asset.asset_id,
      source_url:asset.source_url,
      source_provider:asset.source_provider,
      source_type:asset.source_type,
      title:asset.title,
      source_language:asset.source_language,
      processing_state:asset.processing_state,
      duration_ms:asset.duration_ms,
      transcript_available:asset.transcript_available,
    },
    transcript:{
      asset_id:transcript.asset_id,
      source_language:transcript.source_language,
      segments:(transcript.segments||[]).map(segment=>({
        segment_id:segment.segment_id,
        order:segment.order,
        start_ms:segment.start_ms,
        end_ms:segment.end_ms,
        original_text:segment.original_text,
      })),
    },
  };
}

export function createListeningController({importMedia,importStatus,targetLanguage,translateMedia=()=>Promise.resolve(null),onChange=()=>{},onMediaReady=()=>{},onTranslationReady=()=>{},onSelection=()=>{},onProcessing=()=>{},onImportTerminal=()=>{}}){
  const model={status:'empty',payload:null,error:null,selected:null,manualSelection:false,playingSegmentId:null,jobId:null,sourceUrl:'',original:true,meaning:true,playbackRate:1,mode:'follow',practiceSession:null,shadowingSession:null,practiceValidation:null};
  const viewId=`listening-${++listeningViewSequence}`;
  let importGeneration=0;
  let backgroundTranslationGeneration=0;
  const changed=(options={})=>onChange({...model},options);
  const actionAnchor=()=>model.mode==='follow'&&!model.manualSelection
    ?(model.playingSegmentId||model.selected):model.selected;
  const selectedSegment=()=>model.payload?.transcript?.segments?.find(segment=>segment.segment_id===model.selected);
  const mergeTranslation=translated=>{
    model.payload={
      ...model.payload,
      asset:{...model.payload.asset,...translated.asset},
      translations:translated.translations,
      translation:translated.translation,
    };
  };
  const acceptPayload=payload=>{
    model.payload=payload;
    model.status=mediaImportState(payload);
    model.jobId=model.status==='processing'&&typeof payload?.import_job?.job_id==='string'?payload.import_job.job_id:null;
    model.selected=model.status==='ready'?payload.transcript.segments[0].segment_id:null;
    model.manualSelection=false;model.playingSegmentId=null;
    const segmentIds=model.status==='ready'?payload.transcript.segments.map(segment=>segment.segment_id):[];
    model.practiceSession=model.status==='ready'?createListeningPracticeSession({asset_id:payload.asset.asset_id,segment_ids:segmentIds}):null;
    model.shadowingSession=model.status==='ready'?createShadowingPracticeSession({asset_id:payload.asset.asset_id,segment_ids:segmentIds}):null;
    model.practiceValidation=null;
    if(['active','shadowing'].includes(model.mode)&&!playbackAvailable(payload?.playback))model.mode='follow';
    if(model.status==='processing'&&model.jobId)onProcessing({job_id:model.jobId,source_url:model.sourceUrl});
    else onImportTerminal();
    if(model.status==='ready')onMediaReady(payload,model.selected);
  };
  const translateReadyPayload=generation=>{
    if(model.status!=='ready'||!model.payload?.transcript||model.payload.translation)return;
    const translationGeneration=++backgroundTranslationGeneration;
    const target=targetLanguage();
    let translation;
    try{translation=translateMedia(translationRequest(model.payload,target));}
    catch(error){translation=Promise.reject(error);}
    Promise.resolve(translation)
      .then(translated=>{
        if(generation!==importGeneration||translationGeneration!==backgroundTranslationGeneration)return;
        mergeTranslation(translated);
        onTranslationReady(model.payload);
      })
      .catch(()=>{
        if(generation!==importGeneration||translationGeneration!==backgroundTranslationGeneration)return;
        model.payload.translation={status:'unavailable',target_language:target};
        onImportTerminal();
        onTranslationReady(model.payload);
      });
  };
  return {
    model,
    viewId,
    html:()=>listeningPage(model,viewId),
    async importUrl(sourceUrl){
      const generation=++importGeneration;
      model.sourceUrl=sourceUrl;
      model.status='validating';model.error=null;model.jobId=null;changed();
      if(!validMediaUrl(sourceUrl)){model.status='unsupported';changed();return;}
      try{
        const payload=await importMedia({source_url:sourceUrl,target_language:targetLanguage(),include_word_timing:true,include_translation:false});
        if(generation!==importGeneration)return;
        acceptPayload(payload);
        translateReadyPayload(generation);
      }catch(error){
        if(generation!==importGeneration)return;
        model.error=error;model.status=mediaImportErrorState(error);model.jobId=null;onImportTerminal();
      }
      changed();
    },
    async pollPending(jobId=model.jobId){
      if(typeof jobId!=='string'||!jobId)return false;
      const generation=importGeneration;
      try{
        const payload=await importStatus({job_id:jobId});
        if(generation!==importGeneration||model.jobId!==jobId)return false;
        acceptPayload(payload);
        translateReadyPayload(generation);
      }catch(error){
        if(generation!==importGeneration||model.jobId!==jobId)return false;
        model.error=error;model.status=mediaImportErrorState(error);model.jobId=null;onImportTerminal();
      }
      changed();
      return true;
    },
    resumePending({job_id='',source_url=''}={}){
      if(typeof job_id!=='string'||!job_id)return false;
      model.jobId=job_id;model.sourceUrl=typeof source_url==='string'?source_url:'';model.status='processing';model.error=null;changed();return true;
    },
    retryTranslation(){
      if(model.status!=='ready'||model.payload?.translation?.status!=='unavailable'||!model.payload?.transcript)return false;
      model.payload.translation=null;model.error=null;changed();
      translateReadyPayload(importGeneration);
      return true;
    },
    select(segmentId){
      if(!model.payload?.transcript?.segments?.some(segment=>segment.segment_id===segmentId))return false;
      model.selected=segmentId;model.manualSelection=true;
      if(model.practiceSession)selectListeningPracticeSegment(model.practiceSession,segmentId);
      if(model.shadowingSession)selectShadowingPracticeSegment(model.shadowingSession,segmentId);
      model.practiceValidation=null;onSelection(segmentId);changed();return true;
    },
    moveSelection(offset){
      const canonical=model.payload?.transcript?.segments||[];
      const segments=model.mode==='follow'?buildTranscriptDisplayUnits(canonical):canonical;
      const index=model.mode==='follow'
        ?segments.findIndex(segment=>displayUnitContains(segment,actionAnchor()))
        :segments.findIndex(segment=>segment.segment_id===actionAnchor());
      const target=segments[index+offset];
      if(!target)return false;
      model.selected=target.segment_id;model.manualSelection=true;
      if(model.practiceSession)selectListeningPracticeSegment(model.practiceSession,target.segment_id);
      if(model.shadowingSession)selectShadowingPracticeSegment(model.shadowingSession,target.segment_id);
      model.practiceValidation=null;onSelection(target.segment_id);changed();return true;
    },
    restore(payload,selectedId=null){
      if(mediaImportState(payload)!=='ready')return false;
      model.payload=payload;
      model.status='ready';
      const ids=payload.transcript.segments.map(segment=>segment.segment_id);
      model.selected=ids.includes(selectedId)?selectedId:ids[0]||null;
      model.manualSelection=false;model.playingSegmentId=null;
      model.practiceSession=createListeningPracticeSession({asset_id:payload.asset.asset_id,segment_ids:ids});
      model.shadowingSession=createShadowingPracticeSession({asset_id:payload.asset.asset_id,segment_ids:ids});
      if(model.selected){
        selectListeningPracticeSegment(model.practiceSession,model.selected);
        selectShadowingPracticeSegment(model.shadowingSession,model.selected);
      }
      model.practiceValidation=null;
      if(['active','shadowing'].includes(model.mode)&&!playbackAvailable(payload.playback))model.mode='follow';
      onMediaReady(payload,model.selected);
      changed();
      return true;
    },
    setMode(value){
      if(!['follow','active','shadowing'].includes(value))return false;
      if(value==='active'&&(!model.practiceSession||!playbackAvailable(model.payload?.playback)))return false;
      if(value==='shadowing'&&(!model.shadowingSession||!playbackAvailable(model.payload?.playback)))return false;
      model.mode=value;
      if(value==='active')selectListeningPracticeSegment(model.practiceSession,model.selected);
      if(value==='shadowing')selectShadowingPracticeSegment(model.shadowingSession,model.selected);
      model.practiceValidation=null;changed();return true;
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
    recordShadowingRound(){
      if(!model.shadowingSession)return false;
      const recorded=recordShadowingPracticeRound(model.shadowingSession);
      if(recorded)changed();
      return recorded;
    },
    toggleOriginal(value){model.original=value;changed();},
    toggleMeaning(value){model.meaning=value;changed();},
    setPlaybackRate(value){
      if(![.75,1,1.25].includes(value))return false;
      model.playbackRate=value;return true;
    },
    actionAnchor,
    followPlaying(){
      if(model.playingSegmentId){
        model.selected=model.playingSegmentId;
        if(model.mode==='active')selectListeningPracticeSegment(model.practiceSession,model.selected);
        if(model.mode==='shadowing')selectShadowingPracticeSegment(model.shadowingSession,model.selected);
      }
      model.manualSelection=false;changed();return actionAnchor();
    },
    setPlayingSegment(segmentId){
      if(!model.payload?.transcript?.segments?.some(segment=>segment.segment_id===segmentId))return false;
      if(model.playingSegmentId===segmentId)return true;
      model.playingSegmentId=segmentId;
      const selectedChanged=['follow','shadowing'].includes(model.mode)&&!model.manualSelection;
      if(selectedChanged){
        model.selected=segmentId;
        if(model.mode==='shadowing')selectShadowingPracticeSegment(model.shadowingSession,segmentId);
      }
      changed({playbackOnly:true,selectedChanged});return true;
    },
  };
}

const smartFollowBindings=new WeakMap();
const SMART_FOLLOW_IDLE_MS=4500;
const SMART_FOLLOW_KEYS=new Set(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End']);

function transcriptRowGeometry(container,row){
  const containerRect=container.getBoundingClientRect();
  const rowRect=row.getBoundingClientRect();
  return {
    rowTop:container.scrollTop+rowRect.top-containerRect.top,
    rowHeight:rowRect.height,
    rowBottom:container.scrollTop+rowRect.bottom-containerRect.top,
  };
}

function scrollTranscriptRow(container,row,{behavior='smooth',focusFraction=null}={}){
  if(!container||!row)return false;
  const {rowTop,rowHeight,rowBottom}=transcriptRowGeometry(container,row);
  const maxTop=Math.max(0,container.scrollHeight-container.clientHeight);
  let targetTop=container.scrollTop;
  if(Number.isFinite(focusFraction)){
    targetTop=rowTop-(container.clientHeight*focusFraction)+(rowHeight/2);
  }else if(rowTop<container.scrollTop){
    targetTop=rowTop-12;
  }else if(rowBottom>container.scrollTop+container.clientHeight){
    targetTop=rowBottom-container.clientHeight+12;
  }else{
    return false;
  }
  container.scrollTo({top:Math.max(0,Math.min(targetTop,maxTop)),behavior});
  return true;
}

function transcriptRowForSelection(root,selectedSegmentId){
  return [...root.querySelectorAll('.listening-segment[data-canonical-segment-ids]')].find(row=>{
    const ids=String(row.dataset.canonicalSegmentIds||'').split(/\s+/).filter(Boolean);
    return ids.includes(selectedSegmentId);
  })||null;
}

function installSmartFollow(root){
  smartFollowBindings.get(root)?.abort?.();

  const abortController=new AbortController();
  const {signal}=abortController;
  let followFrame=null;
  let resumeTimer=null;
  let suspended=false;
  let lastFocusedRow=null;

  const transcriptContainer=target=>{
    const container=target instanceof Element?target.closest('.listening-segments'):null;
    return container&&root.contains(container)?container:null;
  };
  const focusPlaying=({force=false}={})=>{
    const container=root.querySelector('.listening-workspace .listening-segments');
    const row=container?.querySelector('.listening-segment.it-playing-segment');
    if(!row||(!force&&row===lastFocusedRow))return false;

    scrollTranscriptRow(container,row,{focusFraction:.45});
    lastFocusedRow=row;
    return true;
  };
  const scheduleFollow=()=>{
    if(suspended||followFrame!==null)return;
    followFrame=requestAnimationFrame(()=>{
      followFrame=null;
      if(!suspended)focusPlaying();
    });
  };
  const resume=()=>{
    suspended=false;
    resumeTimer=null;
    lastFocusedRow=null;
    focusPlaying({force:true});
  };
  const suspend=event=>{
    if(!transcriptContainer(event.target))return;
    suspended=true;
    if(resumeTimer!==null)clearTimeout(resumeTimer);
    resumeTimer=setTimeout(resume,SMART_FOLLOW_IDLE_MS);
  };
  const suspendFromKey=event=>{
    if(SMART_FOLLOW_KEYS.has(event.key))suspend(event);
  };

  root.addEventListener('orena:media-time',scheduleFollow,{signal});
  root.addEventListener('wheel',suspend,{signal,passive:true});
  root.addEventListener('touchstart',suspend,{signal,passive:true});
  root.addEventListener('touchmove',suspend,{signal,passive:true});
  root.addEventListener('pointerdown',suspend,{signal,passive:true});
  root.addEventListener('keydown',suspendFromKey,{signal});

  const binding={
    abort(){
      if(followFrame!==null)cancelAnimationFrame(followFrame);
      if(resumeTimer!==null)clearTimeout(resumeTimer);
      abortController.abort();
    },
    isSuspended:()=>suspended,
    resumeNow(){
      if(resumeTimer!==null)clearTimeout(resumeTimer);
      resume();
    },
  };

  smartFollowBindings.set(root,binding);
  return binding;
}

export async function renderListening(root,{importMedia=api.importMedia,importStatus=api.mediaImportStatus,translateMedia=api.translateMedia,targetLanguage=supportLanguage}={}){
  let controller;
  let mounted=false;
  let visibleSelection=null;
  let pollTimer=null;
  let renderedAssetId=null;
  const transcriptScrollTops=new Map();
  const viewAbort=new AbortController();
  const smartFollow=installSmartFollow(root);
  let importForm=null;
  const bindImportForm=()=>{
    const form=root.querySelector('#mediaImportForm');
    if(!form||form===importForm)return;
    importForm=form;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      controller.importUrl(root.querySelector('#mediaSourceUrl').value);
    },{signal:viewAbort.signal});
  };
  const schedulePoll=()=>{
    if(pollTimer)clearTimeout(pollTimer);
    pollTimer=null;
    if(controller.model.status!=='processing'||!controller.model.jobId)return;
    pollTimer=setTimeout(()=>{
      if(!root.querySelector(`[data-listening-view="${controller.viewId}"]`))return;
      controller.pollPending();
    },2500);
  };
  const render=(_model,{playbackOnly=false,selectedChanged=false}={})=>{
    if(playbackOnly&&(controller.model.mode==='active'||(controller.model.mode==='shadowing'&&!selectedChanged)))return;
    if(mounted&&!root.querySelector(`[data-listening-view="${controller.viewId}"]`))return;
    const payload=controller.model.payload;
    const assetId=payload?.asset?.asset_id||null;
    const workspaceNode=root.querySelector('.listening-workspace');
    const learningColumn=workspaceNode?.querySelector('.listening-learning-column');
    const previousMode=workspaceNode?.dataset?.listeningMode;
    const previousSegments=typeof learningColumn?.querySelector==='function'
      ?learningColumn.querySelector('.listening-segments'):null;
    const preserveFollowScroll=previousMode==='follow'&&smartFollow.isSuspended()&&previousSegments
      ?previousSegments.scrollTop:null;
    if(['active','shadowing'].includes(previousMode)&&previousSegments)transcriptScrollTops.set(previousMode,previousSegments.scrollTop);
    const preservePlayer=Boolean(
      mounted
      && controller.model.status==='ready'
      && assetId
      && assetId===renderedAssetId
      && root.querySelector('#listeningPlayer')
      && workspaceNode
      && learningColumn
    );
    if(preservePlayer){
      const mode=listeningMode(payload,controller.model);
      workspaceNode.dataset.listeningMode=mode;
      learningColumn.innerHTML=learningWorkspace(payload,controller.model.selected,controller.model,mode);
      const segments=typeof learningColumn.querySelector==='function'
        ?learningColumn.querySelector('.listening-segments'):null;
      if(segments&&['active','shadowing'].includes(mode))segments.scrollTop=transcriptScrollTops.get(mode)||0;
      if(segments&&mode==='follow'&&preserveFollowScroll!==null)segments.scrollTop=preserveFollowScroll;
    }else{
      root.innerHTML=controller.html();
      connectMediaPlayer(root,payload?.playback);
      renderedAssetId=controller.model.status==='ready'?assetId:null;
    }
    mounted=true;
    bindImportForm();
    root.querySelector('[data-retry-translation]')?.addEventListener('click',()=>controller.retryTranslation());
    root.querySelector('#toggleOriginal')?.addEventListener('change',event=>controller.toggleOriginal(event.target.checked));
    root.querySelector('#toggleMeaning')?.addEventListener('change',event=>controller.toggleMeaning(event.target.checked));
    root.querySelectorAll('button[data-listening-mode]').forEach(button=>button.addEventListener('click',()=>controller.setMode(button.dataset.listeningMode)));
    root.querySelector('[data-shadow-selected]')?.addEventListener('click',()=>controller.setMode('shadowing'));
    root.querySelector('[data-shadow-round]')?.addEventListener('click',()=>controller.recordShadowingRound());
    root.querySelector('[data-open-speaking]')?.addEventListener('click',()=>go('speak'));
    root.querySelector('#activeListeningAnswer')?.addEventListener('input',event=>controller.setPracticeDraft(event.target.value));
    root.querySelector('#activeListeningForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      controller.setPracticeDraft(root.querySelector('#activeListeningAnswer').value);
      controller.checkPractice();
    });
    root.querySelector('[data-reveal-answer]')?.addEventListener('click',()=>controller.revealPractice());
    root.querySelector('[data-retry-active]')?.addEventListener('click',()=>controller.retryPractice());
    root.querySelector('[data-toggle-playback]')?.addEventListener('click',()=>{
      togglePlayback(root,controller.model.payload?.playback);
    });
    root.querySelector('[data-follow-playing]')?.addEventListener('click',()=>{
      controller.followPlaying();
      smartFollow.resumeNow();
    });
    root.querySelectorAll('[data-select-segment]').forEach(button=>button.addEventListener('click',()=>controller.select(button.dataset.selectSegment)));
    root.querySelector('[data-previous-segment]')?.addEventListener('click',()=>controller.moveSelection(-1));
    root.querySelector('[data-next-segment]')?.addEventListener('click',()=>controller.moveSelection(1));
    root.querySelector('[data-replay-current]')?.addEventListener('click',()=>{
      const payload=controller.model.payload;
      const canonical=payload.transcript.segments;
      const segments=controller.model.mode==='follow'?buildTranscriptDisplayUnits(canonical):canonical;
      const anchor=controller.actionAnchor();
      const segment=controller.model.mode==='follow'
        ?segments.find(item=>displayUnitContains(item,anchor))
        :segments.find(item=>item.segment_id===anchor);
      if(segment)replaySegment(root,payload.playback,segment.start_ms,segment.end_ms,controller.model.playbackRate);
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
      const selected=transcriptRowForSelection(root,controller.model.selected);
      const container=selected?.closest('.listening-segments');
      if(container&&selected)scrollTranscriptRow(container,selected);
      visibleSelection=controller.model.selected;
    }
    schedulePoll();
  };
  controller=createListeningController({
    importMedia,importStatus,targetLanguage,translateMedia,onChange:render,
    onMediaReady:(payload,selected_segment_id)=>setSharedMediaSession({learning_language:state.language,payload,selected_segment_id}),
    onTranslationReady:payload=>{
      setSharedMediaSession({learning_language:state.language,payload,selected_segment_id:controller.model.selected});
      render();
    },
    onSelection:segmentId=>selectSharedMediaSegment(state.language,segmentId),
    onProcessing:({job_id,source_url})=>setPendingMediaImport({learning_language:state.language,job_id,source_url}),
    onImportTerminal:()=>clearPendingMediaImport(state.language),
  });
  root.addEventListener('orena:media-time',event=>{
    const segment=activeCanonicalSegment(controller.model.payload?.transcript?.segments||[],Number(event?.detail?.time_ms));
    if(segment)controller.setPlayingSegment(segment.segment_id);
  },{signal:viewAbort.signal});
  root._cleanupScreen=()=>{
    if(pollTimer)clearTimeout(pollTimer);
    smartFollow.abort();
    viewAbort.abort();
    disconnectMediaPlayer(root);
  };
  const pending=getPendingMediaImport(state.language);
  const shared=getSharedMediaSession(state.language);
  if(pending)controller.resumePending(pending);
  else if(shared)controller.restore(shared.payload,shared.selected_segment_id);
  else render();
  return controller;
}
