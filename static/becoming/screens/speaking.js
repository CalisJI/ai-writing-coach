import {go} from '../router.js';
import {api} from '../api.js';
import {state} from '../store.js';
import {esc} from '../components/primitives.js';
import {createLocalAudioRecorder} from '../components/audio-recorder.js';
import {mediaPlayer,replaySegment,setPlaybackRate as setMediaPlaybackRate} from '../components/media-player.js';
import {uiLocale} from '../domain/i18n.js';
import {transcriptTokens} from '../domain/transcript-tokens.js';
import {getSharedMediaSession,selectSharedMediaSegment} from '../domain/shared-media-session.js';
import {evaluateSpeechTranscript} from '../domain/speaking-evaluation.js';

const COPY={
  en:{
    kicker:'SPEAK · SHADOW',title:'HEAR IT. SAY IT. HEAR YOURSELF.',
    lead:'Use the same media lesson from Listening. Record one local practice take, play it back, and repeat without creating a second media import.',
    emptyTitle:'Choose a media lesson first.',emptyBody:'Import a video in Listening. Speaking reuses that exact media object and its canonical segments.',
    openListening:'Open Listening',backListening:'Back to Listening',segment:'Segment',meaning:'Meaning',
    replay:'Replay source',speed:'Speed',record:'Record my voice',stop:'Stop recording',discard:'Discard take',
    yourTake:'Your latest take',attempts:'Local takes',recording:'Recording… speak the selected segment aloud.',
    ready:'Your take is ready. Play it back and compare it with the source.',unsupported:'This browser cannot record audio here.',
    micError:'Microphone access is unavailable. Check browser permission and try again.',
    emptyRecording:'No usable audio was captured. Try another take.',
    privacy:'This take stays in this browser tab. It is not uploaded or saved to your account.',
    noScore:'Speaking Core is internal and self-guided for now. No ASR, pronunciation score, or speaking evaluation is generated.',
    source:'Source line',
  },
  vi:{
    kicker:'NÓI · SHADOW',title:'NGHE. NÓI THEO. NGHE LẠI GIỌNG MÌNH.',
    lead:'Dùng lại đúng bài media từ Listening. Ghi một lượt luyện cục bộ, nghe lại và lặp lại mà không cần import media lần hai.',
    emptyTitle:'Hãy chọn một bài media trước.',emptyBody:'Import video trong Listening. Speaking sẽ dùng lại đúng media object và các đoạn canonical đó.',
    openListening:'Mở Listening',backListening:'Quay lại Listening',segment:'Đoạn',meaning:'Nghĩa',
    replay:'Nghe lại câu gốc',speed:'Tốc độ',record:'Ghi giọng của tôi',stop:'Dừng ghi âm',discard:'Xóa lượt ghi',
    yourTake:'Lượt ghi gần nhất',attempts:'Lượt ghi cục bộ',recording:'Đang ghi… hãy nói theo đoạn đã chọn.',
    ready:'Lượt ghi đã sẵn sàng. Hãy nghe lại và so sánh với câu gốc.',unsupported:'Trình duyệt này chưa hỗ trợ ghi âm tại đây.',
    micError:'Không truy cập được microphone. Hãy kiểm tra quyền của trình duyệt rồi thử lại.',
    emptyRecording:'Không thu được audio phù hợp. Hãy thử lại.',
    privacy:'Lượt ghi chỉ tồn tại trong tab trình duyệt này. Audio không được upload hay lưu vào tài khoản.',
    noScore:'Speaking Core hiện là bản internal tự luyện. Chưa có ASR, điểm phát âm hoặc chấm Speaking.',
    source:'Câu gốc',
  },
  zh:{
    kicker:'口语 · 跟读',title:'先听，再说，再听自己的声音。',
    lead:'直接复用 Listening 中的同一媒体课程。录制一次本地练习、回放并重复，不需要再次导入媒体。',
    emptyTitle:'请先选择一个媒体课程。',emptyBody:'先在 Listening 中导入视频。Speaking 会复用同一个媒体对象与标准句段。',
    openListening:'打开 Listening',backListening:'返回 Listening',segment:'句段',meaning:'释义',
    replay:'重听原句',speed:'速度',record:'录下我的声音',stop:'停止录音',discard:'删除本次录音',
    yourTake:'最近一次录音',attempts:'本地录音次数',recording:'正在录音… 请大声跟读当前句段。',
    ready:'录音已准备好。回放并与原句比较。',unsupported:'当前浏览器无法在这里录音。',
    micError:'无法使用麦克风。请检查浏览器权限后重试。',
    emptyRecording:'没有录到可用音频，请再试一次。',
    privacy:'本次录音只保留在当前浏览器标签页，不会上传或保存到账户。',
    noScore:'Speaking Core 目前是内部自主练习，不运行 ASR，也不生成发音分数或口语评估。',
    source:'原句',
  },
};

const copy=()=>COPY[uiLocale()]||COPY.en;
const ASR_COPY={
  en:{busy:'Transcribing your take...',result:'What Orena heard',failed:'Could not transcribe this take. You can still play it back and retry.'},
  vi:{busy:'Đang nhận dạng lượt nói...',result:'Orena nghe được',failed:'Chưa thể nhận dạng lượt nói này. Bạn vẫn có thể nghe lại và thử lại.'},
  zh:{busy:'正在识别这次录音…',result:'Orena 听到的内容',failed:'暂时无法识别这次录音。你仍然可以回放并重试。'},
};
const asrCopy=()=>ASR_COPY[uiLocale()]||ASR_COPY.en;
const MATCH_COPY={
  en:{
    match:'Content match',missing:'Try these again',extra:'Extra words heard',
    strong:'Strong match - move forward',close:'Close - one more pass can help',retry:'Try this line again',
    sourceCheck:'Source check',previous:'Previous segment',next:'Next segment',
    privacy:'This audio is sent for transcription. Orena does not save this take to your account.',
    disclaimer:'Content match compares recognized text with the source. It is not a pronunciation score.',
  },
  vi:{
    match:'Khớp nội dung',missing:'Hãy thử lại các từ này',extra:'Từ nghe thêm',
    strong:'Khớp tốt - chuyển sang câu tiếp theo',close:'Gần đạt - thêm một lượt nữa sẽ hữu ích',retry:'Hãy thử lại câu này',
    sourceCheck:'So với câu gốc',previous:'Đoạn trước',next:'Đoạn tiếp',
    privacy:'Audio được gửi đi để nhận dạng lời nói. Orena không lưu lượt ghi này vào tài khoản của bạn.',
    disclaimer:'Khớp nội dung chỉ so sánh văn bản nhận dạng với câu gốc. Đây chưa phải điểm phát âm.',
  },
  zh:{
    match:'内容匹配',missing:'再试试这些内容',extra:'额外识别内容',
    strong:'匹配很好，可以继续下一句',close:'已经接近，再练一遍会更稳',retry:'再试一次这一句',
    sourceCheck:'对照原句',previous:'上一句',next:'下一句',
    privacy:'音频会发送用于语音识别。Orena 不会把这次录音保存到你的账户。',
    disclaimer:'内容匹配只比较识别文本与原句，并不是发音评分。',
  },
};
const matchCopy=()=>MATCH_COPY[uiLocale()]||MATCH_COPY.en;
const PRON_COPY={
  en:{
    assess:'Assess pronunciation',busy:'Assessing pronunciation...',title:'Pronunciation',
    overall:'Pronunciation',accuracy:'Accuracy',fluency:'Fluency',completeness:'Completeness',
    prosody:'Prosody',focus:'Words to focus on',phonemes:'Sounds',
    unavailable:'Pronunciation scoring is not configured on this environment.',
    failed:'Pronunciation assessment is temporarily unavailable. Your recording and content match still work.',
    demo:'DEMO score — UI testing only. Your pronunciation quality is not being judged.',
    disclaimer:'Provider-backed scores apply only to this recorded segment, not global proficiency.',
  },
  vi:{
    assess:'Chấm phát âm',busy:'Đang chấm phát âm...',title:'Phát âm',
    overall:'Tổng quan',accuracy:'Độ chính xác',fluency:'Độ trôi chảy',completeness:'Độ đầy đủ',
    prosody:'Ngữ điệu',focus:'Từ cần tập trung',phonemes:'Âm',
    unavailable:'Môi trường này chưa cấu hình dịch vụ chấm phát âm.',
    failed:'Tạm thời chưa chấm được phát âm. Lượt ghi và khớp nội dung vẫn hoạt động.',
    demo:'Điểm DEMO — chỉ để test giao diện. Chất lượng phát âm của bạn chưa được chấm.',
    disclaimer:'Điểm từ provider chỉ áp dụng cho đoạn ghi này, không phải năng lực tổng quát.',
  },
  zh:{
    assess:'评估发音',busy:'正在评估发音…',title:'发音',
    overall:'发音总分',accuracy:'准确度',fluency:'流利度',completeness:'完整度',
    prosody:'韵律',focus:'需要重点练习的词',phonemes:'音素',
    unavailable:'当前环境尚未配置发音评分服务。',
    failed:'暂时无法完成发音评估。录音和内容匹配仍可继续使用。',
    demo:'DEMO 分数——仅用于界面测试，并未真正评估你的发音质量。',
    disclaimer:'服务商评分仅针对本次录音片段，不代表整体语言能力。',
  },
};
const pronCopy=()=>PRON_COPY[uiLocale()]||PRON_COPY.en;

function pronunciationMarkup(model){
  const c=pronCopy();
  if(model.pronunciationStatus==='loading'){
    return `<p class="speaking-recorder-status" data-speaking-pronunciation-status role="status">${esc(c.busy)}</p>`;
  }
  if(model.pronunciationStatus==='unavailable'){
    return `<p class="speaking-recorder-status speaking-pronunciation-unavailable" data-speaking-pronunciation-status role="status">${esc(c.unavailable)}</p>`;
  }
  if(model.pronunciationStatus==='error'){
    return `<p class="speaking-recorder-status speaking-pronunciation-error" data-speaking-pronunciation-status role="alert">${esc(model.pronunciationErrorMessage||c.failed)}</p>`;
  }
  const result=model.pronunciation;
  if(!result)return '';

  const metrics=[
    [c.overall,result.pron_score],
    [c.accuracy,result.accuracy_score],
    [c.fluency,result.fluency_score],
    [c.completeness,result.completeness_score],
    [c.prosody,result.prosody_score],
  ].filter(([,value])=>typeof value==='number');

  const weakWords=(Array.isArray(result.words)?result.words:[])
    .filter(word=>(typeof word.accuracy_score==='number'&&word.accuracy_score<80)
      ||String(word.error_type||'None').toLowerCase()!=='none')
    .slice(0,6);

  const synthetic=result.score_kind==='synthetic_demo';
  return `<section class="speaking-pronunciation ${synthetic?'is-synthetic':''}" data-speaking-pronunciation data-score-kind="${esc(result.score_kind||'provider')}">
    ${synthetic?`<p class="speaking-pronunciation-demo" role="note">${esc(c.demo)}</p>`:''}
    <div class="speaking-pronunciation-head">
      <div><strong>${esc(c.title)}</strong><small>${esc(result.provider||'')} · ${esc(result.locale||'')}</small></div>
    </div>
    <div class="speaking-pronunciation-metrics">
      ${metrics.map(([label,value])=>`<div><span>${esc(label)}</span><strong>${Math.round(value)}</strong></div>`).join('')}
    </div>
    ${weakWords.length?`<div class="speaking-pronunciation-focus">
      <strong>${esc(c.focus)}</strong>
      ${weakWords.map(word=>{
        const weakPhonemes=(Array.isArray(word.phonemes)?word.phonemes:[])
          .filter(item=>typeof item.accuracy_score==='number'&&item.accuracy_score<70)
          .slice(0,6);
        return `<div class="speaking-pronunciation-word">
          <span><b>${esc(word.word||'')}</b>${typeof word.accuracy_score==='number'?` <small>${Math.round(word.accuracy_score)}</small>`:''}</span>
          ${weakPhonemes.length?`<span class="speaking-pronunciation-phonemes"><small>${esc(c.phonemes)}</small> ${weakPhonemes.map(item=>`<i>${esc(item.phoneme)} ${Math.round(item.accuracy_score)}</i>`).join(' ')}</span>`:''}
        </div>`;
      }).join('')}
    </div>`:''}
    <p class="speaking-pronunciation-disclaimer">${esc(c.disclaimer)}</p>
  </section>`;
}

const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
const transcriptTokenMarkup=value=>transcriptTokens(value).map(token=>token.word
  ?`<span class="transcript-token">${esc(token.text)}</span>`
  :esc(token.text)).join('');

function translationFor(payload,segmentId){
  return (payload?.translations||[]).find(item=>item.segment_id===segmentId)?.translated_meaning||'';
}

function emptyPage(){
  const c=copy();
  return `<section class="page speaking-page speaking-empty">
    <div class="speaking-empty-card visual-section-surface">
      <p>${esc(c.emptyBody)}</p>
      <button class="button button-primary" type="button" data-speaking-open-listening>${esc(c.openListening)}</button>
    </div>
  </section>`;
}

export function createSpeakingController({session,recorder=createLocalAudioRecorder(),transcribe=api.transcribeSpeech,pronunciationAssess=api.assessPronunciation,onChange=()=>{}}={}){
  const payload=session?.payload||null;
  const segments=payload?.transcript?.segments||[];
  const ids=segments.map(segment=>segment.segment_id);
  const initial=ids.includes(session?.selected_segment_id)?session.selected_segment_id:ids[0]||null;
  const model={
    selected:initial,
    playbackRate:1,
    attempts:Object.fromEntries(ids.map(id=>[id,0])),
    asrStatus:'idle',
    asrTranscript:'',
    asrWords:[],
    asrError:'',
    asrErrorMessage:'',
    evaluation:null,
    pronunciationStatus:'idle',
    pronunciation:null,
    pronunciationError:'',
    pronunciationErrorMessage:'',
  };
  let pronunciationGeneration=0;
  const changed=()=>onChange({...model});

  return {
    model,
    recorder,
    html(){
      const c=copy();
      const segment=segments.find(item=>item.segment_id===model.selected);
      const index=segments.findIndex(item=>item.segment_id===model.selected);
      const recording=recorder.snapshot();
      const meaning=translationFor(payload,model.selected);
      const statusText=recording.status==='recording'?c.recording
        :recording.status==='ready'?c.ready
        :recording.error==='microphone_unavailable'?c.micError
        :recording.error==='recording_empty'||recording.error==='recording_failed'?c.emptyRecording
        :recording.status==='unsupported'?c.unsupported:'';

      return `<section class="page speaking-page" data-speaking-core>
        <div class="speaking-workspace">
          <section class="speaking-video visual-hero-surface">
            <div class="speaking-video-frame">${mediaPlayer(payload.playback,payload.asset?.title)}</div>
            <div class="speaking-media-caption">
              <span>${esc(payload.asset?.source_provider||'media')}</span>
              <h2>${esc(payload.asset?.title||'Media lesson')}</h2>
              <button class="button button-secondary" type="button" data-speaking-back-listening>${esc(c.backListening)}</button>
            </div>
          </section>

          <section class="speaking-practice visual-section-surface">
            <div class="speaking-segment-list" aria-label="${esc(c.segment)}">
              ${segments.map((item,i)=>`<button type="button" class="speaking-segment-chip ${item.segment_id===model.selected?'active':''}" data-speaking-segment="${esc(item.segment_id)}" aria-pressed="${item.segment_id===model.selected}">
                <time>${stamp(item.start_ms)}</time><span>${esc(c.segment)} ${i+1}</span>
              </button>`).join('')}
            </div>

            ${segment?`<div class="speaking-focus">
              <span class="context-label">${esc(c.source)} · ${esc(c.segment)} ${index+1}</span>
              <p class="speaking-source" aria-label="${esc(segment.original_text)}">${transcriptTokenMarkup(segment.original_text)}</p>
              ${meaning?`<div class="speaking-meaning"><strong>${esc(c.meaning)}</strong><p>${esc(meaning)}</p></div>`:''}

              <div class="speaking-playback-controls">
                <button class="button button-secondary" type="button" data-speaking-previous ${index<=0?'disabled':''}>${esc(matchCopy().previous)}</button>
                <button class="button button-secondary" type="button" data-speaking-replay>${esc(c.replay)}</button>
                <button class="button button-secondary" type="button" data-speaking-next ${index<0||index>=segments.length-1?'disabled':''}>${esc(matchCopy().next)}</button>
                <label>${esc(c.speed)}
                  <select data-speaking-rate>
                    ${[.75,1,1.25].map(rate=>`<option value="${rate}" ${rate===model.playbackRate?'selected':''}>${rate.toFixed(2).replace(/0$/,'')}x</option>`).join('')}
                  </select>
                </label>
              </div>

              <div class="speaking-recorder ${recording.status==='recording'?'is-recording':''}">
                <div class="speaking-recorder-actions">
                  <button class="button button-primary" type="button" data-speaking-record ${recording.status==='recording'||!recording.supported?'disabled':''}>${esc(c.record)}</button>
                  <button class="button button-secondary" type="button" data-speaking-stop ${recording.status==='recording'?'':'disabled'}>${esc(c.stop)}</button>
                  <button class="button button-secondary" type="button" data-speaking-discard ${recording.url?'':'disabled'}>${esc(c.discard)}</button>
                  <button class="button button-secondary" type="button" data-speaking-pronunciation-action ${recording.blob&&model.pronunciationStatus!=='loading'?'':'disabled'}>${esc(pronCopy().assess)}</button>
                  <span class="speaking-attempt-count">${esc(c.attempts)}: ${model.attempts[model.selected]||0}</span>
                </div>
                ${statusText?`<p class="speaking-recorder-status" role="status">${esc(statusText)}</p>`:''}
                ${recording.url?`<div class="speaking-own-voice">
                  <strong>${esc(c.yourTake)}</strong>
                  <audio controls preload="metadata" src="${esc(recording.url)}"></audio>
                </div>`:''}
                ${model.asrStatus==='loading'?`<p class="speaking-recorder-status" role="status">${esc(asrCopy().busy)}</p>`:''}
                ${model.asrTranscript?`<div class="speaking-asr-result" data-speaking-asr-result>
                  <strong>${esc(asrCopy().result)}</strong>
                  <p>${transcriptTokenMarkup(model.asrTranscript)}</p>
                </div>`:''}
                ${model.evaluation?`<div class="speaking-content-match" data-speaking-content-match>
                  <div class="speaking-content-match-score">
                    <strong>${esc(matchCopy().match)}</strong>
                    <span>${model.evaluation.content_match}%</span>
                  </div>
                  <div class="speaking-match-band band-${esc(model.evaluation.result_band)}" data-speaking-match-band="${esc(model.evaluation.result_band)}">
                    ${esc(
                      model.evaluation.result_band==='strong'?matchCopy().strong
                        :model.evaluation.result_band==='close'?matchCopy().close
                        :matchCopy().retry
                    )}
                  </div>
                  <div class="speaking-reference-alignment">
                    <strong>${esc(matchCopy().sourceCheck)}</strong>
                    <p>${model.evaluation.reference_alignment.map(item=>`<span class="speaking-reference-token ${item.matched?'matched':'missing'}">${esc(item.token)}</span>`).join(' ')}</p>
                  </div>
                  ${model.evaluation.missing_tokens.length?`<div class="speaking-feedback-line">
                    <strong>${esc(matchCopy().missing)}</strong>
                    <p>${model.evaluation.missing_tokens.map(token=>`<span class="speaking-feedback-token">${esc(token)}</span>`).join(' ')}</p>
                  </div>`:''}
                  ${model.evaluation.extra_tokens.length?`<div class="speaking-feedback-line">
                    <strong>${esc(matchCopy().extra)}</strong>
                    <p>${model.evaluation.extra_tokens.map(token=>`<span class="speaking-feedback-token">${esc(token)}</span>`).join(' ')}</p>
                  </div>`:''}
                </div>`:''}
                ${pronunciationMarkup(model)}
                ${model.asrError?`<p class="speaking-recorder-status speaking-asr-error" role="alert">${esc(model.asrErrorMessage||asrCopy().failed)} <small>${esc(model.asrError)}</small></p>`:''}
                <p class="speaking-privacy">${esc(matchCopy().privacy)}</p>
                <p class="speaking-no-score">${esc(matchCopy().disclaimer)}</p>
              </div>
            </div>`:''}
          </section>
        </div>
      </section>`;
    },
    select(segmentId){
      if(!ids.includes(segmentId))return false;
      if(recorder.snapshot().status==='recording')return false;
      recorder.discard();
      pronunciationGeneration++;
      model.pronunciationStatus='idle';
      model.pronunciation=null;
      model.pronunciationError='';
      model.pronunciationErrorMessage='';
      model.selected=segmentId;
      model.asrStatus='idle';
      model.asrTranscript='';
      model.asrWords=[];
      model.asrError='';
      model.evaluation=null;
      selectSharedMediaSegment(session.learning_language,segmentId);
      changed();
      return true;
    },
    selectRelative(offset){
      const index=ids.indexOf(model.selected);
      const target=ids[index+offset];
      if(!target)return false;
      return this.select(target);
    },
    async startRecording(){
      pronunciationGeneration++;
      model.pronunciationStatus='idle';
      model.pronunciation=null;
      model.pronunciationError='';
      model.pronunciationErrorMessage='';
      model.asrStatus='idle';
      model.asrTranscript='';
      model.asrWords=[];
      model.asrError='';
      model.evaluation=null;
      const started=await recorder.start();
      changed();
      return started;
    },
    async stopRecording(){
      const result=await recorder.stop();
      if(!result||!model.selected){
        changed();
        return false;
      }

      model.attempts[model.selected]=(model.attempts[model.selected]||0)+1;
      model.asrStatus='loading';
      model.asrTranscript='';
      model.asrWords=[];
      model.asrError='';
      model.evaluation=null;
      changed();

      try{
        const mime=result.mime_type||'audio/webm';
        const extension=mime.includes('ogg')?'ogg':mime.includes('mp4')?'m4a':'webm';
        const response=await transcribe(
          result.blob,
          session.learning_language,
          `speaking-take.${extension}`,
        );
        model.asrTranscript=typeof response?.text==='string'?response.text.trim():'';
        model.asrWords=Array.isArray(response?.words)?response.words:[];
        model.asrStatus='ready';
        if(model.asrTranscript){
          const selectedSegment=segments.find(item=>item.segment_id===model.selected);
          model.evaluation=evaluateSpeechTranscript(selectedSegment?.original_text||'',model.asrTranscript);
        }else{
          model.asrError='empty_transcript';
          model.evaluation=null;
        }
      }catch(error){
        model.asrStatus='error';
        model.asrError=error?.category||String(error?.status||'speech_asr_failed');
        model.asrErrorMessage=typeof error?.message==='string'?error.message:'';
      }
      changed();
      return true;
    },
    async assessPronunciation(){
      const recording=recorder.snapshot();
      const selectedSegment=segments.find(item=>item.segment_id===model.selected);
      if(!recording.blob||!selectedSegment||model.pronunciationStatus==='loading')return false;

      const generation=++pronunciationGeneration;
      model.pronunciationStatus='loading';
      model.pronunciation=null;
      model.pronunciationError='';
      model.pronunciationErrorMessage='';
      changed();

      const mime=recording.mime_type||'audio/webm';
      const extension=mime.includes('ogg')?'ogg':mime.includes('mp4')?'m4a':'webm';
      try{
        const response=await pronunciationAssess(
          recording.blob,
          session.learning_language,
          selectedSegment.original_text||'',
          `speaking-take.${extension}`,
        );
        if(generation!==pronunciationGeneration)return false;
        model.pronunciation=response;
        model.pronunciationStatus='ready';
      }catch(error){
        if(generation!==pronunciationGeneration)return false;
        model.pronunciationStatus=error?.category==='pronunciation_unconfigured'?'unavailable':'error';
        model.pronunciationError=error?.category||String(error?.status||'pronunciation_failed');
        model.pronunciationErrorMessage=typeof error?.message==='string'?error.message:'';
      }
      changed();
      return model.pronunciationStatus==='ready';
    },
    discardRecording(){
      const discarded=recorder.discard();
      if(discarded){
        pronunciationGeneration++;
        model.pronunciationStatus='idle';
        model.pronunciation=null;
        model.pronunciationError='';
        model.pronunciationErrorMessage='';
        model.asrStatus='idle';
        model.asrTranscript='';
        model.asrWords=[];
        model.asrError='';
        model.evaluation=null;
        changed();
      }
      return discarded;
    },
    setPlaybackRate(value){
      if(![.75,1,1.25].includes(value))return false;
      model.playbackRate=value;
      return true;
    },
    cleanup(){recorder.cleanup();},
  };
}

export async function renderSpeaking(root,{recorderFactory=createLocalAudioRecorder}={}){
  const session=getSharedMediaSession(state.language);
  if(!session){
    root.innerHTML=emptyPage();
    root.querySelector('[data-speaking-open-listening]')?.addEventListener('click',()=>go('listen'));
    return null;
  }

  let mounted=false;
  let controller;
  const render=()=>{
    if(mounted&&!root.querySelector('[data-speaking-core]'))return;
    root.innerHTML=controller.html();
    mounted=true;

    root.querySelector('[data-speaking-back-listening]')?.addEventListener('click',()=>go('listen'));
    root.querySelectorAll('[data-speaking-segment]').forEach(button=>{
      button.addEventListener('click',()=>controller.select(button.dataset.speakingSegment));
    });
    root.querySelector('[data-speaking-previous]')?.addEventListener('click',()=>controller.selectRelative(-1));
    root.querySelector('[data-speaking-next]')?.addEventListener('click',()=>controller.selectRelative(1));
    root.querySelector('[data-speaking-record]')?.addEventListener('click',()=>controller.startRecording());
    root.querySelector('[data-speaking-stop]')?.addEventListener('click',()=>controller.stopRecording());
    root.querySelector('[data-speaking-discard]')?.addEventListener('click',()=>controller.discardRecording());
    root.querySelector('[data-speaking-pronunciation-action]')?.addEventListener('click',()=>controller.assessPronunciation());
    root.querySelector('[data-speaking-replay]')?.addEventListener('click',()=>{
      const segment=session.payload.transcript.segments.find(item=>item.segment_id===controller.model.selected);
      if(segment)replaySegment(root,session.payload.playback,segment.start_ms,segment.end_ms,controller.model.playbackRate);
    });
    root.querySelector('[data-speaking-rate]')?.addEventListener('change',event=>{
      const rate=Number(event.target.value);
      if(setMediaPlaybackRate(root,session.payload.playback,rate))controller.setPlaybackRate(rate);
      else event.target.value=String(controller.model.playbackRate);
    });
    if(controller.model.playbackRate!==1){
      root.querySelector('#listeningPlayer')?.addEventListener('load',()=>setMediaPlaybackRate(root,session.payload.playback,controller.model.playbackRate),{once:true});
    }
  };

  controller=createSpeakingController({session,recorder:recorderFactory(),onChange:render});
  root._cleanupScreen=()=>controller.cleanup();
  render();
  return controller;
}
