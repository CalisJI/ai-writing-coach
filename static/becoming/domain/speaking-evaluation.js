const TOKEN_PATTERN=/\p{Script=Han}|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

const normalized=value=>String(value||'').normalize('NFKC').toLocaleLowerCase();

export function speechLearningTokens(value){
  return Array.from(normalized(value).matchAll(TOKEN_PATTERN),match=>match[0]);
}

function lcsPairs(reference,heard){
  const dp=Array.from({length:reference.length+1},()=>Array(heard.length+1).fill(0));
  for(let i=1;i<=reference.length;i++){
    for(let j=1;j<=heard.length;j++){
      dp[i][j]=reference[i-1]===heard[j-1]
        ?dp[i-1][j-1]+1
        :Math.max(dp[i-1][j],dp[i][j-1]);
    }
  }
  const pairs=[];
  let i=reference.length,j=heard.length;
  while(i>0&&j>0){
    if(reference[i-1]===heard[j-1]){
      pairs.push([i-1,j-1]); i--; j--;
    }else if(dp[i-1][j]>=dp[i][j-1]) i--;
    else j--;
  }
  return pairs.reverse();
}

export function evaluateSpeechTranscript(referenceText,heardText){
  const referenceTokens=speechLearningTokens(referenceText);
  const heardTokens=speechLearningTokens(heardText);
  const pairs=lcsPairs(referenceTokens,heardTokens);
  const matchedReference=new Set(pairs.map(([i])=>i));
  const matchedHeard=new Set(pairs.map(([,j])=>j));
  const denominator=referenceTokens.length+heardTokens.length;
  return {
    content_match:denominator?Math.round((2*pairs.length/denominator)*100):0,
    matched_count:pairs.length,
    reference_count:referenceTokens.length,
    heard_count:heardTokens.length,
    missing_tokens:referenceTokens.filter((_,i)=>!matchedReference.has(i)),
    extra_tokens:heardTokens.filter((_,i)=>!matchedHeard.has(i)),
  };
}
