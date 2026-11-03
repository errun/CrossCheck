import Link from 'next/link';
import type { Language } from '@/types';
import demo from '@/lib/demo-data.json';
import { SITE_URL, CONTENT_UPDATED } from '@/lib/seo';
import { JsonLd } from './JsonLd';
import { ResourceDownload } from './ResourceDownload';
import type { ResourceId } from '@/lib/resources';

export function ResourcePage({ lang, kind }: { lang: Language; kind: 'example' | 'template' }) {
  const zh = lang === 'zh', example = kind === 'example', prefix = zh ? '/zh' : '';
  const slug = example ? '/examples/bid-review' : '/templates/compliance-matrix', here = prefix + slug;
  const title = zh ? (example ? '从招标原文到可复核结果' : '合规矩阵Excel模板：从要求原文到响应证据') : (example ? 'From RFP source to a reviewable result' : 'Proposal compliance matrix templates for Excel');
  const faq = [
    { q: zh ? '免费工具可以上传保密标书吗？' : 'Can I upload a confidential RFP to the free tool?', a: zh ? '不可以。免费版仅限公开或虚构材料，不得含保密或个人信息。免费模型提供方可能留存材料并用于训练；上传前必须明确勾选告知。' : 'No. The free tool is limited to public or fictional material without confidential or personal information. Providers may retain it and use it for training. Explicit acknowledgement is required before processing.' },
    { q: zh ? '模板中的“已响应”能由AI自动确认吗？' : 'Can AI confirm that a requirement is compliant?', a: zh ? '不能仅凭生成结果确认。逐条核对实际方案和证据，再由责任人填写响应状态。企业资质、报价、签章及附件均需自行核实。' : 'Generated output is not proof of compliance. A responsible reviewer must check the actual proposal and evidence before recording status. Verify qualifications, pricing, signatures and attachments yourself.' },
    { q: zh ? '新版本招标文件如何处理？' : 'How should I handle an RFP amendment?', a: zh ? '保存旧版原文与工作簿，对新版重新提取后逐条比较新增、删除和变更要求。新提取的行号可能变化，不能仅凭行号判断同一条款。' : 'Keep the previous source and workbook. Extract the new version and compare added, removed and changed clauses. Row IDs can change between extractions, so do not match requirements by row number alone.' },
  ];
  const download = (resource: ResourceId, label: string, note: string) => <ResourceDownload resource={resource} lang={lang} label={label} note={note} />;
  const issueNames: Record<string, string> = { CONSISTENCY_PROJECT: 'Conflicting project IDs', CONSISTENCY_COMPANY: 'Conflicting bidder names', CONSISTENCY_PRICE: 'Conflicting total prices', CONSISTENCY_DELIVERY: 'Conflicting delivery periods', CONSISTENCY_VALIDITY: 'Conflicting validity periods', CONSISTENCY_WARRANTY: 'Conflicting warranty periods', CONSISTENCY_RESPONSE: 'Conflicting response times', CONSISTENCY_RESOLUTION: 'Conflicting resolution times', MISSING_AUTHORIZATION: 'Explicitly missing authorization' };
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: SITE_URL + here, inLanguage: zh ? 'zh-Hans' : 'en', dateModified: CONTENT_UPDATED, publisher: { '@type': 'Organization', name: 'RFPAI', url: SITE_URL }, about: { '@type': 'Thing', name: 'RFP compliance matrix and bid document review' } }} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }} />
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5">
        <Link href={zh ? '/zh' : '/en'} className="text-lg font-bold tracking-tight">RFPAI <span className="ml-2 text-xs font-normal tracking-normal text-slate-500">{zh ? '标书工作资料' : 'Proposal field notes'}</span></Link>
        <nav aria-label={zh ? '资料导航' : 'Resource navigation'} className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={`${prefix}/compliance-matrix`} className="text-blue-800 hover:underline">{zh ? '合规矩阵工具' : 'Matrix tool'}</Link>
          <Link href={`${prefix}${example ? '/templates/compliance-matrix' : '/examples/bid-review'}`} className="text-blue-800 hover:underline">{zh ? (example ? 'Excel模板' : '完整案例') : (example ? 'Excel templates' : 'Worked example')}</Link>
          <Link href={zh ? slug : '/zh' + slug} hrefLang={zh ? 'en' : 'zh-Hans'} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50">{zh ? 'English' : '中文'}</Link>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">{zh ? (example ? '公开虚构案例 · 01' : '可下载工作表 · 02') : (example ? 'Fictional worked example · 01' : 'Downloadable workbooks · 02')}</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-8 text-slate-600">{zh ? (example ? '同一套虚构招标文件和投标文件，分别用于要求提取、内部一致性检查与草稿生成。你可以下载原文，逐条对照结果，了解工具能帮助什么、哪些仍需人工完成。' : '先记录原文和来源，再分配责任人、填写响应依据，最后核实状态。这两份空白Excel模板无需注册即可下载，也可与RFPAI生成的矩阵一起使用。') : (example ? 'Follow one fictional Chinese-language procurement through requirement extraction, internal consistency checks and draft generation. Download the source files and inspect the outputs yourself.' : 'Record the source first, assign an owner, add proposal evidence and then review status. Download two blank Excel templates without signing up, or use them alongside a generated RFPAI matrix.')}</p>
        <p className="mt-4 text-xs text-slate-500">{zh ? 'RFPAI产品示例与使用说明' : 'RFPAI product example and instructions'} · {zh ? '更新' : 'Updated'} {CONTENT_UPDATED}</p>
      </div>

      {example ? <>
        <section aria-labelledby="sample-scope" className="mt-10 rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
          <h2 id="sample-scope" className="font-semibold">{zh ? '先了解这个样本的范围' : 'Understand the scope of this example'}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-700">{zh ? '2页中文招标文件包含16条强制要求；另一份2页投标文件预埋8类问题，形成9条提示，其中故障响应与处理方案时限分别提示。材料、企业和项目均为虚构。这是单一样本的功能验证，不代表任何真实标书的完整率、准确率或废标判断。' : 'A two-page Chinese RFP contains 16 mandatory clauses. A separate two-page bid has eight planted issue categories producing nine alerts: incident response and resolution deadlines are reported separately. All organizations and projects are fictional. This single example does not establish accuracy, completeness or eligibility for real bids.'}</p>
          {!zh && <p className="mt-2 text-sm leading-7 text-slate-700">The source PDFs, quoted evidence and exported examples remain in Chinese so you can verify the original wording. This is not an English-language benchmark.</p>}
        </section>
        <section className="mt-12" aria-labelledby="downloads">
          <h2 id="downloads" className="text-2xl font-semibold">{zh ? '1. 下载原文和示例结果' : '1. Download sources and sample outputs'}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {download('tender_demo', zh ? '虚构招标文件 · PDF' : 'Fictional RFP · PDF', zh ? '2页，供矩阵和草稿工具试用。' : '2 pages. Input for the matrix and draft tools.')}
            {download('bid_demo', zh ? '预埋问题投标文件 · PDF' : 'Bid with planted issues · PDF', zh ? '2页，供标书检查工具试用。' : '2 pages. Input for the bid checker.')}
            {download('matrix_example', zh ? '16条要求矩阵 · Excel' : '16-clause sample matrix · Excel', zh ? '响应状态未填写，保留原文及来源。' : 'Source references retained. Compliance stays blank.')}
            {download('checklist_example', zh ? '9条检查提示 · CSV' : '9-alert sample checklist · CSV', zh ? '包含冲突原文及人工核实建议。' : 'Conflicting excerpts and review suggestions.')}
            {download('draft_example', zh ? '待完善投标草稿 · Word' : 'Draft with placeholders · Word', zh ? '16条待确认响应；不代表附件已齐全。' : '16 pending responses; attachments are not verified.')}
          </div>
        </section>
        <section className="mt-12" aria-labelledby="matrix-results">
          <div className="flex flex-wrap items-end justify-between gap-4"><h2 id="matrix-results" className="text-2xl font-semibold">{zh ? '2. 逐条核对16项招标要求' : '2. Inspect all 16 extracted clauses'}</h2><Link href={`${prefix}/compliance-matrix#upload`} className="text-sm font-semibold text-blue-800 underline underline-offset-4">{zh ? '打开矩阵工具' : 'Open matrix tool'} →</Link></div>
          <p className="mt-3 text-sm leading-7 text-slate-600">{zh ? '这是该样本的原文提取结果，未自动判定投标人已满足要求。' : 'These are source excerpts from this sample. They do not mean that a bidder has satisfied the requirements.'}</p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[620px] text-left text-sm leading-6"><thead className="bg-slate-100"><tr>{(zh ? ['序号', '要求原文', '来源', '响应状态'] : ['ID', 'Original requirement', 'Source', 'Status']).map(v => <th key={v} scope="col" className="p-3">{v}</th>)}</tr></thead><tbody>{demo.requirements.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="p-3 align-top text-slate-500">{item.id}</td><td lang="zh-Hans" className="p-3">{item.text}</td><td className="whitespace-nowrap p-3 align-top text-xs text-slate-500">{item.section}<br />p.{item.page}</td><td className="whitespace-nowrap p-3 align-top text-amber-800">{zh ? '待确认' : 'Pending'}</td></tr>)}</tbody></table></div>
        </section>
        <section className="mt-12" aria-labelledby="bid-results">
          <div className="flex flex-wrap items-end justify-between gap-4"><h2 id="bid-results" className="text-2xl font-semibold">{zh ? '3. 检查9条冲突与缺件提示' : '3. Review nine inconsistency and missing-item alerts'}</h2><Link href={zh ? '/zh#upload' : '/en#upload'} className="text-sm font-semibold text-blue-800 underline underline-offset-4">{zh ? '打开标书检查' : 'Open bid checker'} →</Link></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">{demo.issues.map(item => <article key={item.rule} className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">{zh ? item.title : issueNames[item.rule]}</h3><p className="mt-1 text-xs text-slate-500">{zh ? '原文页码' : 'Source page'} {item.page}</p><blockquote lang="zh-Hans" className="mt-3 border-l-2 border-blue-200 pl-3 text-sm leading-6 text-slate-700">{item.quote}</blockquote><p lang="zh-Hans" className="mt-3 text-sm leading-6 text-slate-600">{item.suggestion}</p></article>)}</div>
        </section>
        <section className="mt-12 rounded-2xl bg-slate-900 p-6 text-white md:p-8"><h2 className="text-2xl font-semibold">{zh ? '4. 把草稿交给责任人完善' : '4. Complete the draft with the responsible reviewer'}</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">{zh ? '示例Word包含原文要求、16条待确认响应、拟实施方案，以及企业名称、报价、资质和授权附件的待填写项。生成草稿不能证明企业能力、附件齐全或最终格式合格。PDF导出使用浏览器打印，本次样本未完成PDF文件验收。' : 'The sample Word file contains source requirements, 16 pending responses, a proposed plan and placeholders for bidder identity, pricing, qualifications and authorization. A draft does not verify capability, attachments or final formatting. PDF export uses browser printing and was not file-verified in this example.'}</p><Link href={`${prefix}/bid-writer#upload`} className="mt-5 inline-block rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-900">{zh ? '打开投标草稿工具' : 'Open bid draft tool'} →</Link></section>
      </> : <>
        <section className="mt-10 grid gap-4 md:grid-cols-2" aria-label={zh ? '下载Excel空白模板' : 'Download blank Excel templates'}>
          {download('gov_blank', zh ? 'Gov合规矩阵空白模板 · Excel' : 'Gov compliance matrix template · Excel', zh ? '含原文、章节、页码、响应状态、责任人、证据及复核栏。FAR/DFARS等字段按项目适用性填写。' : 'Includes source, page, status, owner, evidence and review fields. Use FAR/DFARS fields only where applicable.')}
          {download('enterprise_blank', zh ? 'Enterprise合规矩阵空白模板 · Excel' : 'Enterprise compliance matrix template · Excel', zh ? '含客户优先级、来源、响应策略、责任人、备注、页码及响应状态。' : 'Includes customer priority, source, strategy, owner, notes, page and compliance status.')}
        </section>
        <section className="mt-12" aria-labelledby="fill-in"><h2 id="fill-in" className="text-2xl font-semibold">{zh ? '如何填写，而不是只收集条款' : 'How to fill it in, not just collect clauses'}</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{(zh ? [
          ['原文与来源', '保留条件、数字、否定和例外，不把“不得转包”改成“可以分包”。PDF记录真实页码；Word没有可靠分页时记录章节。'],
          ['响应状态', '未核实保持空白或待确认；仅在核对实际证据后选择Y、N或Partial。不要把AI生成文字当作已满足要求的证据。'],
          ['责任人和响应依据', '分配可确认该要求的人，填写方案章节、附件编号和具体证据。备注中记录待补材料、疑问和后续动作。'],
          ['版本与最终复核', '保存招标文件版本与澄清文件；重新提取后比较原文，不仅比较行号。提交前由责任人确认报价、交付和附件。'],
        ] : [
          ['Source wording and location', 'Keep conditions, numbers, negations and exceptions intact. Record actual PDF pages; use section references when Word pagination is unavailable.'],
          ['Compliance status', 'Leave unverified status blank or pending. Select Y, N or Partial only after checking actual evidence. Generated text is not evidence of compliance.'],
          ['Owner and response evidence', 'Assign someone who can confirm the requirement. Record proposal sections, attachment IDs and specific evidence. Use notes for gaps and next actions.'],
          ['Versions and final review', 'Keep the RFP version and amendments. Compare original clauses after a new extraction, not only row IDs. Verify pricing, delivery and attachments before submission.'],
        ]).map(([heading, text], i) => <article key={heading} className="rounded-xl border border-slate-200 bg-white p-6"><span className="text-xs font-semibold text-blue-800">0{i + 1}</span><h3 className="mt-3 text-lg font-semibold">{heading}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}</div></section>
        <section className="mt-12 rounded-2xl border border-blue-100 bg-blue-50/60 p-6"><h2 className="text-xl font-semibold">{zh ? '从一个完整案例开始' : 'Start with a worked example'}</h2><p className="mt-3 text-sm leading-7 text-slate-700">{zh ? '下载2页虚构招标文件，查看16条原文要求如何进入矩阵。另有预埋问题的投标文件和对应检查清单，方便理解复核方式。' : 'Download a two-page fictional Chinese RFP and see how 16 source clauses map into a matrix. A separate bid with planted issues and a checklist illustrates the review process.'}</p><Link href={`${prefix}/examples/bid-review`} className="mt-4 inline-block text-sm font-semibold text-blue-800 underline underline-offset-4">{zh ? '查看原文、矩阵和检查结果' : 'Inspect sources, matrix and checklist'} →</Link></section>
      </>}

      <section className="mt-12" aria-labelledby="working-guides"><h2 id="working-guides" className="text-2xl font-semibold">{zh ? '配套工作指南' : 'Companion working guides'}</h2><ul className="mt-4 space-y-3 text-sm text-blue-800"><li><Link href={`${prefix}/guides/rfp-shredding`} className="underline underline-offset-4">{zh ? '招标要求拆解：保留条件、来源和补遗变更' : 'RFP shredding: preserve conditions, sources and amendment changes'}</Link></li><li><Link href={`${prefix}/guides/bid-review-checklist`} className="underline underline-offset-4">{zh ? '投标前12项检查：下载人工复核清单' : '12-point bid review checklist: download the manual review worksheet'}</Link></li></ul></section>
      <section className="mt-12 max-w-4xl" aria-labelledby="questions"><h2 id="questions" className="text-2xl font-semibold">{zh ? '使用前需要知道的问题' : 'Questions before you use these resources'}</h2><div className="mt-5 divide-y divide-slate-200">{faq.map(item => <details key={item.q} className="py-4"><summary className="cursor-pointer font-semibold leading-7">{item.q}</summary><p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p></details>)}</div></section>
      <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="text-xl font-semibold">{zh ? '准备好整理你的公开招标文件了吗？' : 'Ready to organize a public RFP?'}</h2><p className="mt-2 text-sm text-slate-600">{zh ? '仅限公开或虚构材料；输出需要人工复核。' : 'Public or fictional material only. Review the output yourself.'}</p></div><Link href={`${prefix}/compliance-matrix#upload`} className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">{zh ? '打开免费矩阵工具' : 'Open free matrix tool'} →</Link></section>
    </main>
    <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs leading-6 text-slate-500">RFPAI · {zh ? '本页材料为公开虚构示例。结果不构成对真实投标的合格性确认。' : 'Public fictional examples. Outputs do not establish eligibility or compliance for real bids.'}</footer>
  </div>;
}
