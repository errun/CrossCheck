require('./register.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const XLSX=require('xlsx');
test('checklist CSV escapes every user-controlled column and preserves document locations', async()=>{
 const {POST}=require('../app/api/export/route.ts');
 const {NextRequest}=require('next/server');
 const response=await POST(new NextRequest('http://test/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({errors:[{priority:'P1',rule_id:'=1+1',title:'@SUM(1,2)',snippet:'text,"quoted"',suggestion:'\t=1+1',confidence:1,page_no:0}]})}));
 assert.equal(response.status,200);
 const csv=await response.text();
 assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"\'@SUM(1,2)"'));
 assert.ok(csv.includes('"text,""quoted"""'));assert.ok(csv.includes('"\'\t=1+1"'));
 assert.ok(csv.includes('原文段落'));assert.ok(!csv.includes('第0页'));
});
test('matrix Excel includes original requirement, page and unconfirmed status',()=>{
 const {buildMatrixWorkbook}=require('../lib/matrixExport.ts');
 const result=buildMatrixWorkbook('gov',[{requirementId:'1',requirementText:'必须保留日志180天',sourceSection:'第2.2条',sourcePage:2,complianceStatus:'',commentsNotes:'待确认'}]);
 const wb=XLSX.read(result,{type:'buffer'});
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
 const row=rows.find(row=>row.includes('必须保留日志180天'));
 assert.ok(row);assert.ok(row.includes(2));assert.ok(row.includes('待确认'));
});
test('enterprise Excel preserves edited status, source page and notes',()=>{
 const {buildMatrixWorkbook}=require('../lib/matrixExport.ts');
 const result=buildMatrixWorkbook('enterprise',[{requirementId:'1',requirementText:'必须提供营业执照',sourceSection:'第1.1条',sourcePage:2,complianceStatus:'Partial',commentsNotes:'附件待补充'}]);
 const wb=XLSX.read(result,{type:'buffer'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
 const row=rows.find(row=>row.includes('必须提供营业执照'));
 assert.ok(rows[0].includes('Source Page'));assert.ok(rows[0].includes('Compliance Status'));
 assert.ok(row.includes('Partial'));assert.ok(row.includes(2));assert.ok(row.includes('附件待补充'));
});
