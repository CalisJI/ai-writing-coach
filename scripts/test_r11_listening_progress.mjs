import assert from 'node:assert/strict';

import {MEDIA_LEARNING_FIXTURE,MEDIA_LEARNING_ZH_FIXTURE} from '../tests/fixtures/media-learning.js';
import {renderListening} from '../static/becoming/screens/listening.js';
import {state} from '../static/becoming/store.js';

if(!globalThis.Element)globalThis.Element=Object;
if(!globalThis.HTMLIFrameElement)globalThis.HTMLIFrameElement=class {};
if(!globalThis.document)globalThis.document={documentElement:{},getElementById(){return null;},addEventListener(){}};
globalThis.addEventListener=()=>{};
globalThis.removeEventListener=()=>{};
globalThis.fetch=async()=>({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({items:[]})});

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

const previousMe=state.me;
const previousLanguage=state.language;
const previousSupport=state.supportLanguage;
try{
  for(const item of [
    {language:'en',payload:MEDIA_LEARNING_FIXTURE,restored:'Previous progress restored for this lesson.',empty:'No saved listening progress for this lesson yet.',unavailable:'Saved listening progress is unavailable here.'},
    {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE,restored:'已恢复本课之前的练习进度。',empty:'本课还没有已保存的听力进度。',unavailable:'当前无法使用已保存的听力进度。'},
  ]){
    state.language=item.language;
    state.supportLanguage=item.language;
    state.me={id:`learner-${item.language}`};
    let loadedAsset='';
    const saved=[];
    const root=rootFor();
    const controller=await renderListening(root,{
      importMedia:async()=>item.payload,
      targetLanguage:()=>item.language,
      loadListeningProgress:async assetId=>{
        loadedAsset=assetId;
        return {items:[
          {asset_id:assetId,segment_id:item.payload.transcript.segments[0].segment_id,presentation:'checked',revealed:false,checked_attempt_count:2,best_accuracy_percent:84,best_exact:false,last_answer:item.language==='zh'?'你好。':'Good morning.'},
          {asset_id:assetId,segment_id:item.payload.transcript.segments[1].segment_id,presentation:'checked',revealed:false,checked_attempt_count:1,best_accuracy_percent:72,best_exact:false,last_answer:item.language==='zh'?'下一句。':'The next sentence.'},
        ]};
      },
      saveListeningProgress:async payload=>{saved.push({...payload});return {item:payload};},
    });
    await controller.importUrl(`https://example.test/${item.language}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(loadedAsset,item.payload.asset.asset_id);
    assert.equal(controller.model.practiceSession.segments[item.payload.transcript.segments[0].segment_id].checked_attempt_count,2);
    assert.equal(controller.setMode('active'),true);
    assert.ok(controller.html().includes(item.restored),`${item.language} restored state is localized`);
    assert.ok(controller.html().includes('84%'),`${item.language} restored text match is visible`);
    assert.equal(controller.select(item.payload.transcript.segments[1].segment_id),true);
    assert.equal(controller.model.practicePersistence.status,'restored');
    assert.ok(controller.html().includes('72%'),`${item.language} second restored segment remains visible after navigation`);
    assert.equal(controller.select(item.payload.transcript.segments[0].segment_id),true);
    controller.setPracticeDraft(item.payload.transcript.segments[0].original_text);
    assert.equal(controller.checkPractice(),true);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(saved.at(-1).asset_id,item.payload.asset.asset_id);
    assert.equal(saved.at(-1).segment_id,item.payload.transcript.segments[0].segment_id);
    assert.equal(saved.at(-1).presentation,'checked');
    assert.equal(saved.at(-1).checked_attempt_count,3);
    assert.equal(saved.at(-1).best_accuracy_percent,100);
    controller.revealPractice();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(saved.at(-1).presentation,'revealed');
    assert.equal(saved.at(-1).revealed,true);
    controller.retryPractice();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(saved.at(-1).presentation,'prompt');
    assert.equal(saved.at(-1).revealed,false);
    assert.equal(saved.at(-1).last_answer,'');
    const reopenedRoot=rootFor();
    const reopened=await renderListening(reopenedRoot,{
      importMedia:async()=>item.payload,
      targetLanguage:()=>item.language,
      loadListeningProgress:async()=>({items:[saved.at(-1)]}),
    });
    await reopened.importUrl(`https://example.test/reopen-${item.language}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(reopened.setMode('active'),true);
    const reopenedState=reopened.model.practiceSession.segments[item.payload.transcript.segments[0].segment_id];
    assert.equal(reopenedState.presentation,'prompt');
    assert.equal(reopenedState.draft,'');
    assert.equal(reopenedState.last_attempt,null);
    assert.equal(reopenedState.checked_attempt_count,3);
    assert.equal(reopenedState.best_result.accuracy_percent,100);
    assert.ok(reopened.html().includes(item.restored),`${item.language} retry state restores without stale answer`);
  }

  for(const item of [
    {language:'en',payload:MEDIA_LEARNING_FIXTURE},
    {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE},
  ]){
    state.language=item.language;
    state.supportLanguage=item.language;
    state.me={id:`learner-delay-${item.language}`};
    const pending=[];
    const delayedRoot=rootFor();
    const delayed=await renderListening(delayedRoot,{
      importMedia:async()=>item.payload,
      targetLanguage:()=>item.language,
      loadListeningProgress:async()=>({items:[]}),
      saveListeningProgress:payload=>new Promise(resolve=>pending.push({payload,resolve})),
    });
    await delayed.importUrl(`https://example.test/delay-${item.language}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(delayed.setMode('active'),true);
    const segment=item.payload.transcript.segments[0];
    delayed.setPracticeDraft(segment.original_text);
    assert.equal(delayed.checkPractice(),true);
    delayed.revealPractice();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(pending.length,1,'later save waits for the earlier save');
    assert.equal(pending[0].payload.presentation,'checked');
    pending[0].resolve({item:pending[0].payload});
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(pending.length,2,'queued save starts after the prior response');
    assert.equal(pending[1].payload.presentation,'revealed');
    pending[1].resolve({item:pending[1].payload});
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(delayed.model.practicePersistence.status,'saved');
  }

  for(const item of [
    {language:'en',payload:MEDIA_LEARNING_FIXTURE},
    {language:'zh',payload:MEDIA_LEARNING_ZH_FIXTURE},
  ]){
    state.language=item.language;
    state.supportLanguage=item.language;
    state.me={id:`learner-cross-segment-${item.language}`};
    const pending=[];
    const cross=await renderListening(rootFor(),{
      importMedia:async()=>item.payload,
      targetLanguage:()=>item.language,
      loadListeningProgress:async()=>({items:[]}),
      saveListeningProgress:payload=>new Promise(resolve=>pending.push({payload,resolve})),
    });
    await cross.importUrl(`https://example.test/cross-${item.language}`);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(cross.setMode('active'),true);
    const first=item.payload.transcript.segments[0];
    const second=item.payload.transcript.segments[1];
    cross.setPracticeDraft(first.original_text);
    assert.equal(cross.checkPractice(),true);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(pending.length,1);
    assert.equal(cross.select(second.segment_id),true);
    cross.setPracticeDraft(second.original_text);
    assert.equal(cross.checkPractice(),true);
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(pending.length,2);
    assert.equal(pending[0].payload.segment_id,first.segment_id);
    assert.equal(pending[1].payload.segment_id,second.segment_id);
    pending[0].resolve({item:pending[0].payload});
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(cross.model.practicePersistence.status,'saving','segment A completion cannot mark segment B saved');
    assert.ok(cross.html().includes(item.language==='zh'?'正在保存听力进度…':'Saving listening progress…'));
    pending[1].resolve({item:pending[1].payload});
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(cross.model.practicePersistence.status,'saved');
  }

  state.language='en';
  state.supportLanguage='en';
  state.me={id:'learner-empty'};
  const emptyRoot=rootFor();
  const empty=await renderListening(emptyRoot,{importMedia:async()=>MEDIA_LEARNING_FIXTURE,targetLanguage:()=> 'en',loadListeningProgress:async()=>({items:[]})});
  await empty.importUrl('https://example.test/empty');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(empty.setMode('active'),true);
  assert.ok(empty.html().includes('No saved listening progress for this lesson yet.'));

  const unavailableRoot=rootFor();
  const unavailable=await renderListening(unavailableRoot,{importMedia:async()=>MEDIA_LEARNING_FIXTURE,targetLanguage:()=> 'en',loadListeningProgress:async()=>{throw new Error('database detail');}});
  await unavailable.importUrl('https://example.test/unavailable');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(unavailable.setMode('active'),true);
  assert.ok(unavailable.html().includes('Saved listening progress is unavailable here.'));
  assert.doesNotMatch(unavailable.html(),/database detail/);
  assert.equal(unavailable.select(MEDIA_LEARNING_FIXTURE.transcript.segments[1].segment_id),true);
  assert.ok(unavailable.html().includes('Saved listening progress is unavailable here.'),'load failure remains unavailable after segment navigation');
  assert.doesNotMatch(unavailable.html(),/database detail/);

  const failedRoot=rootFor();
  const failed=await renderListening(failedRoot,{importMedia:async()=>MEDIA_LEARNING_FIXTURE,targetLanguage:()=> 'en',loadListeningProgress:async()=>({items:[]}),saveListeningProgress:async()=>{throw new Error('database detail');}});
  await failed.importUrl('https://example.test/failed');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(failed.setMode('active'),true);
  failed.setPracticeDraft('Good morning.');
  assert.equal(failed.checkPractice(),true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(failed.html().includes('Listening progress could not be saved.'));
  assert.doesNotMatch(failed.html(),/database detail/);
}finally{
  state.me=previousMe;
  state.language=previousLanguage;
  state.supportLanguage=previousSupport;
}

console.log('R11 EN/ZH durable Active Listening progress: PASS');
