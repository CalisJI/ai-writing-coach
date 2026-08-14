export const MEDIA_LEARNING_FIXTURE={
  asset:{
    asset_id:'asset-fixture-001',
    source_url:'https://www.youtube.com/watch?v=fixture0001',
    source_provider:'youtube',
    source_type:'external-video',
    title:'One shared media lesson',
    source_language:'en',
    duration_ms:12000,
    processing_state:'ready',
    transcript_available:true,
    translation_available:true,
  },
  playback:{provider:'youtube',kind:'embed',url:'https://www.youtube-nocookie.com/embed/fixture0001'},
  transcript:{
    asset_id:'asset-fixture-001',
    source_language:'en',
    segments:[
      {segment_id:'segment-001',order:0,start_ms:0,end_ms:4000,original_text:'Listen for the first complete idea.'},
      {segment_id:'segment-002',order:1,start_ms:4000,end_ms:8000,original_text:'The same segment can support shadowing later.'},
    ],
  },
  translations:[
    {segment_id:'segment-001',target_language:'vi',translated_meaning:'Hãy nghe ý hoàn chỉnh đầu tiên.'},
    {segment_id:'segment-002',target_language:'vi',translated_meaning:'Cùng đoạn này có thể dùng để luyện nói sau.'},
  ],
  translation:{
    status:'ready',
    target_language:'vi',
    source:{capability_key:'learner_translation',provider:'fake',request_count:1},
    failure_kind:null,
  },
};

export const MEDIA_LEARNING_ZH_FIXTURE={
  ...MEDIA_LEARNING_FIXTURE,
  asset:{...MEDIA_LEARNING_FIXTURE.asset,asset_id:'asset-fixture-zh',source_language:'zh',title:'共享媒体课程',translation_available:false},
  transcript:{
    asset_id:'asset-fixture-zh',
    source_language:'zh',
    segments:[
      {segment_id:'segment-zh-001',order:0,start_ms:0,end_ms:4000,original_text:'这是共享的原文字幕。'},
      {segment_id:'segment-zh-002',order:1,start_ms:4000,end_ms:8000,original_text:'下一句也使用同一个学习流程。'},
    ],
  },
  translations:[],
  translation:{status:'unavailable',target_language:'vi',source:null,failure_kind:'execution_unavailable'},
};
