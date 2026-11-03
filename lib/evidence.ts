import type { ErrorItem, Language } from '@/types';
import { randomUUID } from 'node:crypto';

export const compact = (text: string) => text.replace(/\s+/g, '');
export function sourcePage(text: string, quote: string): number {
  const index = compact(text).indexOf(compact(quote));
  if (index < 0) return -1;
  const prefix = compact(text).slice(0, index);
  const pages = [...prefix.matchAll(/\[PAGE(\d+)\]/g)];
  return pages.length ? Number(pages[pages.length - 1][1]) : 0;
}

export type Fact = { field: string; value: string; quote: string };
const labels: Record<string, string> = { project: '项目编号', company: '投标人名称', price: '总报价', delivery: '交付期限', validity: '投标有效期', warranty: '质保期限', response: '故障响应时间', resolution: '处理方案时限' };
const englishLabels: Record<string, string> = { project: 'Project ID', company: 'Bidder name', price: 'Total price', delivery: 'Delivery period', validity: 'Bid validity', warranty: 'Warranty period', response: 'Incident response time', resolution: 'Resolution deadline' };
const normalize = (value: string) => value.replace(/[，,\s]/g, '').toLowerCase();

function isComponentPrice(fact: Fact) {
  if (fact.field !== 'price') return false;
  const quote = compact(fact.quote), value = compact(fact.value);
  const index = quote.indexOf(value);
  if (index < 0) return false;
  const labelsBeforeValue = [...quote.slice(0, index).matchAll(/小计|单价|分项合计|总报价|总价|grandtotal|totalprice|subtotal|unitprice/gi)];
  const last = labelsBeforeValue[labelsBeforeValue.length - 1]?.[0] || '';
  return /^(?:小计|单价|subtotal|unitprice)$/i.test(last);
}

export function extractFacts(text: string): Fact[] {
  const facts: Fact[] = [];
  const add = (field: string, value: string, quote: string) => facts.push({ field, value, quote: quote.trim() });
  for (const sentence of text.split(/[。；;\n]/).filter(Boolean)) {
    for (const m of sentence.matchAll(/\bproject\s+(?:id|number)\s*:\s*([A-Za-z0-9_-]+)/gi)) add('project', m[1], sentence);
    for (const m of sentence.matchAll(/\bbidder(?:\s+(?:legal\s+)?name)?\s*:\s*(.+)/gi)) add('company', m[1], sentence);
    for (const m of sentence.matchAll(/\b(?:(?:final\s+)?total\s+(?:bid\s+)?price|grand\s+total)\s*:\s*(?:(?:USD|EUR|GBP|CNY|RMB)\s*|[$€£¥]\s*)?([\d,]+(?:\.\d+)?)/gi)) add('price', String(Number(m[1].replace(/,/g, ''))), sentence);
    for (const m of sentence.matchAll(/\bdelivery(?:\s+(?:period|time|deadline))?\s*:\s*(\d+)\s*(?:calendar\s+)?days?\b/gi)) add('delivery', m[1], sentence);
    for (const m of sentence.matchAll(/\b(?:bid\s+validity|validity\s+period)\s*:\s*(\d+)\s*days?\b/gi)) add('validity', m[1], sentence);
    for (const m of sentence.matchAll(/\bwarranty(?:\s+period)?\s*:\s*(\d+)\s*(months?|years?)\b/gi)) add('warranty', String(Number(m[1]) * (/years?/i.test(m[2]) ? 12 : 1)), sentence);
    for (const m of sentence.matchAll(/\b(?:incident\s+)?response(?:\s+time)?\s*:\s*(\d+)\s*hours?\b/gi)) add('response', m[1], sentence);
    for (const m of sentence.matchAll(/\bresolution(?:\s+(?:plan|deadline|time))?\s*:\s*(\d+)\s*hours?\b/gi)) add('resolution', m[1], sentence);
    for (const m of sentence.matchAll(/项目编号\s*[:：]\s*([A-Za-z0-9_-]+)/g)) add('project', m[1], sentence);
    for (const m of sentence.matchAll(/投标人(?:名称)?(?:[（(]全称[）)])?\s*[:：]\s*([^，,。；;]+)/g)) add('company', m[1], sentence);
    for (const m of sentence.matchAll(/(?:含税总报价|最终总报价|总报价|分项合计)(?:为|：|:)?(?:人民币)?\s*([\d,]+(?:\.\d+)?)\s*元/g)) add('price', String(Number(m[1].replace(/,/g, ''))), sentence);
    for (const m of sentence.matchAll(/(?:交付期限|交货期|交付时间)\s*[:：为]?[^。；\n]{0,20}?(\d+)\s*(?:个)?(?:日历日|天|日)/g)) add('delivery', m[1], sentence);
    if (/交付|交货/.test(sentence)) for (const m of sentence.matchAll(/合同(?:签订|生效)后(?:第)?(\d+)\s*(?:个)?(?:日历日|天|日)/g)) add('delivery', m[1], sentence);
    for (const m of sentence.matchAll(/有效期\s*(?:为|：|:)?\s*(?:自[^，,；;]{0,45}?起)?\s*(?:不少于|至少)?\s*(\d+)\s*(?:个)?(?:日历日|天|日)/g)) add('validity', m[1], sentence);
    for (const m of sentence.matchAll(/质保(?:期限|期)?(?:为|：|:)?\s*(\d+)\s*(个月|月|年)/g)) add('warranty', String(Number(m[1]) * (m[2] === '年' ? 12 : 1)), sentence);
    for (const m of sentence.matchAll(/(\d+)\s*小时内响应/g)) add('response', m[1], sentence);
    for (const m of sentence.matchAll(/(\d+)\s*小时内(?:给出|提供)[^，,]{0,5}(?:处理|解决)方案/g)) add('resolution', m[1], sentence);
  }
  return facts;
}

export function consistencyErrors(text: string, supplied: Fact[] = [], lang: Language = 'zh'): ErrorItem[] {
  const extracted = extractFacts(text);
  const grounded = supplied.filter(f => labels[f.field] && typeof f.value === 'string' && typeof f.quote === 'string' && sourcePage(text, f.quote) >= 0 && compact(f.quote).includes(compact(f.value)) && !isComponentPrice(f));
  const candidates = [...extracted, ...grounded].map(f => {
    if (f.field === 'company') return { ...f, value: f.value.replace(/[（(](?:虚构|fictional)[）)]/gi, '').trim() };
    if (f.field === 'project') return f;
    const numeric = f.value.match(/^(?:人民币|RMB|CNY|USD|EUR|GBP|¥|\$|€|£)?\s*([\d,.]+)\s*(个月|月|年|months?|years?|小时|hours?|天|日|(?:calendar\s+)?days?|元)?$/i);
    if (!numeric) return { ...f, value: '' };
    return { ...f, value: String(Number(numeric[1].replace(/,/g, '')) * (f.field === 'warranty' && /年|years?/i.test(numeric[2] || '') ? 12 : 1)) };
  }).filter(f => f.value);
  const facts = [...new Map(candidates.map(f => [`${f.field}|${normalize(f.value)}|${compact(f.quote)}`, f])).values()];
  const errors: ErrorItem[] = [];
  const create = (rule: string, title: string, quote: string, suggestion: string, priority: 'P1' | 'P2' = 'P1') => {
    errors.push({ error_id: randomUUID(), rule_id: rule, title, severity: priority === 'P1' ? 'Critical' : 'High', priority, page_no: Math.max(0, sourcePage(text, quote)), snippet: quote, suggestion, confidence: 1 });
  };
  for (const [field, label] of Object.entries(labels)) {
    const group = facts.filter(f => f.field === field);
    const values = [...new Set(group.map(f => normalize(f.value)))];
    if (values.length > 1) {
      const unique = values.map(value => group.find(f => normalize(f.value) === value)!);
      create(`CONSISTENCY_${field.toUpperCase()}`, lang === 'zh' ? `${label}前后不一致` : `${englishLabels[field]} is inconsistent`, unique[0].quote, lang === 'zh' ? `发现不同值：${unique.map(f => f.value).join(' / ')}。请对照原始依据确认后统一；其他位置：${unique.slice(1).map(f => f.quote).join('；')}` : `Conflicting values: ${unique.map(f => f.value).join(' / ')}. Verify against the original evidence before making them consistent. Other excerpts: ${unique.slice(1).map(f => f.quote).join('; ')}`);
    }
  }
  const parts = [...text.matchAll(/小计\s*([\d,]+(?:\.\d+)?)\s*元/g)].map(m => Number(m[1].replace(/,/g, '')));
  const totals = facts.filter(f => f.field === 'price');
  if (parts.length > 1 && totals.length && !errors.some(e => e.rule_id === 'CONSISTENCY_PRICE')) {
    const sum = Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100;
    const bad = totals.find(f => Number(f.value) !== sum);
    if (bad) create('PRICE_ARITHMETIC', lang === 'zh' ? '分项金额合计与总价不一致' : 'Itemized sum differs from total price', bad.quote, lang === 'zh' ? `分项小计之和为${sum}元，请核对总价及分项金额。` : `Itemized amounts sum to ${sum}. Check the total and the line items.`);
  }
  const missing = text.split(/[。\n]/).find(line => /(?:未附|未提供|未提交|缺少)[^。\n]{0,30}(?:授权书|授权委托书)|authorization\s+letter\s*(?::|is)?\s*not\s+(?:attached|provided|submitted)/i.test(line));
  if (missing) create('MISSING_AUTHORIZATION', lang === 'zh' ? '授权材料缺失' : 'Authorization is missing', missing.trim(), lang === 'zh' ? '补充授权书并核实授权代表信息；待提供的材料不能标记为已齐全。' : 'Supply the authorization letter and verify representative details. Pending attachments are not complete.', 'P2');
  return errors;
}
