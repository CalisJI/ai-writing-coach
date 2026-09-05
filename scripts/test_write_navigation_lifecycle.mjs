import assert from 'node:assert/strict';
import {api} from '../static/becoming/api.js';
import {state} from '../static/becoming/store.js';
import {renderWrite} from '../static/becoming/screens/write.js';

const original=api.dashboard;
globalThis.localStorage={getItem:()=>null,setItem(){}};
try{
  for(const language of ['en','zh']){
    for(const failure of [false,true]){
      state.language=language;
      state.dashboard=null;
      state.draft={mode:'custom',level:language==='en'?'B2':'HSK4',length:language==='en'?150:80,topic:'random',text:'A real response',prompt:'Its original context'};
      let resolve,reject;
      api.dashboard=()=>new Promise((yes,no)=>{resolve=yes;reject=no;});
      const root={innerHTML:'Previous screen'};
      const pending=renderWrite(root);
      assert.equal(typeof root._cleanupScreen,'function');
      root._cleanupScreen();
      root.innerHTML='The newly opened Explore screen';
      if(failure)reject(new Error('unavailable'));else resolve({streak:9});
      await pending;
      assert.equal(root.innerHTML,'The newly opened Explore screen');
      assert.equal(state.dashboard,null,'Cancelled response must not cross language/route scope');
      assert.equal(state.draft.text,'A real response');
    }
  }
}finally{api.dashboard=original;}
console.log('EN/ZH Writing navigation lifecycle: PASS (late success and failure cannot overwrite the next screen)');
