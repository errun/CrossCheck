'use client';

import { useEffect, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorItem, Language } from '@/types';

const translations: Record<Language, {
  appName: string;
  heroTitle: string;
  heroSubtitle: string;
  uploadCardTitle: string;
  uploadCardDesc: string;
  uploadPlaceholder: string;
  analyzeButton: string;
  analyzingTitle: string;
  analyzingDesc: string;
  scanningText: (current: number, total: number) => string;
  ruleStatusRunning: string;
  rulePriceConsistency: string;
  ruleTypos: string;
  ruleIdentity: string;
  totalPagesLabel: string;
  p1Label: string;
  p2Label: string;
  p3Label: string;
  downloadChecklist: string;
  backHome: string;
  sectionP1Title: string;
  sectionP1Desc: string;
  sectionP2Title: string;
  sectionP2Desc: string;
  sectionP3Title: string;
  sectionP3Desc: string;
  pageLabel: (pageNo: number) => string;
  errorContentLabel: string;
  correctTextLabel: string;
  suggestionPrefix: string;
  confidenceLabel: string;
  defaultErrorMessage: string;
  langSwitchZh: string;
  langSwitchEn: string;
}> = {
  zh: {
    appName: '标书全能王',
    heroTitle: '标书全能王',
    heroSubtitle: 'AI 驱动的标书自动审查与可视化分析',
    uploadCardTitle: '上传标书文件',
    uploadCardDesc: '支持 PDF / Word(.docx) 格式，最大 50MB',
    uploadPlaceholder: '点击选择 PDF / Word 文件',
    analyzeButton: '标书分析',
    analyzingTitle: '正在分析中...',
    analyzingDesc: 'AI 正在逐页扫描您的标书文件',
    scanningText: (current, total) => `正在扫描第 ${current} / ${total} 页`,
    ruleStatusRunning: '进行中',
    rulePriceConsistency: '价格一致性',
    ruleTypos: '错别字检查',
    ruleIdentity: '身份信息',
    totalPagesLabel: '总页数',
    p1Label: '致命问题',
    p2Label: '重大问题',
    p3Label: '格式问题',
    downloadChecklist: '下载检查清单',
    backHome: '返回首页',
    sectionP1Title: '🚨 致命问题（P1）',
    sectionP1Desc: '直接导致废标的风险',
    sectionP2Title: '📉 重大问题（P2）',
    sectionP2Desc: '可能导致扣分或不利评审',
    sectionP3Title: '✅ 格式问题（P3）',
    sectionP3Desc: '建议优化项',
    pageLabel: (pageNo) => `第 ${pageNo} 页`,
    errorContentLabel: '错误内容：',
    correctTextLabel: '✓ 正确写法：',
    suggestionPrefix: '💡 ',
    confidenceLabel: '置信度',
    defaultErrorMessage: '分析失败，请重试',
    langSwitchZh: '中文',
    langSwitchEn: 'English',
  },
  en: {
    appName: 'CrossCheck',
    heroTitle: 'CrossCheck Bid Proposal Checker',
    heroSubtitle: 'AI-powered automatic review and visual analysis for bid proposals',
    uploadCardTitle: 'Upload Bid Document',
    uploadCardDesc: 'Supports PDF / Word (.docx), up to 50MB',
    uploadPlaceholder: 'Click to choose a PDF / Word file',
    analyzeButton: 'Analyze Bid Document',
    analyzingTitle: 'Analyzing...',
    analyzingDesc: 'AI is scanning your bid document page by page',
    scanningText: (current, total) => `Scanning page ${current} / ${total}`,
    ruleStatusRunning: 'Running',
    rulePriceConsistency: 'Price consistency',
    ruleTypos: 'Typos & formatting',
    ruleIdentity: 'Identity information',
    totalPagesLabel: 'Total pages',
    p1Label: 'Critical issues',
    p2Label: 'Major issues',
    p3Label: 'Formatting issues',
    downloadChecklist: 'Download checklist (CSV)',
    backHome: 'Back to home',
    sectionP1Title: '🚨 Critical issues (P1)',
    sectionP1Desc: 'Issues that may directly lead to bid rejection',
    sectionP2Title: '📉 Major issues (P2)',
    sectionP2Desc: 'Issues that may cause score deduction or disadvantages',
    sectionP3Title: '✅ Formatting issues (P3)',
    sectionP3Desc: 'Recommended improvements',
    pageLabel: (pageNo) => `Page ${pageNo}`,
    errorContentLabel: 'Error snippet:',
    correctTextLabel: '✓ Correct text:',
    suggestionPrefix: '💡 ',
    confidenceLabel: 'Confidence',
    defaultErrorMessage: 'Analysis failed, please try again',
    langSwitchZh: '中文',
    langSwitchEn: 'English',
  },
};

// 从建议中提取正确的文本
function extractCorrectText(suggestion: string): string {
	  // 尝试提取引号中的内容
	  const quoteMatch = suggestion.match(/[""]([^""]+)[""]|"([^"]+)"/);
	  if (quoteMatch) {
	    return quoteMatch[1] || quoteMatch[2];
	  }

	  // 尝试提取"应为"、"改为"、"修改为"等关键词后的内容（兼容中英文提示）
	  const patterns = [
	    // 中文提示格式
	    /应为[：:]\s*(.+?)(?:[。，,；;]|$)/,
	    /改为[：:]\s*(.+?)(?:[。，,；;]|$)/,
	    /修改为[：:]\s*(.+?)(?:[。，,；;]|$)/,
	    /正确[的是]*[：:]\s*(.+?)(?:[。，,；;]|$)/,
	    /建议[：:]\s*(.+?)(?:[。，,；;]|$)/,
	    // 英文提示格式
	    /should be[:：]\s*(.+?)(?:[.,;]|$)/i,
	    /change to[:：]\s*(.+?)(?:[.,;]|$)/i,
	    /correct (?:text|version|is)[:：]\s*(.+?)(?:[.,;]|$)/i,
	    /suggest(?:ed)?[:：]\s*(.+?)(?:[.,;]|$)/i,
	  ];

	  for (const pattern of patterns) {
	    const match = suggestion.match(pattern);
	    if (match) {
	      return match[1].trim();
	    }
	  }

	  // 如果无法提取，返回整个建议
	  return suggestion;
	}

export default function HomePage() {
  const [lang, setLang] = useState<Language>('zh');
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
		  const [totalPages, setTotalPages] = useState(0);

  // 根据本地存储和浏览器语言选择默认语言
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const stored = window.localStorage.getItem('cc_lang');
      if (stored === 'zh' || stored === 'en') {
        setLang(stored);
        return;
      }
      const navLang = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
      if (navLang.startsWith('zh')) {
        setLang('zh');
      } else {
        setLang('en');
      }
    } catch (e) {
      // 忽略语言检测出错，默认中文
      setLang('zh');
    }
  }, []);

  const t = translations[lang];

  const handleLanguageChange = (nextLang: Language) => {
    setLang(nextLang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cc_lang', nextLang);
    }
  };

		  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
		  };

			  const handleAnalyze = async (modelType: 'default' = 'default') => {
    if (!file) return;

    setAnalyzing(true);
    setError('');
    setCurrentPage(1);

	    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', modelType);
	      // 将当前界面语言一并传给后端，便于选择中英文提示词和返回结果语言
	      formData.append('lang', lang);

      // 模拟逐页扫描动画
      const estimatedPages = 50;
      setTotalPages(estimatedPages);

      const interval = setInterval(() => {
        setCurrentPage(prev => {
          if (prev >= estimatedPages) {
            clearInterval(interval);
            return estimatedPages;
          }
          return prev + 1;
        });
      }, 100);

      // 调用 API
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      clearInterval(interval);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await res.json();
      setTotalPages(data.total_pages);
      setCurrentPage(data.total_pages);
      setResult(data);

	      } catch (err: any) {
	      setError(err.message || t.defaultErrorMessage);
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
	  };

  const handleDownload = () => {
    if (!result) return;
    
    const url = `/api/export?doc_id=${result.doc_id}&format=csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
		      <div className="container mx-auto px-4 py-8">
		        {/* Header */}
		        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4">
		          <div className="text-center md:text-left">
		            <h1 className="text-4xl font-bold text-gray-900 mb-2">
		              {t.heroTitle}
		            </h1>
		            <p className="text-gray-600">
		              {t.heroSubtitle}
		            </p>
		          </div>
		          <div className="flex justify-center md:justify-end gap-2">
		            <button
		              type="button"
		              onClick={() => handleLanguageChange('zh')}
		              className={`px-3 py-1 rounded-full text-sm border ${
		                lang === 'zh'
		                  ? 'bg-blue-600 text-white border-blue-600'
		                  : 'bg-white text-gray-700 border-gray-300'
		              }`}
		            >
		              {t.langSwitchZh}
		            </button>
		            <button
		              type="button"
		              onClick={() => handleLanguageChange('en')}
		              className={`px-3 py-1 rounded-full text-sm border ${
		                lang === 'en'
		                  ? 'bg-blue-600 text-white border-blue-600'
		                  : 'bg-white text-gray-700 border-gray-300'
		              }`}
		            >
		              {t.langSwitchEn}
		            </button>
		          </div>
		        </div>

        {/* 上传区 */}
	        {!analyzing && !result && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
	              <CardTitle>{t.uploadCardTitle}</CardTitle>
	              <CardDescription>
			            {t.uploadCardDesc}
	              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
	                  <input
	                    type="file"
	                    accept=".pdf,.docx"
	                    onChange={handleFileChange}
	                    className="hidden"
	                    id="file-upload"
	                  />
		                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
			                    <p className="text-sm text-gray-600">
			                      {file ? file.name : t.uploadPlaceholder}
			                    </p>
                  </label>
                </div>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

		                {/* 仅保留单一模型按钮（Gemini 2.5 Flash） */}
		                <div className="space-y-3">
		                  <Button
		                    onClick={() => handleAnalyze('default')}
		                    disabled={!file}
		                    className="w-full bg-amber-600 hover:bg-amber-700"
		                    size="lg"
		                  >
		                    <Upload className="mr-2 h-5 w-5" />
		                    {t.analyzeButton}
		                  </Button>
		                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分析中 */}
	        {analyzing && (
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
	                <CardTitle>{t.analyzingTitle}</CardTitle>
	                <CardDescription>
	                  {t.analyzingDesc}
	                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 进度显示 */}
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
	                    <p className="text-lg font-semibold">
	                      {t.scanningText(currentPage, totalPages)}
	                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentPage / totalPages) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* 规则卡片 */}
	                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
	                    <RuleCard ruleId="R0001" title={t.rulePriceConsistency} statusLabel={t.ruleStatusRunning} />
	                    <RuleCard ruleId="R0002" title={t.ruleTypos} statusLabel={t.ruleStatusRunning} />
	                    <RuleCard ruleId="R0003" title={t.ruleIdentity} statusLabel={t.ruleStatusRunning} />
	                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 结果页 */}
	        {result && !analyzing && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
	                    <p className="text-2xl font-bold">{result.total_pages}</p>
	                    <p className="text-sm text-gray-600">{t.totalPagesLabel}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
	                    <p className="text-2xl font-bold text-red-600">
	                      {result.errors.filter((e: ErrorItem) => e.priority === 'P1').length}
	                    </p>
	                    <p className="text-sm text-gray-600">{t.p1Label}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
	                    <p className="text-2xl font-bold text-orange-600">
	                      {result.errors.filter((e: ErrorItem) => e.priority === 'P2').length}
	                    </p>
	                    <p className="text-sm text-gray-600">{t.p2Label}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
	                    <p className="text-2xl font-bold text-yellow-600">
	                      {result.errors.filter((e: ErrorItem) => e.priority === 'P3').length}
	                    </p>
	                    <p className="text-sm text-gray-600">{t.p3Label}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 操作按钮 */}
	            <div className="flex gap-4 flex-wrap">
	              <Button onClick={handleDownload} size="lg">
	                <Download className="mr-2 h-5 w-5" />
	                {t.downloadChecklist}
	              </Button>
              <Button
                variant="outline"
	                onClick={() => {
                  // 返回首页：重置结果和状态，但保留已选择的文件
                  setResult(null);
                  setError('');
                  setAnalyzing(false);
                  setCurrentPage(1);
                  setTotalPages(0);
	                }}
	                size="lg"
	              >
	                {t.backHome}
	              </Button>
            </div>

            {/* 错误列表 */}
	            <div>
	              <ErrorList errors={result.errors} lang={lang} />
	            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RuleCard({ ruleId, title, statusLabel }: { ruleId: string; title: string; statusLabel: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">{ruleId}</span>
	          <Badge variant="secondary">{statusLabel}</Badge>
        </div>
        <p className="text-sm text-gray-600">{title}</p>
      </CardContent>
    </Card>
  );
}

function ErrorList({ errors, lang }: { errors: ErrorItem[]; lang: Language }) {
  const p1Errors = errors.filter(e => e.priority === 'P1');
  const p2Errors = errors.filter(e => e.priority === 'P2');
  const p3Errors = errors.filter(e => e.priority === 'P3');

  const t = translations[lang];

  return (
    <div className="space-y-6">
      {p1Errors.length > 0 && (
        <ErrorSection
	          title={t.sectionP1Title}
	          description={t.sectionP1Desc}
          errors={p1Errors}
          variant="destructive"
          lang={lang}
        />
      )}

      {p2Errors.length > 0 && (
        <ErrorSection
	          title={t.sectionP2Title}
	          description={t.sectionP2Desc}
          errors={p2Errors}
          variant="warning"
          lang={lang}
        />
      )}

      {p3Errors.length > 0 && (
        <ErrorSection
	          title={t.sectionP3Title}
	          description={t.sectionP3Desc}
          errors={p3Errors}
          variant="info"
          lang={lang}
        />
      )}
    </div>
  );
}

function ErrorSection({
  title,
  description,
  errors,
  variant,
  lang,
}: {
  title: string;
  description: string;
  errors: ErrorItem[];
  variant: 'destructive' | 'warning' | 'info';
  lang: Language;
}) {
  const borderColor = {
    destructive: 'border-red-500',
    warning: 'border-orange-500',
    info: 'border-yellow-500',
  }[variant];

  const t = translations[lang];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {errors.map((error) => (
            <div
              key={error.error_id}
              className={`border-l-4 ${borderColor} bg-gray-50 p-4 rounded`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{error.rule_id}</Badge>
                  <span className="font-semibold">{error.title}</span>
                </div>
                <Badge variant="secondary">
	                  {t.pageLabel(error.page_no)}
                </Badge>
              </div>

              {/* 错误内容 - 如果是错别字则标红 */}
              {error.rule_id === 'R0002' ? (
                <div className="text-sm mb-2">
	                  <span className="text-gray-600">{t.errorContentLabel}</span>
                  <span className="bg-red-100 text-red-700 px-1 rounded font-medium">
                    {error.snippet}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-700 mb-2">{error.snippet}</p>
              )}

              {/* 修正建议 - 如果是错别字则显示正确写法 */}
              <div className="text-sm text-blue-600 mb-2">
                {error.rule_id === 'R0002' ? (
                  <div>
	                    <span className="font-semibold">{t.correctTextLabel}</span>
                    <span className="bg-green-100 text-green-700 px-1 rounded ml-1">
                      {extractCorrectText(error.suggestion)}
                    </span>
                  </div>
                ) : (
	                  <span>{t.suggestionPrefix}{error.suggestion}</span>
                )}
              </div>

              <p className="text-xs text-gray-500">
	                {t.confidenceLabel}: {(error.confidence * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

