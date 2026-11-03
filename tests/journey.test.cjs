require('./register.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createToolJourney}=require('../lib/tool-journey.ts');
const {toolEvent,analyticsQueue,testMode}=require('../lib/tool-events.ts');
const {toolObservation}=require('../lib/tool-observability.ts');
const {bootstrapAnalytics}=require('../lib/browser-analytics.ts');
function browser(){const calls=[],clarity=[],storage=new Map();global.window={location:{hostname:'rfpai.io',search:''},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},gtag:(...v)=>calls.push(v),clarity:(...v)=>clarity.push(v)};return {calls,clarity};}
test('journey preserves the success count, excludes private content, and records server timing',async()=>{
 const before=global.window,oldFetch=global.fetch;const {calls,clarity}=browser();let time=100;
 try{
  const j=createToolJourney('matrix','en',()=>time);j.view();j.selectFile({name:'secret-client-and-price.docx',size:700000});j.consent(true);j.begin();
  global.fetch=async()=>new Response('{}',{headers:{'x-rfpai-parse-ms':'50','x-rfpai-generation-ms':'1700'}});
  await j.request('/api/analyze',{});time=2100;j.success();j.success();j.edit('notes');j.edit('notes');j.exportBegin('xlsx_gov');time+=100;j.exportSuccess('xlsx_gov');
  const success=calls.filter(v=>v[1]==='tool_success');assert.equal(success.length,1);assert.equal(success[0][2].elapsed_ms,2000);assert.equal(success[0][2].parse_ms,50);assert.equal(success[0][2].generation_ms,1700);
  assert.equal(calls.filter(v=>v[1]==='tool_result_edit').length,1);assert.equal(calls.filter(v=>v[1]==='tool_download')[0][2].export_ms,100);
  assert.ok(!JSON.stringify([calls,clarity]).includes('secret-client'));assert.ok(!JSON.stringify(calls).includes('attempt'));
 }finally{global.window=before;global.fetch=oldFetch;}
});
test('rejected files, controlled waits and page exit are explicit and deduplicated',()=>{
 const before=global.window,{calls}=browser();let time=0;
 try{
  const j=createToolJourney('scanner','zh',()=>time);assert.equal(j.selectFile({name:'private.doc',size:4}),'UNSUPPORTED_FILE');assert.equal(j.selectFile({name:'private.pdf',size:5*1024*1024}),'FILE_TOO_LARGE');
  j.selectFile({name:'test.pdf',size:99});j.begin();time=31000;j.wait(false);assert.equal(calls.filter(v=>v[1]==='tool_wait').length,0);j.wait(true);j.wait(true);assert.equal(calls.filter(v=>v[1]==='tool_wait').length,2);
  j.exit();j.exit();assert.equal(calls.filter(v=>v[1]==='tool_exit').length,1);assert.equal(calls.find(v=>v[1]==='tool_exit')[2].phase,'processing');
  j.failure('MODEL_TIMEOUT');j.wait(true);assert.equal(calls.filter(v=>v[1]==='tool_success').length,0);
 }finally{global.window=before;}
});
test('network and provider errors use approved reasons, never raw error messages',async()=>{
 const before=global.window,oldFetch=global.fetch,{calls}=browser();
 try{
  const j=createToolJourney('writer','en');j.begin();global.fetch=async()=>new Response(JSON.stringify({code:'MODEL_TIMEOUT',error:'SECRET API key'}),{status:503});await j.request('/api/generate-bid',{});j.failure();
  j.begin();global.fetch=async()=>{throw new Error('confidential filename')};await assert.rejects(j.request('/api/generate-bid',{}));j.failure();
  assert.deepEqual(calls.filter(v=>v[1]==='tool_failure').map(v=>v[2].reason_code),['MODEL_TIMEOUT','NETWORK_ERROR']);assert.ok(!/SECRET|confidential/.test(JSON.stringify(calls)));
  toolEvent('scanner','failure',undefined,{reason_code:'PRIVATE',filename:'secret.pdf',elapsed_ms:-1,ui_language:'private'});const last=calls.at(-1)[2];assert.equal(last.reason_code,'UNKNOWN');assert.ok(!('filename'in last));assert.ok(!('elapsed_ms'in last));assert.ok(!('ui_language'in last));
 }finally{global.window=before;global.fetch=oldFetch;}
});
test('QA mode persists only within a tab, and the pre-load queue keeps working after the tag loads',()=>{
 const before=global.window;browser();
 try{window.location.search='?qa=1';assert.equal(testMode(),'qa');window.location.search='';assert.equal(testMode(),'qa');window.location.search='?qa=0';assert.equal(testMode(),'live');delete window.gtag;const w=analyticsQueue();for(let i=0;i<250;i++)w.gtag('event','x');assert.equal(w.dataLayer.length,200);w.rfpaiAnalyticsReady=true;w.gtag('event','x');assert.equal(w.dataLayer.length,201);}finally{global.window=before;}
});
test('server logs sanitize supplied IDs and reasons while preserving a valid per-attempt correlation',()=>{
 const info=console.info,logs=[];console.info=v=>logs.push(JSON.parse(v));
 try{
  const id='550e8400-e29b-41d4-a716-446655440000',o=toolObservation(new Request('https://rfpai.io/api/analyze',{headers:{'x-rfpai-attempt':id}}),'matrix');o.documentStart();o.generationStart();const headers=o.finish('MODEL_TIMEOUT');assert.equal(headers['x-rfpai-attempt'],id);assert.equal(logs[0].phase,'document');assert.equal(logs[1].phase,'generation');assert.equal(logs[1].reason_code,'MODEL_TIMEOUT');
  const bad=toolObservation(new Request('https://rfpai.io/api/analyze',{headers:{'x-rfpai-attempt':'private document'}}),'scanner');const b=bad.finish('private-message');assert.notEqual(b['x-rfpai-attempt'],'private document');assert.equal(logs.at(-1).reason_code,'UNKNOWN');assert.ok(!JSON.stringify(logs).includes('private'));
 }finally{console.info=info;}
});

test('a component that has left cannot count a late response as a displayed success',()=>{
 const before=global.window,{calls}=browser();
 try {const j=createToolJourney('writer','en');j.begin();j.exit();j.dispose();j.success();assert.equal(calls.filter(v=>v[1]==='tool_success').length,0);}finally{global.window=before;}
});
test('analytics scripts load once on production and never on preview, with configuration before events',()=>{
 const before=global.window,doc=global.document,{calls}=browser(),scripts=[];
 try {
  global.document={createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}};
  window.location.hostname='review.vercel.app';bootstrapAnalytics();assert.equal(scripts.length,0);
  window.location.hostname='rfpai.io';bootstrapAnalytics();bootstrapAnalytics();assert.equal(scripts.length,2);assert.ok(scripts[0].src.includes('G-4M4FRSZPJH'));assert.ok(scripts[1].src.includes('ui8gq59tt5'));
  toolEvent('matrix','view');assert.equal(calls.filter(v=>v[0]==='config').length,1);assert.ok(calls.findIndex(v=>v[0]==='config')<calls.findIndex(v=>v[0]==='event'));
 } finally {global.window=before;global.document=doc;}
});
test('blocked analytics initialization cannot crash the application',()=>{
 const before=global.window;browser();
 try {window.gtag=()=>{throw new Error('blocked tracker')};assert.doesNotThrow(()=>bootstrapAnalytics());assert.doesNotThrow(()=>toolEvent('writer','start'));}finally{global.window=before;}
});
