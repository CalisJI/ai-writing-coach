import assert from 'node:assert/strict';

import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';
import {renderListening} from '../static/becoming/screens/listening.js';
import {state} from '../static/becoming/store.js';

if(!globalThis.Element)globalThis.Element=Object;
if(!globalThis.HTMLIFrameElement)globalThis.HTMLIFrameElement=class {};
if(!globalThis.document){
  globalThis.document={documentElement:{},getElementById(){return null;},addEventListener(){}};
}
globalThis.addEventListener=()=>{};
globalThis.removeEventListener=()=>{};

function rootFor(){
  let html='';
  return {
    get innerHTML(){return html;},
    set innerHTML(value){html=String(value||'');},
    querySelector(selector){
      if(selector.startsWith('[data-listening-view=')){
        const viewId=selector.match(/"([^"]+)"/)?.[1];
        return viewId&&html.includes(`data-listening-view="${viewId}"`)?{}:null;
      }
      return null;
    },
    querySelectorAll(){return [];},
    addEventListener(){},
  };
}

for(const item of [
  {language:'en',payload:MEDIA_LEARNING_FIXTURE,segment:'segment-001',wrongSegment:'segment-002',label:'Latest Speak feedback'},
  {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,segment:'segment-zh-001',wrongSegment:'segment-zh-002',label:'最近的口语反馈'},
]){
  state.language=item.language;
  state.supportLanguage=item.language;
  const matching={language:item.language,asset_id:item.payload.asset.asset_id,segment_id:item.segment,take_id:`take-${item.language}`,dimensions:{content_match:96,pronunciation:88,fluency:null,transcription_confidence:91},evidence:{content:{match_percent:96}},provenance:{}};
  const root=rootFor();
  let scopedRequest=null;
  const mounted=await renderListening(root,{
    importMedia:async()=>item.payload,
    targetLanguage:()=>item.language,
    // The server-side scoped endpoint returns the matching take even when it
    // is older than unrelated recent attempts; the client must request that
    // scope rather than scanning a truncated global history.
    speakingAttempts:async(...args)=>{
      scopedRequest=args;
      if(args[1]!==item.payload.asset.asset_id||args[2]!==item.segment){
        return {items:Array.from({length:60},(_,index)=>({...matching,asset_id:`recent-${index}`,segment_id:`other-${index}`}))};
      }
      return {items:[matching]};
    },
  });
  await mounted.importUrl(`https://example.test/${item.language}`);
  assert.equal(mounted.setMode('shadowing'),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(scopedRequest,[1,item.payload.asset.asset_id,item.segment]);
  assert.match(root.innerHTML,/data-speaking-feedback-state="ready"/);
  assert.ok(root.innerHTML.includes(item.label),`${item.language} feedback is localised`);
  assert.ok(root.innerHTML.includes(item.language==='zh'?'内容匹配度':'Content match'),`${item.language} dimensions are localised`);
  assert.ok(root.innerHTML.includes('96%'),`${item.language} matching feedback is rendered`);
  assert.ok(root.innerHTML.includes('Not measured')||root.innerHTML.includes('尚未测量'),`${item.language} unavailable dimensions stay explicit`);
  assert.doesNotMatch(root.innerHTML,/another-asset|take-en|take-zh|raw.?audio|proficiency/i);

  const emptyRoot=rootFor();
  const empty=await renderListening(emptyRoot,{importMedia:async()=>item.payload,targetLanguage:()=>item.language,speakingAttempts:async()=>({items:[]})});
  await empty.importUrl(`https://example.test/empty-${item.language}`);
  assert.equal(empty.setMode('shadowing'),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(emptyRoot.innerHTML,/data-speaking-feedback-state="empty"/);
  assert.ok(emptyRoot.innerHTML.includes(item.language==='zh'?'本句还没有已完成的口语练习。':'No completed Speak take for this segment yet.'));

  const failedRoot=rootFor();
  const failed=await renderListening(failedRoot,{importMedia:async()=>item.payload,targetLanguage:()=>item.language,speakingAttempts:async()=>{throw new Error('provider detail');}});
  await failed.importUrl(`https://example.test/failed-${item.language}`);
  assert.equal(failed.setMode('shadowing'),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(failedRoot.innerHTML,/data-speaking-feedback-state="error"/);
  assert.ok(failedRoot.innerHTML.includes(item.language==='zh'?'口语反馈暂时不可用':'Speak feedback is temporarily unavailable'));
  assert.doesNotMatch(failedRoot.innerHTML,/provider detail/);
}

console.log('R9 EN/ZH Shadowing latest matching Speaking feedback: PASS');
