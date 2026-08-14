import {esc} from './primitives.js';

function safeEmbedUrl(value){
  try{
    const url=new URL(value,location.origin);
    return url.protocol==='https:'?url.href:'';
  }catch{
    return '';
  }
}

export function mediaPlayer(playback,title){
  const url=safeEmbedUrl(playback?.url);
  if(playback?.kind!=='embed'||!url){
    return '<div class="listening-player-unavailable" role="status">Playback is unavailable for this source.</div>';
  }
  return `<iframe id="listeningPlayer" src="${esc(url)}" title="${esc(title||'Lesson video')}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function replaySegment(root,playback,startMs){
  const frame=root.querySelector('#listeningPlayer');
  if(!frame||playback?.provider!=='youtube')return false;
  frame.contentWindow?.postMessage(JSON.stringify({
    event:'command',
    func:'seekTo',
    args:[Math.max(0,startMs)/1000,true],
  }),'https://www.youtube.com');
  frame.contentWindow?.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}),'https://www.youtube.com');
  return true;
}
