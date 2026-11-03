import type { Language } from '@/types';

/** Editorial review prompts, not automated checks or assertions of compliance. */
export const reviewChecklist: Record<Language, readonly [string, string][]> = {
  en: [
    ['Source versions', 'Confirm the current RFP, amendments, appendices and required forms; record their versions.'],
    ['Project and bidder identity', 'Compare project IDs and the legal bidder name across all parts of the final package.'],
    ['Pricing and currency', 'Reconcile totals, subtotals, tax, currency and arithmetic with the approved price schedule.'],
    ['Delivery', 'Confirm milestones, calendar or working days, and each deadline’s triggering event.'],
    ['Bid validity', 'Check the validity period and its starting event against the current RFP.'],
    ['Warranty and service levels', 'Compare warranty, response and resolution commitments across sections and with the RFP.'],
    ['Requirement evidence', 'For every mandatory requirement, locate the actual response and evidence; review conditions and exceptions.'],
    ['Qualifications and attachments', 'Verify the required qualifications, certificates, authorization and attachment references.'],
    ['Signatures and approvals', 'Have the responsible person verify required signatures, seals and internal approvals.'],
    ['Final file package', 'Open the final exported files; check completeness, formatting, names, size limits and required file types.'],
    ['Submission arrangements', 'Verify the correct channel, deadline, timezone and responsible submitter against the current instructions.'],
    ['Handover and archive', 'Close unresolved items; recheck final changes and archive the submitted package and any acknowledgement.'],
  ],
  zh: [
    ['文件版本', '确认现行招标文件、补遗、附件及必填表格，并记录版本。'],
    ['项目及投标人身份', '逐处核对最终提交包中的项目编号和投标人法定名称。'],
    ['报价及币种', '按已审批报价表核对总价、小计、税费、币种和算式。'],
    ['交付安排', '核实里程碑、日历日或工作日，以及每项期限的起算条件。'],
    ['投标有效期', '按现行招标要求核实有效期及其起算点。'],
    ['质保及服务时限', '核对各章节的质保、响应及解决时限，并对照招标要求。'],
    ['逐条响应证据', '为每项强制要求定位实际响应和证据，核实条件与例外。'],
    ['资质及附件', '核实所需资质、证书、授权和附件引用是否真实齐备。'],
    ['签章及审批', '由责任人核实要求的签名、印章与内部审批。'],
    ['最终文件包', '打开最终导出件，检查完整性、格式、文件名、大小限制和要求的文件类型。'],
    ['提交安排', '按现行投标须知核实渠道、截止时间、时区和提交责任人。'],
    ['交接及归档', '关闭未解决事项；复核最终改动，归档实际提交包及平台提供的回执。'],
  ],
};
