import type { BidComparisonItem, BidComparisonSummary, BidDraft, ErrorItem, Language, MatrixItem } from '@/types';
import { jsonResult, invalidResult, ToolError } from './free-ai';
import { compact, consistencyErrors, Fact, sourcePage } from './evidence';

function checkText(text: string) {
  if (!text || text.trim().length < 80) throw new ToolError('NO_DOCUMENT_TEXT', 422, '文件中没有足够的可读取文字。', 'The document contains too little readable text.');
  if (text.length > 60_000) throw new ToolError('DOCUMENT_TOO_LONG', 413, '文件超过6万字符，请拆分后处理；本次未截断内容。', 'The document exceeds 60,000 characters. Split it; no content was truncated.');
}

export async function analyzeWithGemini(text: string, _model = 'default', lang: Language = 'zh'): Promise<{ errors: ErrorItem[] }> {
  checkText(text);
  const result = await jsonResult('SCAN', `Extract explicit labelled factual claims from this bid document. Do not correct spelling, style or formatting. Do not decide which conflicting claim is true.
Return JSON {"facts":[{"field":"project|company|price|delivery|validity|warranty|response|resolution","value":"exact written value","quote":"exact continuous source excerpt"}]}.
Extract EVERY occurrence of project identifiers, bidder legal names, total prices, delivery durations, bid validity durations, warranty durations, incident response and resolution times. Exclude dates from durations. Only quoted evidence, no inferred requirements. Keep values and quotes in the document's language. Output language: ${lang}.
<document>\n${text}\n</document>`);
  if (!Array.isArray(result.facts)) invalidResult();
  if (result.facts.some((f: any) => !f || !['project', 'company', 'price', 'delivery', 'validity', 'warranty', 'response', 'resolution'].includes(f.field) || typeof f.value !== 'string' || !f.value.trim() || typeof f.quote !== 'string' || !f.quote.trim())) invalidResult();
  const facts: Fact[] = result.facts;
  return { errors: consistencyErrors(text, facts, lang) };
}

export async function extractComplianceMatrix(text: string, _model = 'default', lang: Language = 'zh'): Promise<{ items: MatrixItem[] }> {
  checkText(text);
  const result = await jsonResult('MATRIX', `Extract ALL mandatory procurement requirements from the entire document, including must, shall, required, must not, 必须、应当、应、不得、不接受. Exclude optional suggestions, examples, background and explicitly non-mandatory statements. Do not split a numbered clause or combine different numbered clauses. Never infer supplier compliance.
Return JSON {"items":[{"requirementText":"exact full clause without its clause number","sourceSection":"exact clause label"}]}.
Preserve the source language, numbers, conditions and negations. Each requirementText must be an exact continuous excerpt (whitespace may differ). Return empty items if there are no mandatory requirements. Output language: ${lang}.
<document>\n${text}\n</document>`);
  if (!Array.isArray(result.items) || !result.items.length) invalidResult();
  const seen = new Set<string>();
  const items: MatrixItem[] = [];
  for (const raw of result.items) {
    if (typeof raw?.requirementText !== 'string' || raw.requirementText.length < 5) invalidResult();
    const quote = raw.requirementText.trim();
    const page = sourcePage(text, quote);
    if (page < 0 || !/(必须|应|不得|不接受|须|\bmust\b|\bshall\b|\brequired\b|\bmandatory\b)/i.test(quote)) invalidResult();
    const key = compact(quote);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ requirementId: String(items.length + 1), requirementText: quote, sourceSection: typeof raw.sourceSection === 'string' && compact(text).includes(compact(raw.sourceSection) + compact(quote)) ? raw.sourceSection : '', sourcePage: page || null, complianceStatus: '', commentsNotes: lang === 'zh' ? '待投标人核实并填写响应证据' : 'Bidder confirmation and evidence required' });
  }
  return { items };
}

export async function generateBidDraftFromRfp(text: string, _model = 'default', lang: Language = 'zh'): Promise<BidDraft> {
  checkText(text);
  const { items } = await extractComplianceMatrix(text, 'default', lang);
  const result = await jsonResult('DRAFT', `Write a proposed implementation plan for the procurement below. Return JSON {"plan":"plain text, at most 800 words"}.
Use ${lang === 'zh' ? 'Chinese' : 'English'}. Use proposed action wording (拟开展、建议安排), not repetitive uncertain wording (可能、may). Describe concrete implementation phases rather than repeating cover forms or background. This is a proposed plan for bidder review, NOT a verified capability or commitment. Do not include qualifications, supplier names, signatures, deposits, prices, attachments or compliance declarations. Do not say materials are already supplied, qualifications held or clauses fully compliant. Never invent legal conditions. Preserve mandatory numerical requirements if mentioned. No preamble or meta-instructions.
<document>\n${text}\n</document>`);
  if (typeof result.plan !== 'string' || result.plan.trim().length < 80) invalidResult();
  const plan = result.plan.trim();
  if (/已提供|已取得|已提交|完全响应|无偏离|fully compliant|already (?:provided|submitted)|guarantee bond|投标保证金/i.test(plan)) invalidResult();
  const name = text.match(/(?:项目名称|Project name)\s*[:：]\s*([^\n。]+)/i)?.[1] || text.split('\n').find(line => /招标文件|request for proposal/i.test(line))?.replace(/招标文件|request for proposal/ig, '').trim() || (lang === 'zh' ? '[项目名称需用户填写]' : '[Project name required]');
  const projectId = text.match(/(?:项目编号|Project (?:ID|number))\s*[:：]\s*([A-Za-z0-9_-]+)/i)?.[1] || (lang === 'zh' ? '[需用户填写]' : '[To be completed]');
  const clean = (s: string) => s.replace(/\|/g, '／').replace(/[\r\n]+/g, ' ');
  const zh = lang === 'zh';
  const heading = zh ? '# 投标文件草稿\n\n[结构需根据招标文件最终确认]\n\n这是待填写和审核的草稿。以下响应状态均待确认，不代表已具备资格、已提供附件或已作出承诺。' : '# Bid proposal draft\n\n[Structure must be confirmed against the final RFP]\n\nThis draft requires bidder completion and review. No qualification, attachment or compliance is verified.';
  const rows = items.map(i => `| ${i.requirementId} | ${clean(i.requirementText)} | ${clean(i.sourceSection || '')}${i.sourcePage ? ` / p.${i.sourcePage}` : ''} | ${zh ? '待确认；响应依据待填写' : 'Pending confirmation and evidence'} |`).join('\n');
  return { content: `${heading}\n\n${zh ? '项目' : 'Project'}：${name}\n\n${zh ? '项目编号' : 'Project ID'}：${projectId}\n\n## ${zh ? '投标人资料与报价' : 'Bidder details and quotation'}\n\n${zh ? '投标人名称：[需用户填写]\n\n法定代表人及授权代表：[需用户填写]\n\n含税总报价与分项报价：[需用户填写]\n\n资格证照、授权书、签章与附件：[待提供并核验，不代表已齐全]' : 'Bidder legal name: [To be completed]\n\nLegal and authorized representatives: [To be completed]\n\nTotal and itemized prices: [To be completed]\n\nQualifications, authorization, signatures and attachments: [To be supplied and verified]'}\n\n## ${zh ? '要求与响应核对表' : 'Requirements and response checklist'}\n\n| ID | ${zh ? '招标要求原文 | 来源 | 响应状态' : 'Original requirement | Source | Response status'} |\n| --- | --- | --- | --- |\n${rows}\n\n## ${zh ? '建议实施方案 需投标人核实' : 'Proposed implementation plan for bidder review'}\n\n${plan}\n\n## ${zh ? '提交前检查' : 'Before submission'}\n\n${zh ? '逐项补齐资料和附件，确认实际响应与偏离；核对报价、有效期、交付期限、质保与验收要求。未完成的项目保持待确认状态。' : 'Supply and verify every required document, quotation and deviation. Confirm delivery, validity, warranty and acceptance requirements. Leave unresolved items pending.'}\n` };
}

export async function compareRfpAndBid(requirements: MatrixItem[], text: string, _model = 'default', lang: Language = 'zh'): Promise<{ items: BidComparisonItem[]; summary: BidComparisonSummary }> {
  checkText(text);
  const response = await jsonResult('SCAN', `Compare the requirements with the bid. Return JSON {"items":[{"requirement_id":"original ID","status":"covered|partially_covered|missing","evidence":"exact bid excerpt or empty","comment":"brief reason"}]}. Return one item per requirement. Do not assume a claim proves a qualification. Use ${lang}.\n<requirements>${JSON.stringify(requirements)}</requirements>\n<bid>${text}</bid>`);
  if (!Array.isArray(response.items) || response.items.length !== requirements.length) invalidResult();
  const items: BidComparisonItem[] = requirements.map((requirement, index) => {
    const r = response.items.find((item: any) => String(item.requirement_id) === requirement.requirementId);
    if (!r || !['covered', 'partially_covered', 'missing'].includes(r.status) || typeof r.evidence !== 'string' || (r.status !== 'missing' && !r.evidence.trim()) || (r.evidence && sourcePage(text, r.evidence) < 0)) invalidResult();
    return { id: index + 1, requirement_id: requirement.requirementId, requirement_text: requirement.requirementText, status: r.status, evidence: r.evidence, comment: String(r.comment || '') };
  });
  return { items, summary: { total: items.length, covered: items.filter(i => i.status === 'covered').length, partially_covered: items.filter(i => i.status === 'partially_covered').length, missing: items.filter(i => i.status === 'missing').length } };
}
