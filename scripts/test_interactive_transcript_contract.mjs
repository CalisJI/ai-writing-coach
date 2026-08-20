import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyPlayingSegment,applyPlayingWord} from '../static/becoming/components/interactive-transcript.js';

const interactive=readFileSync('static/becoming/components/interactive-transcript.js','utf8');
const player=readFileSync('static/becoming/components/media-player.js','utf8');

assert.equal(interactive.includes('new YT.Player'),false);
assert.equal(interactive.includes('infoDelivery'),false);
assert.equal(interactive.includes('getCurrentTime'),false);
assert.equal(interactive.includes("const fallback={pos:false,reading:false};"),true);
assert.equal(player.includes('new YT.Player'),true);
assert.equal(player.includes('getCurrentTime'),true);
assert.equal(player.includes("orena:media-time"),true);

function transcriptRow(segmentId){
  const classes=new Set();
  return {
    dataset:{segmentId,canonicalSegmentIds:segmentId},
    classList:{
      add:name=>classes.add(name),
      remove:name=>classes.delete(name),
      contains:name=>classes.has(name),
    },
  };
}
function transcriptRoot(rows){
  return {
    querySelectorAll(selector){
      if(selector==='.it-playing-segment')return rows.filter(row=>row.classList.contains('it-playing-segment'));
      if(selector==='[data-segment-id]')return rows;
      return [];
    },
  };
}

const firstRow=transcriptRow('segment-A');
applyPlayingSegment(transcriptRoot([firstRow]),'segment-A');
assert.equal(firstRow.classList.contains('it-playing-segment'),true);
const rebuiltRow=transcriptRow('segment-A');
applyPlayingSegment(transcriptRoot([rebuiltRow]),'segment-A');
assert.equal(rebuiltRow.classList.contains('it-playing-segment'),true);

function timedToken(startMs,endMs,active=false){
  const classes=new Set(active?['it-speaking-word']:[]);
  return {
    dataset:{startMs:String(startMs),endMs:String(endMs)},
    classList:{
      add:name=>classes.add(name),
      remove:name=>classes.delete(name),
      contains:name=>classes.has(name),
    },
  };
}
function timedContainer(owner,tokens){
  return {
    closest:selector=>selector==='[data-segment-id]'?owner:null,
    querySelectorAll:selector=>selector==='[data-start-ms][data-end-ms]'?tokens:[],
  };
}
const groupedOwner={dataset:{segmentId:'display-unit-a',canonicalSegmentIds:'segment-A segment-B'}};
const firstWord=timedToken(0,450,true);
const secondWord=timedToken(500,950);
const wordRoot={
  querySelectorAll(selector){
    if(selector==='[data-start-ms][data-end-ms].it-speaking-word')return [firstWord,secondWord].filter(token=>token.classList.contains('it-speaking-word'));
    if(selector.includes('.listening-token-line'))return [timedContainer(groupedOwner,[firstWord,secondWord])];
    return [];
  },
};
applyPlayingWord(wordRoot,600,'segment-B');
assert.equal(firstWord.classList.contains('it-speaking-word'),false);
assert.equal(secondWord.classList.contains('it-speaking-word'),true);
applyPlayingWord(wordRoot,1200,'segment-B');
assert.equal(secondWord.classList.contains('it-speaking-word'),false);

console.log('INTERACTIVE_TRANSCRIPT_CONTRACT=PASS');
