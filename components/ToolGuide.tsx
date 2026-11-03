import Link from 'next/link';
import type { Language } from '@/types';
import { JsonLd } from './JsonLd';
import { SITE_URL } from '@/lib/seo';

type Tool = 'scanner' | 'matrix' | 'writer';
export function ToolGuide({ lang, tool }: { lang: Language; tool: Tool }) {
  const zh = lang === 'zh', prefix = zh ? '/zh' : '';
  const paths = { scanner: zh ? '/zh' : '/en', matrix: `${prefix}/compliance-matrix`, writer: `${prefix}/bid-writer` };
  const names = zh ? { scanner: '标书检查', matrix: '合规矩阵', writer: '投标草稿' } : { scanner: 'Bid checker', matrix: 'Compliance matrix', writer: 'Bid draft' };
  const steps = {
    scanner: zh ? ['上传投标文件：核对文件内的一致性。', '查看冲突原文：编号、金额、主体和期限需逐项核实。', '下载CSV清单：记录修正结果，再检查新版本。'] : ['Upload a bid to check its internal consistency.', 'Review source excerpts for conflicting IDs, prices, names and deadlines.', 'Download a CSV checklist, resolve issues and check the revised version.'],
    matrix: zh ? ['上传招标文件：提取强制性要求，保留原文。', '核对来源：PDF显示页码，Word使用原文位置。', '填写响应状态和依据，再导出Gov或Enterprise Excel。'] : ['Upload an RFP to extract mandatory clauses in their original wording.', 'Check source references: PDF pages or Word source sections.', 'Review status and evidence, then export Gov or Enterprise Excel.'],
    writer: zh ? ['上传招标文件：以原文要求建立响应清单。', '获得待完善草稿：包含实施建议和待填写资料。', '导出Word：补齐报价、资质和附件后再人工审核。'] : ['Upload an RFP to build a checklist grounded in its requirements.', 'Get a draft with a proposed plan and visible placeholders.', 'Export Word, complete pricing and qualifications, then review before submission.'],
  };
  return <section aria-label={zh ? '使用说明与资料' : 'How it works and resources'} className="mx-auto my-8 max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebApplication', name: `RFPAI ${names[tool]}`, url: SITE_URL + paths[tool], applicationCategory: 'BusinessApplication', operatingSystem: 'Web', isAccessibleForFree: true, inLanguage: zh ? 'zh-Hans' : 'en', description: steps[tool].join(' '), publisher: { '@type': 'Organization', name: 'RFPAI', url: SITE_URL } }} />
    <nav aria-label={zh ? '工具与学习资料' : 'Tools and learning resources'} className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-4 text-sm">
      {(Object.keys(paths) as Tool[]).map(key => <Link key={key} href={paths[key]} aria-current={tool === key ? 'page' : undefined} className={tool === key ? 'font-semibold text-slate-950' : 'text-blue-700 underline underline-offset-4'}>{names[key]}</Link>)}
      <Link href={`${prefix}/examples/bid-review`} className="text-blue-700 underline underline-offset-4">{zh ? '完整案例' : 'Worked example'}</Link>
      <Link href={`${prefix}/templates/compliance-matrix`} className="text-blue-700 underline underline-offset-4">{zh ? 'Excel模板与填写说明' : 'Excel templates & instructions'}</Link>
    </nav>
    <h2 className="mt-5 text-lg font-semibold text-slate-950">{zh ? '你将得到什么' : 'What you will get'}</h2>
    <ol className="mt-4 grid gap-4 md:grid-cols-3">{steps[tool].map((text, i) => <li key={text} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-800">{i + 1}</span><span>{text}</span></li>)}</ol>
    {tool === 'matrix' && <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-900">{zh ? '输出预览：虚构中文招标文件中的3条要求' : 'Output preview: 3 clauses from a fictional Chinese RFP'}</h3>
      <p className="mt-1 text-xs text-slate-600">{zh ? '保留原文；完整案例包含16条。未核实的响应保持待确认。' : 'Original wording is preserved. The worked example has 16 clauses. Unverified responses stay pending.'}</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[560px] text-left text-xs leading-5">
        <thead className="bg-slate-50 text-slate-700"><tr>{(zh ? ['要求原文', '来源', '响应状态'] : ['Original requirement', 'Source', 'Response status']).map(label => <th key={label} scope="col" className="px-3 py-2">{label}</th>)}</tr></thead>
        <tbody>{[
          ['投标人必须提供有效的营业执照复印件，作为资格附件。', '1.1 · p.1'],
          ['交付期限必须为合同签订后30个日历日以内，包含安装和测试。', '1.6 · p.1'],
          ['系统必须提供操作审计日志，日志保存期限不少于180天。', '2.2 · p.2'],
        ].map(([quote, source]) => <tr key={source} className="border-t border-slate-100"><td lang="zh-Hans" className="px-3 py-2 text-slate-700">{quote}</td><td className="whitespace-nowrap px-3 py-2 text-slate-500">{source}</td><td className="whitespace-nowrap px-3 py-2 font-medium text-amber-800">{zh ? '待确认' : 'Pending review'}</td></tr>)}</tbody>
      </table></div>
    </div>}
    <p className="mt-5 text-xs leading-5 text-slate-600">{zh ? '免费版仅限公开或虚构材料；提供方可能留存并用于训练。最大4MB、PDF最多50页、6万字符。扫描件需先OCR，所有结果需人工复核。' : 'Free version: public or fictional material only; providers may retain it and use it for training. Max 4MB, 50 PDF pages, 60,000 characters. Scans need OCR. All results require human review.'}</p>
  </section>;
}
