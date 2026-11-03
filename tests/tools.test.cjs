require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readDocument } = require('../lib/document-input.ts');
const { consistencyErrors } = require('../lib/evidence.ts');
const { complete, jsonResult, errorResponse } = require('../lib/free-ai.ts');
const { extractComplianceMatrix, generateBidDraftFromRfp } = require('../lib/gemini.ts');
const fixtures = path.join(__dirname, 'fixtures');
let calls = [];
let modelReply = { choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { cost: 0 } };
let remaining = 999;
global.fetch = async (url, options) => {
  if (url.endsWith('/models')) return Response.json({ data: [{ id: 'nvidia/nemotron-3.5-super-vl:free', pricing: { prompt: '0', completion: '0' } }] });
  if (url.endsWith('/key')) return Response.json({ data: { free_model_daily_requests: { limit: 1000, remaining } } });
  calls.push(JSON.parse(options.body));
  return Response.json(modelReply);
};
process.env.OPENROUTER_API_KEY = 'unit-test-placeholder';
const reply = data => { modelReply = { choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) } }], usage: { cost: 0 } }; };

test('English bid detects eight conflict fields and missing authorization with English feedback', async()=>{
 const doc=await readDocument(new File([fs.readFileSync(path.join(fixtures,'bid-errors-en.docx'))],'bid.docx'));
 const errors=consistencyErrors(doc.text,[],'en');assert.equal(errors.length,9);
 for(const id of ['PROJECT','COMPANY','PRICE','DELIVERY','VALIDITY','WARRANTY','RESPONSE','RESOLUTION'])assert.ok(errors.some(e=>e.rule_id==='CONSISTENCY_'+id));
 assert.ok(errors.every(e=>e.page_no===0));assert.ok(errors.every(e=>!/[\u4e00-\u9fff]/.test(e.title+e.suggestion)));
 assert.equal(consistencyErrors('Total price: USD 120,000\nFinal total price: USD 120000\nWarranty: 3 years\nWarranty: 36 months',[],'en').length,0);
});

test('grounded USD model facts retain their numeric values',()=>{
 const text='Offer A is USD 120000\nOffer B is USD 130000';
 const facts=[{field:'price',value:'USD 120000',quote:'Offer A is USD 120000'},{field:'price',value:'USD 130000',quote:'Offer B is USD 130000'}];
 assert.equal(consistencyErrors(text,facts,'en').length,1);
});

test('grounded model facts are merged per occurrence instead of dropping an entire matched field',()=>{
 const text='项目编号：ABC-1。项目编号为ABC-2。';
 const result=consistencyErrors(text,[{field:'project',value:'ABC-1',quote:'项目编号：ABC-1'},{field:'project',value:'ABC-2',quote:'项目编号为ABC-2'}]);
 assert.equal(result.length,1);assert.equal(result[0].rule_id,'CONSISTENCY_PROJECT');
 const company='投标人：演示科技有限公司（虚构）';
 assert.equal(consistencyErrors(company,[{field:'company',value:'演示科技有限公司（虚构）',quote:company}]).length,0);
 const warranty='质保期限：36个月。质保期限为3年。';
 assert.equal(consistencyErrors(warranty,[{field:'warranty',value:'3年',quote:'质保期限为3年'}]).length,0);
});

test('validity duration does not absorb delivery deadlines in the same sentence',()=>{
 assert.equal(consistencyErrors('投标有效期90日，交付期限30天。').length,0);
 const result=consistencyErrors('投标有效期：自2026年11月20日起90日。投标有效期为60日，交付期限30天。');
 assert.equal(result.length,1);assert.equal(result[0].rule_id,'CONSISTENCY_VALIDITY');assert.match(result[0].suggestion,/90 \/ 60/);
});

test('component subtotals mislabeled by the model do not conflict with a correct grand total',()=>{
 const text='含税总报价为120000元。软件服务小计100000元，实施服务小计20000元。';
 const facts=[{field:'price',value:'100000元',quote:'软件服务小计100000元'},{field:'price',value:'20000元',quote:'实施服务小计20000元'}];
 assert.equal(consistencyErrors(text,facts).length,0);
 const together='总报价120000元，软件小计100000元，实施小计20000元';
 assert.equal(consistencyErrors(together,[{field:'price',value:'100000元',quote:together},{field:'price',value:'20000元',quote:together}]).length,0);
 const english='Total price: USD 120000\nSoftware subtotal: USD 100000\nDelivery subtotal: USD 20000';
 assert.equal(consistencyErrors(english,[{field:'price',value:'USD 100000',quote:'Software subtotal: USD 100000'},{field:'price',value:'USD 20000',quote:'Delivery subtotal: USD 20000'}],'en').length,0);
 assert.ok(consistencyErrors('总报价130000元。软件服务小计100000元，实施服务小计20000元。',facts).some(e=>e.rule_id==='PRICE_ARITHMETIC'));
});

test('malformed factual items and covered requirements without evidence fail closed',async()=>{
 const {analyzeWithGemini,compareRfpAndBid}=require('../lib/gemini.ts');
 const text='This is a synthetic procurement document containing sufficiently long public test material. '.repeat(2);
 reply({facts:[{field:'price',value:null,quote:'invalid'}]});await assert.rejects(analyzeWithGemini(text),e=>e.code==='INVALID_AI_RESULT');
 reply({items:[{requirement_id:'1',status:'covered',evidence:'',comment:'assumed'}]});await assert.rejects(compareRfpAndBid([{requirementId:'1',requirementText:'Must provide evidence.'}],text),e=>e.code==='INVALID_AI_RESULT');
});

test('matrix section labels must directly locate the quoted clause',async()=>{
 const text='[PAGE 1]\n第1.1条 系统必须保留日志180天。\n第2.1条 背景说明。'+'公开虚构测试材料。'.repeat(10);
 reply({items:[{requirementText:'系统必须保留日志180天。',sourceSection:'第2.1条'}]});
 const result=await extractComplianceMatrix(text);assert.equal(result.items[0].sourceSection,'');assert.equal(result.items[0].sourcePage,1);
});

test('PDF source markers and eight planted issue categories, without known false positives', async () => {
  const file = new File([fs.readFileSync(path.join(fixtures, 'bid-errors.pdf'))], 'bid.pdf');
  const doc = await readDocument(file);
  assert.equal(doc.pages, 2); assert.match(doc.text, /\[PAGE 2\]/);
  const errors = consistencyErrors(doc.text);
  const ids = errors.map(e => e.rule_id);
  for (const id of ['PROJECT','COMPANY','PRICE','DELIVERY','VALIDITY','WARRANTY','RESPONSE','RESOLUTION']) assert.ok(ids.includes('CONSISTENCY_' + id), id);
  assert.ok(ids.includes('MISSING_AUTHORIZATION'));
  assert.ok(errors.every(e => e.page_no > 0));
  assert.ok(errors.every(e => !/错别字|页码/.test(e.title)));
});

test('consistent and standalone values do not produce contradictions', () => {
  assert.deepEqual(consistencyErrors('[PAGE 1]\n项目编号：DEMO-5。投标人：甲有限公司。投标有效期90日。交付期限30天。质保36个月。2小时内响应。'), []);
  assert.deepEqual(consistencyErrors('投标人：甲有限公司。投标人：甲有限公司。'), []);
});

test('arithmetic check computes totals instead of asking the model', () => {
  const errors = consistencyErrors('[PAGE 1]\n软件小计100元。服务小计20元。总报价为130元。');
  assert.equal(errors[0].rule_id, 'PRICE_ARITHMETIC'); assert.match(errors[0].suggestion, /120/);
});

test('unsupported, damaged, oversized and overlength documents fail explicitly', async () => {
  await assert.rejects(readDocument(new File(['text'], 'file.doc')), e => e.code === 'UNSUPPORTED_FILE');
  await assert.rejects(readDocument(new File(['bad pdf'], 'file.pdf')), e => e.code === 'INVALID_DOCUMENT');
  await assert.rejects(readDocument(new File([Buffer.alloc(4 * 1024 * 1024 + 1)], 'file.pdf')), e => e.code === 'FILE_TOO_LARGE');
  await assert.rejects(extractComplianceMatrix('必须满足要求。'.repeat(10000)), e => e.code === 'DOCUMENT_TOO_LONG');
});

test('paid client/model configuration cannot bypass the free-only policy', async () => {
  process.env.RFP_SCAN_MODEL = 'openai/gpt-5';
  const before = calls.length;
  await assert.rejects(complete('SCAN', 'test', true), e => e.code === 'FREE_MODEL_REQUIRED');
  assert.equal(calls.length, before); delete process.env.RFP_SCAN_MODEL;
});

test('truncated, empty and malformed model output never becomes a clean report', async () => {
  modelReply = { choices: [{ finish_reason: 'length', message: { content: '{"errors":[]}' } }] };
  await assert.rejects(complete('SCAN', 'test', true), e => e.code === 'INVALID_AI_RESULT');
  modelReply = { choices: [{ finish_reason: 'stop', message: { content: '' } }] };
  await assert.rejects(complete('SCAN', 'test', true), e => e.code === 'INVALID_AI_RESULT');
  modelReply = { choices: [{ finish_reason: 'stop', message: { content: '{incomplete' } }] };
  await assert.rejects(jsonResult('SCAN', 'test'), e => e.code === 'INVALID_AI_RESULT');
});

test('free quota reserve blocks before generating', async () => {
  remaining = 200; const before = calls.length;
  await assert.rejects(complete('SCAN', 'test', true), e => e.code === 'FREE_DAILY_QUOTA');
  assert.equal(calls.length, before); remaining = 999;
});

test('matrix quotes and pages are verified against source rather than model page guesses', async () => {
  const text = '[PAGE 1]\n项目背景说明，用于一个真实文档的模拟测试。'.repeat(3) + '\n[PAGE 2]\n第2.1条 系统必须保存日志180天。';
  reply({ items: [{ requirementText: '系统必须保存日志180天。', sourceSection: '第2.1条', sourcePage: 99 }] });
  const result = await extractComplianceMatrix(text); assert.equal(result.items[0].sourcePage, 2);
  reply({ items: [{ requirementText: '必须支付保证金100万元。' }] });
  await assert.rejects(extractComplianceMatrix(text), e => e.code === 'INVALID_AI_RESULT');
});

test('unknown internal errors do not leak credentials or text', () => {
  const safe = errorResponse(new Error('sk-secret document customer value'), 'zh');
  assert.ok(!JSON.stringify(safe).includes('sk-secret'));
});

test('missing public-material consent is rejected before model traffic', async () => {
  const { NextRequest } = require('next/server');
  const before = calls.length;
  for (const route of ['analyze','generate-bid','bid-compare']) {
    const { POST } = require(`../app/api/${route}/route.ts`);
    const form = new FormData();form.set('file', new File(['public test'], 'file.pdf'));
    const response = await POST(new NextRequest(`http://test/api/${route}`, { method: 'POST', body: form }));
    assert.equal(response.status, 403);assert.equal((await response.json()).code,'CONSENT_REQUIRED');assert.equal(calls.length,before);
  }
});

test('generated Word preserves visible placeholders and all table columns', async () => {
  const { POST } = require('../app/api/bid-draft-docx/route.ts');
  const { NextRequest } = require('next/server');
  const mammoth = require('mammoth');
  const content = '# 投标草稿\n\n[结构需根据招标文件最终确认]\n\n投标人：[需用户填写]\n\n| ID | 要求 | 来源 | 状态 |\n| --- | --- | --- | --- |\n| 1 | 必须保留日志180天 | | 待确认 |\n' + '这是必须由投标人补齐并核实的资料。';
  const response = await POST(new NextRequest('http://test/api/bid-draft-docx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) }));
  assert.equal(response.status, 200);
  const text = (await mammoth.extractRawText({ buffer: Buffer.from(await response.arrayBuffer()) })).value;
  assert.match(text, /需用户填写/); assert.match(text, /日志180天/); assert.match(text, /待确认/);
});
