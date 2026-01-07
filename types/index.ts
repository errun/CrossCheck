// 错误项数据结构
export interface ErrorItem {
  error_id: string;
  rule_id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  priority: 'P1' | 'P2' | 'P3';
  page_no: number;
  snippet: string;
  suggestion: string;
  confidence: number;
}

// 进度数据结构
export interface ProgressPayload {
  doc_id: string;
  global: {
    checked_pages: number;
    total_pages: number;
  };
  rules: Array<{
    rule_id: string;
    status: 'pending' | 'running' | 'completed';
    found?: number;
    error_count?: number;
  }>;
  last_page_no: number;
  new_errors: string[];
}

// 分析结果
export interface AnalysisResult {
	doc_id: string;
	total_pages: number;
	errors: ErrorItem[];
	status: 'pending' | 'running' | 'completed' | 'failed';
	created_at: number;
	pdf_path?: string; // PDF 文件路径
}

// AI 响应格式（标书扫描）
export interface AIResponse {
	errors: Omit<ErrorItem, 'error_id'>[];
}

// 合规矩阵统一数据模型（Canonical source of truth）
export type YesNo = 'Y' | 'N' | '';
export type ComplianceStatus = 'Y' | 'N' | 'Partial' | '';

export interface MatrixItem {
	// Common
	requirementId: string;
	requirementText: string;
	sourceSection?: string;
	responseOwner?: string;
	proposalVolume?: string;
	proposalSection?: string;
	proposalReference?: string;
	commentsNotes?: string;
	// Gov-only
	sourcePage?: number | null;
	requirementType?: string;
	complianceStatus?: ComplianceStatus;
	amendmentId?: string;
	farDfarsReference?: string;
	qaReviewed?: YesNo;
	riskGap?: string;
	// Enterprise-only
	customerPriority?: string;
	responseStrategy?: string;
	dealStage?: string;
	legalRiskFlag?: string;
}

/** @deprecated Legacy alias; use MatrixItem instead. */
export type ComplianceMatrixItem = MatrixItem;

// 招标要求 vs 投标文件对比条目
export interface BidComparisonItem {
	id: number;
	requirement_id: string;
	requirement_text: string;
	status: 'covered' | 'partially_covered' | 'missing';
	evidence: string;
	comment: string;
}

export interface BidComparisonSummary {
	total: number;
	covered: number;
	partially_covered: number;
	missing: number;
}

// 根据 RFP 自动生成的投标文件草稿
export interface BidDraft {
	// 完整的投标文本（可以是 Markdown / 纯文本）
	content: string;
}

// 界面与服务端共用的语言类型
export type Language = 'zh' | 'en';
