import type { Metadata } from 'next';
import type { Language } from '@/types';
import { guideContent, guidePaths, type GuideKind } from './guides';

export const SITE_URL = 'https://rfpai.io';
export const BRAND = 'RFPAI';
export const CONTENT_UPDATED = '2026-11-03';

export function guideMetadata(lang: Language, kind: GuideKind): Metadata {
  const en = guidePaths[kind], zh = '/zh' + en, content = guideContent(lang, kind);
  return pageMetadata(lang, lang === 'zh' ? zh : en, content.title, content.description, en, zh);
}

export function pageMetadata(lang: Language, path: string, title: string, description: string, englishPath: string, chinesePath: string): Metadata {
  return {
    title, description,
    alternates: { canonical: path, languages: { en: englishPath, 'zh-Hans': chinesePath, 'x-default': chinesePath } },
    openGraph: { title, description, url: path, siteName: BRAND, type: 'website', locale: lang === 'zh' ? 'zh_CN' : 'en_US', alternateLocale: lang === 'zh' ? ['en_US'] : ['zh_CN'] },
    twitter: { card: 'summary', title, description },
  };
}

export const toolMetadata = {
  scanner: {
    zh: pageMetadata('zh', '/zh', '标书检查工具：核对报价、编号与期限 | RFPAI', '上传公开或虚构的PDF、Word标书，检查文件内报价、项目编号、投标人及期限的一致性，导出CSV检查清单。结果需人工复核。', '/en', '/zh'),
    en: pageMetadata('en', '/en', 'AI Bid Checker: Pricing, IDs & Deadlines | RFPAI', 'Check public or fictional bid documents for inconsistent prices, project IDs, bidder names and deadlines. Export a CSV checklist for human review.', '/en', '/zh'),
  },
  matrix: {
    zh: pageMetadata('zh', '/zh/compliance-matrix', '免费合规矩阵生成器：招标要求提取与Excel导出 | RFPAI', '从公开或虚构的PDF、Word招标文件中提取强制要求，保留原文及来源位置，编辑响应状态并导出Excel合规矩阵。无需注册，结果需复核。', '/compliance-matrix', '/zh/compliance-matrix'),
    en: pageMetadata('en', '/compliance-matrix', 'Free RFP Compliance Matrix Generator — Excel | RFPAI', 'Extract must/shall requirements from public or fictional PDF and Word RFPs. Keep source references, review compliance status and export editable Excel matrices. No sign-up.', '/compliance-matrix', '/zh/compliance-matrix'),
  },
  writer: {
    zh: pageMetadata('zh', '/zh/bid-writer', 'AI投标草稿生成器：从招标要求到Word草稿 | RFPAI', '根据公开或虚构招标文件生成含原文要求、待确认响应和实施建议的投标草稿，支持Word导出。企业资料、报价及附件需自行补齐核实。', '/bid-writer', '/zh/bid-writer'),
    en: pageMetadata('en', '/bid-writer', 'AI Bid Draft Generator: RFP to Word Proposal | RFPAI', 'Create a draft from a public or fictional RFP with source requirements, pending responses and a proposed plan. Export to Word; complete and verify bidder details yourself.', '/bid-writer', '/zh/bid-writer'),
  },
};

export function resourceMetadata(lang: Language, kind: 'example' | 'template') {
  const example = kind === 'example', en = example ? '/examples/bid-review' : '/templates/compliance-matrix', zh = `/zh${en}`;
  const title = lang === 'zh' ? (example ? '标书检查与合规矩阵完整案例：公开虚构样本 | RFPAI' : '合规矩阵Excel模板与填写说明：免费下载 | RFPAI') : (example ? 'RFP Compliance Matrix & Bid Review Worked Example | RFPAI' : 'Free Proposal Compliance Matrix Templates — Excel | RFPAI');
  const description = lang === 'zh' ? (example ? '下载虚构招标文件、投标文件和示例结果，逐条查看16项强制要求与8类预埋问题，了解原文定位、响应状态和AI检查的适用边界。' : '免费下载Gov和Enterprise合规矩阵Excel空白模板，附要求原文、来源位置、响应状态、责任人和证据的填写方法及提交前检查清单。') : (example ? 'Download fictional Chinese RFP and bid files, inspect 16 mandatory clauses and eight planted issue categories, and review source references, outputs and limitations.' : 'Download free Gov and Enterprise compliance matrix Excel templates. Learn how to record source clauses, pending status, owners, proposal evidence and review notes.');
  return pageMetadata(lang, lang === 'zh' ? zh : en, title, description, en, zh);
}
