import Link from 'next/link';
import type { Language } from '@/types';
import { guideContent, guidePaths, type GuideKind } from '@/lib/guides';
import { reviewChecklist } from '@/lib/review-checklist';
import { CONTENT_UPDATED, SITE_URL } from '@/lib/seo';
import { JsonLd } from './JsonLd';
import { ResourceDownload } from './ResourceDownload';

export function GuidePage({ lang, kind }: { lang: Language; kind: GuideKind }) {
  const zh = lang === 'zh', prefix = zh ? '/zh' : '', c = guideContent(lang, kind);
  const review = kind === 'bid-review-checklist', here = prefix + guidePaths[kind];
  const other: GuideKind = review ? 'rfp-shredding' : 'bid-review-checklist';
  const tool = review ? (zh ? '/zh' : '/en') : `${prefix}/compliance-matrix`;
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: c.heading, description: c.description, mainEntityOfPage: SITE_URL + here, inLanguage: zh ? 'zh-Hans' : 'en', datePublished: CONTENT_UPDATED, dateModified: CONTENT_UPDATED, author: { '@type': 'Organization', name: 'RFPAI', url: SITE_URL }, publisher: { '@type': 'Organization', name: 'RFPAI', url: SITE_URL } }} />
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) }} />
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5 py-5">
      <Link href={zh ? '/zh' : '/en'} className="text-lg font-bold tracking-tight">RFPAI <span className="ml-2 text-xs font-normal text-slate-500">{zh ? '标书工作指南' : 'Proposal field guides'}</span></Link>
      <nav aria-label={zh ? '指南导航' : 'Guide navigation'} className="flex flex-wrap items-center gap-4 text-sm">
        <Link href={`${prefix}/templates/compliance-matrix`} className="text-blue-800 hover:underline">{zh ? 'Excel模板' : 'Excel templates'}</Link>
        <Link href={`${prefix}/examples/bid-review`} className="text-blue-800 hover:underline">{zh ? '完整案例' : 'Worked example'}</Link>
        <Link href={(zh ? '' : '/zh') + guidePaths[kind]} hrefLang={zh ? 'en' : 'zh-Hans'} className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50">{zh ? 'English' : '中文'}</Link>
      </nav>
    </div></header>
    <main className="mx-auto max-w-5xl px-5 py-10 md:py-16"><article>
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-800">{zh ? '可执行的工作方法' : 'A practical working method'}</p>
      <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">{c.heading}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">{c.intro}</p>
      <p className="mt-4 text-xs text-slate-500">{zh ? 'RFPAI产品团队 · 更新' : 'RFPAI product team · Updated'} {CONTENT_UPDATED}</p>
      <section aria-labelledby="key-point" className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
        <h2 id="key-point" className="text-lg font-semibold">{zh ? '先抓住这件事' : 'The essential review rule'}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-700">{c.takeaway}</p>
        <Link href={tool} className="mt-4 inline-block rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">{zh ? (review ? '打开免费标书检查' : '打开免费矩阵工具') : (review ? 'Open free bid checker' : 'Open free matrix tool')} →</Link>
      </section>
      {review && <section className="mt-12" aria-labelledby="review-checklist">
        <h2 id="review-checklist" className="text-2xl font-semibold">{zh ? '12项提交前检查' : 'The 12-point submission checklist'}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{zh ? '以下均为人工复核项目，不代表工具已自动验证。下载表格中的每一项初始状态均为待确认，责任人和证据位置留空。' : 'These are manual review tasks, not checks the tool has already performed. Every downloaded row starts pending, with its owner and evidence location left blank.'}</p>
        <div className="mt-5 grid max-w-xl"><ResourceDownload resource={zh ? 'review_checklist_zh' : 'review_checklist_en'} lang={lang} label={zh ? '下载中文12项检查清单（CSV）' : 'Download the 12-point checklist (CSV)'} note={zh ? '无需注册或上传；含责任人、证据、状态、复核日期和备注，可在本地填写。' : 'No sign-up or upload. Fill in owner, evidence, status, review date and notes locally.'} /></div>
        <ol className="mt-5 grid gap-4 md:grid-cols-2">{reviewChecklist[lang].map(([heading, text], i) => <li key={heading} className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold"><span className="mr-2 text-blue-800">{String(i + 1).padStart(2, '0')}</span>{heading}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{text}</p></li>)}</ol>

      </section>}
      <section className="mt-12" aria-labelledby="workflow"><h2 id="workflow" className="text-2xl font-semibold">{zh ? '怎样把这项工作完成' : 'How to carry out the review'}</h2><ol className="mt-5 space-y-6">{c.steps.map((step, i) => <li key={step.heading} className="border-l-2 border-blue-200 pl-5"><h3 className="text-lg font-semibold">{i + 1}. {step.heading}</h3><p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">{step.text}</p></li>)}</ol></section>
      <section className="mt-12" aria-labelledby="exercise">
        <h2 id="exercise" className="text-2xl font-semibold">{c.exampleHeading}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{c.exampleNote}</p>
        <div role="region" aria-labelledby="exercise" tabIndex={0} className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"><table className="w-full min-w-[650px] text-left text-sm leading-7">
          <thead className="bg-slate-100"><tr>{c.columns.map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
          <tbody>{c.rows.map((row, i) => <tr key={row[0]} className={i % 2 ? 'border-t border-slate-200 bg-slate-50' : 'border-t border-slate-200'}>{row.map((cell, j) => <td key={j} className="px-4 py-3 align-top text-slate-700">{cell}</td>)}</tr>)}</tbody>
        </table></div>
      </section>
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-semibold">{c.reviewHeading}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{c.reviewText}</p></section>
      <section className="mt-12" aria-labelledby="questions"><h2 id="questions" className="text-2xl font-semibold">{zh ? '常见问题' : 'Frequently asked questions'}</h2><div className="mt-5 divide-y divide-slate-200">{c.faq.map(item => <details key={item.q} className="py-4"><summary className="cursor-pointer font-semibold leading-7">{item.q}</summary><p className="mt-3 text-sm leading-7 text-slate-600">{item.a}</p></details>)}</div></section>
    </article>
      <aside aria-label={zh ? '接下来可以使用的资料' : 'Resources for the next step'} className="mt-12 rounded-2xl border border-blue-100 bg-blue-50/60 p-6"><h2 className="text-xl font-semibold">{zh ? '把方法用到实际工作中' : 'Put the method to work'}</h2><ul className="mt-4 space-y-3 text-sm text-blue-800">
        <li><Link href={`${prefix}/templates/compliance-matrix`} className="underline underline-offset-4">{zh ? '下载合规矩阵Excel空白模板，记录原文和响应证据' : 'Download blank compliance matrix Excel templates to record sources and evidence'}</Link></li>
        <li><Link href={`${prefix}/examples/bid-review`} className="underline underline-offset-4">{zh ? '查看16条要求和9条检查提示的虚构中文案例' : 'Inspect the fictional Chinese example with 16 requirements and 9 review alerts'}</Link></li>
        <li><Link href={prefix + guidePaths[other]} className="underline underline-offset-4">{guideContent(lang, other).heading}</Link></li>
      </ul><p className="mt-4 text-xs leading-6 text-slate-600">{zh ? '免费AI工具仅限公开或虚构材料，不得含保密或个人信息；提供方可能留存及用于训练。上限4MB、PDF50页、6万字符，扫描件须先OCR。所有结果需人工复核。' : 'Free AI tools: public or fictional material only, without confidential or personal information. Providers may retain it and use it for training. Max 4MB, 50 PDF pages and 60,000 characters; scans need OCR. Review all results.'}</p></aside>
    </main>
    <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs leading-6 text-slate-500">RFPAI · {zh ? '原创工作指南与虚构教学练习；不保证完整率或投标合格性。' : 'Original working guides and fictional teaching exercises; no guarantee of completeness or bid eligibility.'}</footer>
  </div>;
}
