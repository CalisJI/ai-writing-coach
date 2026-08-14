import {esc} from './primitives.js';

const YOUTUBE_EMBED_ORIGIN='https://www.youtube-nocookie.com';
const YOUTUBE_EMBED_PATH=/^\/embed\/[A-Za-z0-9_-]{11}$/;

function playbackAdapter(playback){
  if(playback?.kind!=='embed')return null;
  try{
    const url=new URL(playback.url);
    if(url.protocol!=='https:'||url.username||url.password)return null;
    if(playback.provider!=='youtube')return null;
    if(url.origin!==YOUTUBE_EMBED_ORIGIN||!YOUTUBE_EMBED_PATH.test(url.pathname))return null;
    url.search='';
    url.hash='';
    url.searchParams.set('enablejsapi','1');
    return {url:url.href,origin:url.origin,controllable:true};
  }catch{
    return null;
  }
}

export function mediaPlayer(playback,title){
  const adapter=playbackAdapter(playback);
  if(!adapter){
    return '<div class="listening-player-unavailable" role="status">Playback is unavailable for this source.</div>';
  }
  return `<iframe id="listeningPlayer" src="${esc(adapter.url)}" title="${esc(title||'Lesson video')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function replaySegment(root,playback,startMs){
  const adapter=playbackAdapter(playback);
  const frame=root.querySelector('#listeningPlayer');
  if(!adapter?.controllable||!frame?.contentWindow?.postMessage)return false;
  try{
    if(new URL(frame.src).origin!==adapter.origin)return false;
  }catch{return false;}
  frame.contentWindow?.postMessage(JSON.stringify({
    event:'command',
    func:'seekTo',
    args:[Math.max(0,startMs)/1000,true],
  }),adapter.origin);
  frame.contentWindow?.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}),adapter.origin);
  return true;
}
