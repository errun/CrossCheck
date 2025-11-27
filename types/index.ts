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

// AI 响应格式
export interface AIResponse {
  errors: Omit<ErrorItem, 'error_id'>[];
}

