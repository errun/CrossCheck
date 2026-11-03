import type { Metadata } from 'next';
import type { Language } from '@/types';

export const SITE_URL = 'https://rfpai.io';
export const BRAND = 'RFPAI';
export const CONTENT_UPDATED = '2026-11-03';

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
