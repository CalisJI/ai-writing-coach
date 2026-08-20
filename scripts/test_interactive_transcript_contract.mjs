import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyPlayingSegment} from '../static/becoming/components/interactive-transcript.js';

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

console.log('INTERACTIVE_TRANSCRIPT_CONTRACT=PASS');
