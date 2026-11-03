require('./register.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const XLSX=require('xlsx');
test('matrix Excel includes original requirement, page and unconfirmed status',()=>{
 const {buildMatrixWorkbook}=require('../lib/matrixExport.ts');
 const result=buildMatrixWorkbook('gov',[{requirementId:'1',requirementText:'必须保留日志180天',sourceSection:'第2.2条',sourcePage:2,complianceStatus:'',commentsNotes:'待确认'}]);
 const wb=XLSX.read(result,{type:'buffer'});
 const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
 const row=rows.find(row=>row.includes('必须保留日志180天'));
 assert.ok(row);assert.ok(row.includes(2));assert.ok(row.includes('待确认'));
});
