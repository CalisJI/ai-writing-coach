import {esc} from './primitives.js';

const YOUTUBE_EMBED_ORIGIN='https://www.youtube-nocookie.com';
const YOUTUBE_EMBED_PATH=/^\/embed\/[A-Za-z0-9_-]{11}$/;
const segmentTimers=new WeakMap();
const controllers=new WeakMap();
let youtubeApiPromise=null;

function playbackAdapter(playback){
  if(playback?.kind!=='embed')return null;
  try{
    const url=new URL(playback.url);
    if(url.protocol!=='https:'||url.username||url.password||playback.provider!=='youtube')return null;
    if(url.origin!==YOUTUBE_EMBED_ORIGIN||!YOUTUBE_EMBED_PATH.test(url.pathname))return null;
    url.search='';
    url.hash='';
    url.searchParams.set('enablejsapi','1');
    const pageOrigin=globalThis.location?.origin;
    if(typeof pageOrigin==='string'&&/^https?:\/\//.test(pageOrigin)){
      url.searchParams.set('origin',pageOrigin);
    }
    return {url:url.href,origin:url.origin,controllable:true};
  }catch{return null;}
}

function ensureYouTubeIframeApi(){
  if(globalThis.YT?.Player)return Promise.resolve(globalThis.YT);
  if(youtubeApiPromise)return youtubeApiPromise;

  youtubeApiPromise=new Promise((resolve,reject)=>{
    const previousReady=globalThis.onYouTubeIframeAPIReady;
    let settled=false;
    const finish=()=>{
      if(settled||!globalThis.YT?.Player)return;
      settled=true;
      resolve(globalThis.YT);
    };

    globalThis.onYouTubeIframeAPIReady=()=>{
      try{
        if(typeof previousReady==='function')previousReady();
      }finally{
        finish();
      }
    };

    let script=document.querySelector('script[data-orena-youtube-iframe-api]');
    if(!script){
      script=document.createElement('script');
      script.src='https://www.youtube.com/iframe_api';
      script.async=true;
      script.dataset.orenaYoutubeIframeApi='true';
      document.head.appendChild(script);
    }
    script.addEventListener('load',finish,{once:true});
    script.addEventListener('error',()=>{
      if(settled)return;
      settled=true;
      reject(new Error('YouTube IFrame API failed to load.'));
    },{once:true});

    setTimeout(()=>{
      if(settled)return;
      if(globalThis.YT?.Player)finish();
      else{
        settled=true;
        reject(new Error('YouTube IFrame API timed out.'));
      }
    },10000);
  });

  return youtubeApiPromise;
}

function clearSegmentTimer(root){
  const timer=segmentTimers.get(root);
  if(timer!==undefined){
    clearTimeout(timer);
    segmentTimers.delete(root);
  }
}

function stopClock(controller){
  if(controller?.pollTimer!==null&&controller?.pollTimer!==undefined){
    clearInterval(controller.pollTimer);
    controller.pollTimer=null;
  }
}

function destroyController(root){
  const controller=controllers.get(root);
  if(!controller)return;
  stopClock(controller);
  try{controller.player?.destroy?.();}catch{}
  controllers.delete(root);
  root.dataset.mediaClock='disconnected';
}

function emitClock(root,controller){
  if(!controller?.player||!controller.frame?.isConnected){
    destroyController(root);
    return;
  }
  try{
    const currentTime=Number(controller.player.getCurrentTime?.());
    if(!Number.isFinite(currentTime))return;
    const state=Number(controller.player.getPlayerState?.());
    root.dataset.mediaClock='ready';
    root.dispatchEvent(new CustomEvent('orena:media-time',{
      bubbles:true,
      detail:{
        time_ms:Math.max(0,Math.round(currentTime*1000)),
        // The progress bar needs a length, not just a position. Duration is
        // read from the same player object and is null until it is known,
        // which the caller must treat as "no bar yet" rather than zero.
        duration_ms:(()=>{
          const total=Number(controller.player.getDuration?.());
          return Number.isFinite(total)&&total>0?Math.round(total*1000):null;
        })(),
        player_state:Number.isFinite(state)?state:null,
      },
    }));
  }catch{}
}

function startClock(root,controller){
  stopClock(controller);
  emitClock(root,controller);
  controller.pollTimer=setInterval(()=>emitClock(root,controller),125);
}

export function connectMediaPlayer(root,playback){
  if(!(root instanceof Element))return false;
  const adapter=playbackAdapter(playback);
  const frame=root.querySelector('#listeningPlayer');
  if(!adapter||!(frame instanceof HTMLIFrameElement)){
    destroyController(root);
    return false;
  }

  const existing=controllers.get(root);
  if(existing?.frame===frame&&existing?.player)return true;
  destroyController(root);

  const controller={frame,player:null,pollTimer:null};
  controllers.set(root,controller);
  root.dataset.mediaClock='connecting';

  ensureYouTubeIframeApi().then(YT=>{
    if(controllers.get(root)!==controller||!frame.isConnected)return;
    controller.player=new YT.Player(frame,{
      events:{
        onReady:()=>{
          if(controllers.get(root)!==controller)return;
          root.dataset.mediaClock='ready';
          startClock(root,controller);
        },
        onStateChange:()=>{
          if(controllers.get(root)!==controller)return;
          emitClock(root,controller);
        },
        onError:()=>{
          if(controllers.get(root)!==controller)return;
          root.dataset.mediaClock='error';
        },
      },
    });
  }).catch(()=>{
    if(controllers.get(root)===controller)root.dataset.mediaClock='error';
  });

  return true;
}

export function disconnectMediaPlayer(root){
  if(!(root instanceof Element))return;
  clearSegmentTimer(root);
  destroyController(root);
}

function sendCommand(root,playback,func,args=[]){
  const adapter=playbackAdapter(playback);
  if(!adapter?.controllable)return false;

  const controller=controllers.get(root);
  if(controller?.player){
    try{
      const method=controller.player?.[func];
      if(typeof method==='function'){
        method.apply(controller.player,args);
        emitClock(root,controller);
        return true;
      }
    }catch{}
  }

  const frame=root.querySelector('#listeningPlayer');
  if(!frame?.contentWindow?.postMessage)return false;
  try{
    if(new URL(frame.src).origin!==adapter.origin)return false;
  }catch{return false;}
  frame.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),adapter.origin);
  return true;
}

export function playbackAvailable(playback){
  return playbackAdapter(playback)!==null;
}

export function mediaPlayer(playback,title){
  const adapter=playbackAdapter(playback);
  if(!adapter)return '<div class="listening-player-unavailable" role="status">Playback is unavailable for this source.</div>';
  return `<iframe id="listeningPlayer" src="${esc(adapter.url)}" title="${esc(title||'Lesson video')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function segmentPlaybackDelayMs(startMs,endMs,rate=1){
  const start=Number(startMs),end=Number(endMs),speed=Number(rate);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(speed)||speed<=0)return null;
  return Math.max(80,Math.round((end-start)/speed)+90);
}

export function stopSegmentPlayback(root,playback){
  clearSegmentTimer(root);
  return sendCommand(root,playback,'pauseVideo');
}

export function replaySegment(root,playback,startMs,endMs=null,rate=1){
  clearSegmentTimer(root);
  const started=sendCommand(root,playback,'seekTo',[Math.max(0,startMs)/1000,true])
    &&sendCommand(root,playback,'playVideo');
  if(!started)return false;

  const delay=segmentPlaybackDelayMs(startMs,endMs,rate);
  if(delay!==null){
    const timer=setTimeout(()=>{
      sendCommand(root,playback,'pauseVideo');
      segmentTimers.delete(root);
    },delay);
    segmentTimers.set(root,timer);
  }
  return true;
}

/* Nudge the position without leaving the segment machinery in a half state:
   any pending "pause at the end of this segment" timer is dropped first, or it
   would fire against a position the learner has already moved away from. */
export function seekBy(root,playback,deltaSeconds){
  const controller=controllers.get(root);
  const step=Number(deltaSeconds);
  if(!controller?.player||!Number.isFinite(step))return false;
  try{
    const current=Number(controller.player.getCurrentTime?.());
    if(!Number.isFinite(current))return false;
    clearSegmentTimer(root);
    return sendCommand(root,playback,'seekTo',[Math.max(0,current+step),true]);
  }catch{return false;}
}

/* Returns the new muted state, or null when the player cannot be reached, so
   the caller can label its own button from the truth rather than a guess. */
export function toggleMute(root,playback){
  const controller=controllers.get(root);
  if(!controller?.player)return null;
  try{
    const muted=Boolean(controller.player.isMuted?.());
    const ok=sendCommand(root,playback,muted?'unMute':'mute');
    return ok?!muted:null;
  }catch{return null;}
}

export function togglePlayback(root,playback){
  const controller=controllers.get(root);
  if(!controller?.player)return false;
  try{
    const state=Number(controller.player.getPlayerState?.());
    if(state===1)controller.player.pauseVideo();
    else controller.player.playVideo();
    emitClock(root,controller);
    return true;
  }catch{return false;}
}

export function setPlaybackRate(root,playback,rate){
  if(![.75,1,1.25].includes(rate))return false;
  return sendCommand(root,playback,'setPlaybackRate',[rate]);
}
