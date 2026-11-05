import type { Language } from '@/types';

export type GuideKind = 'rfp-shredding' | 'bid-review-checklist';
export const guidePaths: Record<GuideKind, string> = {
  'rfp-shredding': '/guides/rfp-shredding',
  'bid-review-checklist': '/guides/bid-review-checklist',
};
type GuideContent = {
  title: string; description: string; heading: string; intro: string; takeaway: string;
  steps: { heading: string; text: string }[];
  exampleHeading: string; exampleNote: string; columns: string[]; rows: string[][];
  reviewHeading: string; reviewText: string;
  faq: { q: string; a: string }[];
};

const shredding: Record<Language, GuideContent> = {
  en: {
    title: 'RFP Shredding Guide: Extract & Track Requirements | RFPAI',
    description: 'Turn RFP clauses into reviewable requirements. Work through a fictional example, preserve conditions and source references, and track amendments in a compliance matrix.',
    heading: 'RFP shredding: turn source clauses into a usable compliance matrix',
    intro: 'RFP shredding means breaking a request for proposal into individual requirements that a proposal team can assign, answer and verify. A useful matrix connects each obligation to its source, response owner and proposal evidence. It is more than a list of sentences containing “shall”.',
    takeaway: 'Keep the exact source wording and its location. Separate obligations that need different evidence, preserve every condition and exception, and leave compliance pending until a person checks the actual response.',
    steps: [
      { heading: 'Freeze the source set', text: 'Record the RFP title, issue date and version. List appendices, pricing forms, schedules and issued amendments. Keep a copy of each source. A matrix extracted from the main document cannot establish coverage of attachments that were never supplied.' },
      { heading: 'Find obligations, not just keywords', text: 'Review instructions, eligibility, deliverables, service levels, submission rules and evaluation criteria. “Must” and “shall” are useful signals, but table cells, checkboxes and headings may also contain obligations. Distinguish mandatory conditions from preferences; ask the buyer about ambiguity rather than inventing a rule.' },
      { heading: 'Split carefully and preserve context', text: 'One clause can contain several obligations. Separate them when they have different owners or evidence, but carry over shared deadlines, triggers and exceptions. Keep the full original quote beside the working interpretation. Do not shorten “within 30 calendar days after contract signature” to an unqualified “30 days”.' },
      { heading: 'Assign evidence and ownership', text: 'Use a stable internal ID, source section, actual PDF page, exact quote, owner, response location, evidence and review status. Word pages vary by rendering, so use source sections when actual pages are unavailable. The blank Excel templates include source, status, owner and notes columns; keep version details in your working copy.' },
      { heading: 'Review the extraction against the original', text: 'Read the source in order and check every extracted row, especially tables, negations, numbers, cross-references and conditional clauses. Look for missing requirements as well as incorrect ones. Assign a reviewer before moving a row from pending to confirmed. A generated response is not proof that the bidder meets it.' },
      { heading: 'Reconcile amendments before reuse', text: 'Compare the old and new source wording, including revised attachments. Record added, removed and changed clauses. Link the change to affected response evidence and reopen the review. Generated row numbers can change between runs; match the original clause and its source instead.' },
    ],
    exampleHeading: 'Worked exercise: one clause, two obligations, one shared deadline',
    exampleNote: 'This is an original fictional teaching exercise, prepared for this guide. It is not an AI extraction result or a test of model accuracy. Fictional source: section 3.2, PDF page 4: “The supplier shall deliver and install the system within 30 calendar days after contract signature, and shall provide two training sessions within the same period. Remote training is permitted if the buyer agrees in writing.”',
    columns: ['Working requirement', 'Context to preserve', 'Evidence to request', 'Initial status'],
    rows: [
      ['Deliver and install the system', '§3.2 · p.4; within 30 calendar days after contract signature', 'Delivery and installation schedule tied to the contract date', 'Pending review'],
      ['Provide two training sessions', '§3.2 · p.4; same 30-day window; remote only with written buyer agreement', 'Training plan with two sessions; written agreement if remote delivery is proposed', 'Pending review'],
    ],
    reviewHeading: 'Amendment example: do not carry forward an old confirmation',
    reviewText: 'Suppose amendment 1 changes section 3.2 to 20 calendar days and requires on-site training. Both rows need review. Update the schedule, remove the remote-delivery assumption and ask the owners for new evidence. Retain the previous wording and the amendment reference in your working record. RFPAI does not automatically reconcile amendments or manage owners across versions; export the matrix and maintain that review yourself.',
    faq: [
      { q: 'How is RFP shredding different from a compliance matrix?', a: 'Shredding is the extraction and interpretation work. The compliance matrix is the working record that connects the resulting requirements to owners, responses, evidence and review status.' },
      { q: 'Can I create a compliance matrix automatically from an RFP?', a: 'RFPAI can extract mandatory requirements from public or fictional PDF and Word files and export Excel. Review the output against every relevant source. It does not guarantee that every obligation has been found, and it cannot confirm compliance without actual proposal evidence.' },
      { q: 'Can I upload confidential tenders or scanned PDFs?', a: 'The free version accepts public or fictional material only, without confidential or personal information. Providers may retain it and use it for training; explicit acknowledgement is required. Files are limited to 4MB, 50 PDF pages and 60,000 characters. Scanned PDFs need OCR first.' },
    ],
  },
  zh: {
    title: '招标要求拆解指南：从原文到可复核合规矩阵 | RFPAI',
    description: '用完整虚构条款演示招标要求拆解：保留条件、期限和来源位置，分配责任与响应证据，处理招标补遗，并导出Excel合规矩阵。',
    heading: '招标要求拆解：从原文建立可复核的合规矩阵',
    intro: '招标要求拆解，也称RFP shredding，是把招标文件拆成可分配、可响应、可核实的独立要求。合规矩阵应把每项义务连接到来源、责任人和投标证据，而不只是汇总含有“必须”的句子。',
    takeaway: '保留完整原文与来源；需要不同证据的义务可分行，但共享期限、条件和例外必须一同保留。实际响应未经人工核实，状态就保持待确认。',
    steps: [
      { heading: '固定本次使用的文件版本', text: '记录项目、发布日期和文件版本，列出附件、报价表、时间表及已发布补遗，保存各份原文。仅提取主文件，不能说明未上传的附件也已覆盖。' },
      { heading: '识别义务，不只搜索关键词', text: '检查投标须知、资格、交付、服务时限、提交规则和评审要求。“必须”“应当”是线索，但表格、勾选项、标题下的内容也可能包含要求。区分强制条件与偏好；有歧义时向采购方澄清，不能自行编造规则。' },
      { heading: '拆开义务，同时保留上下文', text: '同一条款可能要求交货、安装和培训。证据或责任人不同的义务可以拆开，但共享的触发点、期限和例外不能丢。完整原文应与工作解释并存；不能把“合同签订后30个日历日以内”缩成没有起算点的“30天”。' },
      { heading: '分配责任人与响应证据', text: '记录稳定内部编号、来源章节、真实PDF页码、原文、责任人、响应位置、证据和状态。Word分页会随渲染变化，没有真实页码时使用来源章节。空白Excel模板含来源、状态、责任人及备注列，版本信息需在工作副本中自行维护。' },
      { heading: '按原文顺序复核提取结果', text: '逐页检查表格、否定词、数值、交叉引用和条件条款，既查错提取，也查遗漏。先明确复核人，再把待确认状态改为已确认。生成了一段响应文字，并不能证明投标人已经满足要求。' },
      { heading: '复用前核对补遗与版本变更', text: '对照新旧原文和更新附件，记录新增、删除与修改的条款；将变更关联到受影响的响应证据，重新安排复核。每次提取产生的行号可能变化，不能只靠行号匹配旧条款。' },
    ],
    exampleHeading: '拆解练习：一个条款、两项义务、共同期限',
    exampleNote: '以下为本指南编写的原创虚构教学练习，不是AI提取结果，也不代表模型准确率。虚构来源：第3.2节、PDF第4页：“供应商必须在合同签订后30个日历日内完成系统交付与安装，并在同一期限内提供两场培训。采购方书面同意后，可采用远程培训。”',
    columns: ['拆出的工作要求', '必须保留的上下文', '需要核实的响应证据', '初始状态'],
    rows: [
      ['完成系统交付与安装', '第3.2节 · 第4页；合同签订后30个日历日内', '以合同日期为起点的交付与安装计划', '待确认'],
      ['提供两场培训', '第3.2节 · 第4页；同一30日期限；远程培训须采购方书面同意', '包含两场培训的计划；如采用远程培训，须核实书面同意', '待确认'],
    ],
    reviewHeading: '补遗练习：不要直接沿用旧版“已确认”',
    reviewText: '假设补遗1把第3.2节改成20个日历日，并要求现场培训，两行都需要重新复核。更新交付安排，删除远程培训假设，要求责任人提供新证据，同时保留旧原文和补遗引用。RFPAI当前不会自动对比补遗，也不提供跨版本责任人管理；导出矩阵后，需要自行维护这部分工作记录。',
    faq: [
      { q: '招标要求拆解和合规矩阵有什么区别？', a: '拆解是识别、提取和解释要求的过程；合规矩阵是连接这些要求与责任人、实际响应、证据及复核状态的工作记录。' },
      { q: '可以自动从招标文件生成合规矩阵吗？', a: 'RFPAI可从公开或虚构PDF、Word中提取强制要求并导出Excel。需要对照所有有关原文复核，不能保证无遗漏，也不能仅凭生成内容确认投标人已满足要求。' },
      { q: '保密标书或扫描件能直接上传吗？', a: '免费版仅限不含保密或个人信息的公开、虚构材料，提供方可能留存并用于训练，上传前须明确勾选告知。上限4MB、PDF最多50页、6万字符；扫描件须先OCR。' },
    ],
  },
};

const review: Record<Language, GuideContent> = {
  en: {
    title: 'Bid Review Checklist: 12 Checks Before Submission | RFPAI',
    description: 'Download a 12-point bid review checklist. Check source versions, pricing, deadlines, evidence, signatures and the final submission package; distinguish AI checks from human review.',
    heading: 'Bid review checklist: 12 checks before you submit',
    intro: 'A bid can read well and still contain conflicting totals, an old project ID or an unsupported compliance claim. Use this checklist to review the actual final package. Give each check an owner, record the evidence and keep unresolved items visible until a responsible person closes them.',
    takeaway: 'Use two separate reviews: check the bid for internal contradictions, then check the proposal against the current RFP and attachments. Neither review replaces verifying signatures, qualifications, commercial decisions or the buyer’s actual submission rules.',
    steps: [
      { heading: 'Start with the current source and the final export', text: 'Collect the RFP, amendments and required forms. Freeze a candidate submission package and record its version. Review the files the buyer will receive, not only an editable draft. A corrected Word file does not help if an old PDF is uploaded at the deadline.' },
      { heading: 'Reconcile repeated facts', text: 'Compare project identifiers, bidder names, currency, totals, delivery periods, bid validity, warranty, response time and resolution time across sections. A subtotal is not a conflicting total. Two identical-looking dates may describe different events: retain their labels and triggering conditions.' },
      { heading: 'Test each claim against evidence', text: 'Use the compliance matrix to locate the proposal section or attachment answering each requirement. Ask whether the evidence supports the complete condition, including numbers and exceptions. A promise to supply a certificate later is different from attaching a currently valid certificate where required.' },
      { heading: 'Check the package and close the handover', text: 'Have responsible people verify pricing arithmetic, qualifications, signatures, file formats, upload limits, channel and deadline timezone against the actual RFP. Record the submission acknowledgement if one is provided. Reopen affected checks after any final change, and keep an archive of the package actually submitted.' },
    ],
    exampleHeading: 'How to review an alert without overreacting',
    exampleNote: 'Original fictional review exercise; these are examples of human interpretation, not guaranteed AI findings. A warning is a prompt to inspect evidence, not a decision that the bid is invalid.',
    columns: ['What you find', 'Why it needs attention', 'What to check next'],
    rows: [
      ['Cover total: USD 120,000; price schedule total: USD 125,000', 'Two sections label different amounts as the total', 'Confirm the intended total, tax treatment and approved pricing, then correct every affected section'],
      ['Grand total: USD 120,000; components: USD 100,000 + USD 20,000', 'These numbers alone are consistent; a subtotal is not a competing grand total', 'Verify arithmetic and labels; do not replace a correct total merely because amounts differ'],
      ['Delivery: 30 days after signature; bid validity: 90 days after closing', 'Different periods describe different obligations', 'Compare delivery with delivery elsewhere, and validity with validity; preserve their different starting events'],
      ['“All certificates attached” with no evidence location', 'A statement of compliance does not prove the attachment exists', 'Locate and inspect the required certificate, then record its attachment reference and review status'],
    ],
    reviewHeading: 'What RFPAI helps with, and what the reviewer must do',
    reviewText: 'The bid checker looks for supported internal inconsistencies in public or fictional PDF and Word documents and exports a CSV of alerts. The matrix tool extracts source requirements so you can manually map each one to proposal evidence and review the response. Neither tool validates a signature, authenticates qualifications, inspects a procurement portal or makes a legal eligibility decision. A clean check is not proof that a bid is complete. The downloadable checklist is a manual working aid, not a certification.',
    faq: [
      { q: 'Can a bid checker guarantee that my bid will not be rejected?', a: 'No. A tool can help surface supported inconsistencies, but cannot guarantee completeness, eligibility or award. Review the buyer’s current requirements, actual evidence and final submission package yourself.' },
      { q: 'Is this the same as a proposal compliance matrix?', a: 'No. A matrix tracks individual RFP requirements and their response evidence. This checklist covers the broader final review, including versions, repeated facts, attachments and submission handover. Use both.' },
      { q: 'Does the checklist require uploading a document?', a: 'No. Download the CSV and work locally without uploading anything. If you use the free AI tools, upload only public or fictional material without confidential or personal information, and acknowledge that providers may retain it and use it for training.' },
    ],
  },
  zh: {
    title: '投标前检查清单：12项人工复核与CSV下载 | RFPAI',
    description: '免费下载12项投标前检查清单，核对版本、报价、项目编号、时限、响应证据、签章附件与提交回执，区分AI一致性检查和必要的人工复核。',
    heading: '投标前检查清单：提交前逐项核实12件事',
    intro: '标书文字通顺，仍可能有报价矛盾、旧项目编号或没有证据的合规声明。用这份清单检查最终提交包，为每项分配责任人、记录证据，在责任人确认前持续保留未解决的问题。',
    takeaway: '分别完成文件内部一致性检查，以及投标响应对招标原文和附件的核对；另外由责任人验证签章、资质、商业决策和实际提交规则。',
    steps: [
      { heading: '拿齐现行原文，检查最终导出件', text: '汇总招标文件、补遗和必填表格，固定候选提交包并记录版本。检查采购方实际会收到的文件，而不只检查可编辑草稿。Word改对了，但截止前上传的仍是旧PDF，修改就没有落实。' },
      { heading: '核对反复出现的事实', text: '逐处比较项目编号、投标人名称、币种、总价、交付期限、投标有效期、质保期、响应时限和解决时限。小计不等于另一份总价；同样写“30天”的两处也可能描述不同事项，必须保留字段名称与起算条件。' },
      { heading: '逐项找到声明对应的证据', text: '借助合规矩阵找到满足要求的响应章节或附件，检查证据是否覆盖完整条件，包括数值和例外。承诺将来提供证书，不等于已按要求附上现行有效证书。' },
      { heading: '核实提交包并完成交接', text: '由责任人按实际招标要求核对报价算式、资质、签章、格式、上传限制、渠道和截止时区。平台提供回执时应保存回执；最终改动后重新检查受影响项目，并归档实际提交的文件。' },
    ],
    exampleHeading: '看到提示后，怎样判断是否真的有问题',
    exampleNote: '以下是原创虚构人工复核练习，不代表AI必然识别这些问题。提示用于引导查证，不能直接等同于废标结论。',
    columns: ['发现的内容', '需要留意的原因', '下一步怎么核实'],
    rows: [
      ['封面总价120000元；报价表总价125000元', '两处均标为总价，但金额不一致', '核实最终报价、税费口径和审批依据，统一修改受影响章节'],
      ['总价120000元；分项100000元＋20000元', '仅凭这三个数字并无矛盾，分项不应被当成另一份总价', '核对算式和字段标签，不因金额不同就改掉正确总价'],
      ['交付为签约后30天；投标有效期为截止后90天', '不同期限描述不同义务', '交付与其他交付表述比较，有效期与其他有效期比较，保留各自起算点'],
      ['写了“证书均已附”，却没有证据位置', '声明本身不能证明附件已存在', '找到并核实证书，记录附件编号和实际复核状态'],
    ],
    reviewHeading: 'RFPAI能帮什么，人工还要完成什么',
    reviewText: '标书检查工具帮助发现公开或虚构PDF、Word中的、有原文支持的内部一致性问题，并导出CSV提示清单。矩阵工具提取招标要求，供你逐条人工关联投标响应、定位证据并核实。工具不会验证签章真伪、认证资质、检查采购平台或作出法律层面的合格性判断。零提示不证明标书完整；可下载清单只是人工工作表，不是认证。',
    faq: [
      { q: '标书检查工具可以保证不废标吗？', a: '不能。工具可辅助定位有证据支持的矛盾，无法保证完整率、合格性或中标。仍须核对采购方的现行要求、实际证据和最终提交包。' },
      { q: '这份清单和合规矩阵一样吗？', a: '不一样。合规矩阵按招标条款逐项记录响应与证据；这份清单覆盖更广的提交前工作，包括版本、反复出现的事实、附件和提交交接。两者可以一起使用。' },
      { q: '使用清单需要上传文件吗？', a: '不需要，可下载CSV后在本地填写。如使用免费AI工具，仅能上传不含保密或个人信息的公开、虚构材料，并须知晓提供方可能留存及用于训练。' },
    ],
  },
};

export function guideContent(lang: Language, kind: GuideKind): GuideContent {
  return (kind === 'rfp-shredding' ? shredding : review)[lang];
}
