import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  clearSharedMediaSession,
  getSharedMediaSession,
  selectSharedMediaSegment,
  setSharedMediaSession,
} from '../static/becoming/domain/shared-media-session.js';
globalThis.AudioWorkletNode ??= class AudioWorkletNode {
  constructor(){
    this.port={postMessage(){}};
  }
  connect(){return this;}
  disconnect(){}
};

const {
  createLocalAudioRecorder,
  localAudioRecordingSupported,
}=await import('../static/becoming/components/audio-recorder.js');

const payload={
  asset:{asset_id:'asset-en'},
  transcript:{segments:[
    {segment_id:'s1',original_text:'First'},
    {segment_id:'s2',original_text:'Second'},
  ]},
};

assert.equal(setSharedMediaSession({
  learning_language:'en',
  payload,
  selected_segment_id:'s2',
}),true);
assert.equal(getSharedMediaSession('en').payload,payload);
assert.equal(getSharedMediaSession('en').selected_segment_id,'s2');
assert.equal(selectSharedMediaSegment('en','s1'),true);
assert.equal(getSharedMediaSession('en').selected_segment_id,'s1');
assert.equal(selectSharedMediaSegment('en','missing'),false);

assert.equal(setSharedMediaSession({
  learning_language:'zh',
  payload:{...payload,asset:{asset_id:'asset-zh'}},
}),true);
assert.equal(getSharedMediaSession('zh').payload.asset.asset_id,'asset-zh');
assert.equal(getSharedMediaSession('en').payload.asset.asset_id,'asset-en');
assert.equal(clearSharedMediaSession('en'),true);
assert.equal(getSharedMediaSession('en'),null);

let stoppedTracks=0;
const fakeStream={getTracks:()=>[{stop(){stoppedTracks+=1;}}]};
const mediaDevices={async getUserMedia(options){
  assert.deepEqual(options,{audio:true});
  return fakeStream;
}};
class FakeRecorder{
  constructor(stream){
    assert.equal(stream,fakeStream);
    this.listeners=new Map();
    this.mimeType='audio/webm';
    this.state='inactive';
  }
  addEventListener(name,handler){this.listeners.set(name,handler);}
  start(){this.state='recording';}
  stop(){
    this.listeners.get('dataavailable')?.({data:new Blob(['voice'],{type:'audio/webm'})});
    this.state='inactive';
    this.listeners.get('stop')?.();
  }
}
const revoked=[];
const URLApi={
  createObjectURL(){return 'blob:local-speaking-take';},
  revokeObjectURL(url){revoked.push(url);},
};

assert.equal(localAudioRecordingSupported({mediaDevices,Recorder:FakeRecorder}),true);
const speechMediaDevices={
  async getUserMedia(constraints){
    assert.equal(constraints?.audio?.echoCancellation?.ideal,true);
    assert.equal(constraints?.audio?.noiseSuppression?.ideal,false);
    assert.equal(constraints?.audio?.autoGainControl?.ideal,false);
    assert.equal(constraints?.audio?.channelCount?.ideal,1);
    // Reuse the legacy fake stream while validating the new recorder contract.
    return mediaDevices.getUserMedia({audio:true});
  },
};
const recorder=createLocalAudioRecorder({mediaDevices:speechMediaDevices,Recorder:FakeRecorder,URLApi});
assert.equal(await recorder.start(),true);
assert.equal(recorder.snapshot().status,'recording');
const take=await recorder.stop();
assert.equal(take.url,'blob:local-speaking-take');
assert.equal(take.size>0,true);
assert.equal(recorder.snapshot().status,'ready');
assert.equal(stoppedTracks,1);
assert.equal(recorder.discard(),true);
assert.deepEqual(revoked,['blob:local-speaking-take']);

const unsupported=createLocalAudioRecorder({mediaDevices:null,Recorder:null,URLApi});
assert.equal(await unsupported.start(),false);
assert.equal(unsupported.snapshot().status,'unsupported');

const speakingSource=readFileSync(
  new URL('../static/becoming/screens/speaking.js',import.meta.url),
  'utf8',
);
const apiSource=readFileSync(
  new URL('../static/becoming/api.js',import.meta.url),
  'utf8',
);
for(const forbidden of ['fetch(','FormData','XMLHttpRequest','pronunciation_evaluator','speaking_evaluator','accuracy_percent']){
  assert.equal(speakingSource.includes(forbidden),false,`forbidden direct Speaking Core coupling: ${forbidden}`);
}
assert.match(speakingSource,/data-speaking-record/);
assert.match(speakingSource,/data-speaking-stop/);
assert.match(speakingSource,/audio controls/);
assert.match(speakingSource,/getSharedMediaSession/);
assert.match(speakingSource,/transcribe=api\.transcribeSpeech/);
assert.match(speakingSource,/await transcribe\(/);
assert.match(apiSource,/transcribeSpeech:/);
assert.match(apiSource,/\/api\/speech\/transcribe/);
assert.match(apiSource,/new FormData\(\)/);

console.log('Speaking Core media/recording + ASR boundary: PASS');
