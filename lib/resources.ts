export const resourceDownloads = {
  tender_demo: '/samples/fictional-tender.pdf',
  bid_demo: '/samples/fictional-bid.pdf',
  matrix_example: '/samples/sample-compliance-matrix.xlsx',
  checklist_example: '/samples/sample-checklist.csv',
  draft_example: '/samples/sample-bid-draft.docx',
  gov_blank: '/samples/gov-compliance-matrix.xlsx',
  enterprise_blank: '/samples/enterprise-compliance-matrix.xlsx',
  review_checklist_en: '/samples/bid-review-checklist-en.csv',
  review_checklist_zh: '/samples/bid-review-checklist-zh.csv',
} as const;
export type ResourceId = keyof typeof resourceDownloads;
