require('./register.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {toolEvent,resourceEvent}=require('../lib/tool-events.ts');
test('preview and localhost never emit business analytics',()=>{
 const previous=global.window,calls=[];
 try {for(const hostname of ['localhost','127.0.0.1','review.vercel.app']){global.window={location:{hostname},gtag:(...args)=>calls.push(args)};toolEvent('matrix','success');resourceEvent('gov_blank','zh');}assert.equal(calls.length,0);}finally{global.window=previous;}
});
test('production events contain only approved categories and analytics failures cannot break the tool',()=>{
 const previous=global.window,calls=[];
 try {
  global.window={location:{hostname:'rfpai.io'},gtag:(...args)=>calls.push(args)};
  toolEvent('writer','download','docx');resourceEvent('matrix_example','en');
  toolEvent('private-client.pdf','success');resourceEvent('secret filename','en');
  assert.deepEqual(calls.filter(v=>v[0]==='event'),[['event','tool_download',{tool:'writer',file_format:'docx',test_mode:'live'}],['event','rfpai_writer_download',{tool:'writer',file_format:'docx',test_mode:'live'}],['event','resource_download',{resource:'matrix_example',language:'en',test_mode:'live'}]]);
  global.window.gtag=()=>{throw new Error('blocked tracker')};assert.doesNotThrow(()=>toolEvent('scanner','success'));
 }finally{global.window=previous;}
});
