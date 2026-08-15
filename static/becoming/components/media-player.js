import {esc} from './primitives.js';
const YOUTUBE_EMBED_ORIGIN='https://www.youtube-nocookie.com';
const YOUTUBE_EMBED_PATH=/^\/embed\/[A-Za-z0-9_-]{11}$/;
const segmentTimers=new WeakMap();
function playbackAdapter(playback){
  if(playback?.kind!=='embed')return null;
  try{
    const url=new URL(playback.url);
    if(url.protocol!=='https:'||url.username||url.password||playback.provider!=='youtube')return null;
    if(url.origin!==YOUTUBE_EMBED_ORIGIN||!YOUTUBE_EMBED_PATH.test(url.pathname))return null;
    url.search='';url.hash='';url.searchParams.set('enablejsapi','1');
    return {url:url.href,origin:url.origin,controllable:true};
  }catch{return null;}
}
function sendCommand(root,playback,func,args=[]){
  const adapter=playbackAdapter(playback);const frame=root.querySelector('#listeningPlayer');
  if(!adapter?.controllable||!frame?.contentWindow?.postMessage)return false;
  try{if(new URL(frame.src).origin!==adapter.origin)return false;}catch{return false;}
  frame.contentWindow.postMessage(JSON.stringify({event:'command',func,args}),adapter.origin);return true;
}
function clearSegmentTimer(root){const timer=segmentTimers.get(root);if(timer!==undefined){clearTimeout(timer);segmentTimers.delete(root);}}
export function playbackAvailable(playback){return playbackAdapter(playback)!==null;}
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
export function stopSegmentPlayback(root,playback){clearSegmentTimer(root);return sendCommand(root,playback,'pauseVideo');}
export function replaySegment(root,playback,startMs,endMs=null,rate=1){
  clearSegmentTimer(root);
  const started=sendCommand(root,playback,'seekTo',[Math.max(0,startMs)/1000,true])&&sendCommand(root,playback,'playVideo');
  if(!started)return false;
  const delay=segmentPlaybackDelayMs(startMs,endMs,rate);
  if(delay!==null){const timer=setTimeout(()=>{sendCommand(root,playback,'pauseVideo');segmentTimers.delete(root);},delay);segmentTimers.set(root,timer);}
  return true;
}
export function setPlaybackRate(root,playback,rate){if(![.75,1,1.25].includes(rate))return false;return sendCommand(root,playback,'setPlaybackRate',[rate]);}
