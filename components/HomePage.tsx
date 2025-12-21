// @ts-nocheck
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download, ArrowRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorItem, Language } from '@/types';

// 应用版本号（包含日期时间）。
// 未来如果在部署环境中设置 NEXT_PUBLIC_APP_VERSION，则会优先使用环境变量的值。
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v2025-12-19 00:00';

const translations: Record<Language, {
	  appName: string;
	  heroTitle: string;
	  heroSubtitle: string;
		matrixLinkLabel: string;
		matrixLinkDesc: string;
		bidWriterLinkLabel: string;
		bidWriterLinkDesc: string;
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
	  docNotSupportedMessage: string;
	  langSwitchZh: string;
		  langSwitchEn: string;
		  faqTitle: string;
		  faqQ1: string;
		  faqA1: string;
		  faqQ2: string;
		  faqA2: string;
}> = {
		  zh: {
		    appName: '标书全能王',
			    heroTitle: '自动化标书合规性与错误扫描',
			    heroSubtitle: '',
			    // 首页功能卡片：招标文件提取
			    matrixLinkLabel: '招标文件提取',
			    matrixLinkDesc: '只需上传文档，一键提取必须/应条款并生成 Excel 合规检查表。',
			    // 首页功能卡片：投标文件生成（Bid Writer）
			    bidWriterLinkLabel: '投标文件生成',
			    bidWriterLinkDesc: '根据招标文件一键生成标准化投标文件草稿，并支持导出 Word 模板。',
			    // 首页第一个功能卡片：投标文件检查
			    uploadCardTitle: '投标文件检查',
	    uploadCardDesc: '支持 PDF / Word(.docx) 格式，最大 100MB',
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
	    docNotSupportedMessage:
	      '当前在线版本暂不支持直接解析 .doc，请先在本地另存为 .docx 或导出为 PDF 后再上传。',
    langSwitchZh: '中文',
	    langSwitchEn: 'English',
	    faqTitle: '常见问题：标书合规性与废标风险',
	    faqQ1: '标书检查器是如何工作的？',
	    faqA1:
	      '您上传标书和/或 RFP 后，系统会用 AI 对全文进行逐页分析，对照招标文件中的关键条款，检查价格一致性、必输项缺失、错别字和身份信息等问题。',
	    faqQ2: '它可以帮我避免废标吗？',
	    faqA2:
	      '没有任何工具能 100% 保证中标，但通过在提交前自动发现 P1 致命风险和重要合规缺口，它可以大幅降低因低级错误或漏项而导致的废标可能性。',
  },
		  en: {
		    appName: 'CrossCheck',
			    heroTitle: 'Automated Proposal Compliance & Error Scanner',
		    heroSubtitle: '',
		    matrixLinkLabel: 'AI Compliance Matrix Generator',
		    matrixLinkDesc: 'Upload only the RFP to extract mandatory requirements into an Excel compliance checklist.',
		    bidWriterLinkLabel: 'AI Bid Draft Generator',
		    bidWriterLinkDesc: 'Let AI draft a full proposal document from the RFP and export it to Word.',
		    uploadCardTitle: 'Upload Bid Document',
	    uploadCardDesc: 'Supports PDF / Word (.docx), up to 100MB',
    uploadPlaceholder: 'Click to choose a PDF / Word file',
    analyzeButton: 'Analyze Bid Document',
    analyzingTitle: 'Analyzing...',
    analyzingDesc: 'AI is scanning your bid document page by page',
    scanningText: (current, total) => `Scanning page ${current} / ${total}`,
    ruleStatusRunning: 'Running',
	    rulePriceConsistency: 'Pricing Consistency Check',
	    ruleTypos: 'Typos & formatting',
	    ruleIdentity: 'Instant RFP Cross-Reference',
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
	    docNotSupportedMessage:
	      'This online version does not currently support parsing .doc files directly. Please save the file as .docx or export it to PDF locally before uploading.',
	    langSwitchZh: '中文',
	    langSwitchEn: 'English',
	    faqTitle: 'FAQ: Bid checker & AI proposal compliance',
	    faqQ1: 'How does the bid checker work?',
	    faqA1:
	      'Upload your bid proposal and RFP, and our AI proposal analysis engine cross-references them to detect pricing inconsistencies, missing mandatory requirements, formatting problems, and identity issues before you submit.',
	    faqQ2: 'Can it prevent disqualification?',
	    faqA2:
	      'No tool can guarantee an award, but by automatically flagging P1-level compliance gaps and common bid errors before submission, the checker can significantly reduce the risk of disqualification.',
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

export function HomePage({ lang }: { lang: Language }) {
	  const [file, setFile] = useState<File | null>(null);
	  const [analyzing, setAnalyzing] = useState(false);
		  const [result, setResult] = useState<any>(null);
		  const [error, setError] = useState<string>('');
		  const [currentPage, setCurrentPage] = useState(1);
				  const [totalPages, setTotalPages] = useState(0);
			
				  const t = translations[lang];

			  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
	    const selectedFile = e.target.files?.[0];
	    if (!selectedFile) return;

	    const lowerName = selectedFile.name.toLowerCase();
	    // 如果是旧版 .doc（而不是 .docx），前端直接提示暂不支持
	    if (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
	      setFile(null);
	      setResult(null);
		      setError(t.docNotSupportedMessage);
	      // 重置 input，方便用户重新选择
	      try {
	        e.target.value = '';
	      } catch {}
	      return;
	    }

	    setFile(selectedFile);
	    setError('');
	    setResult(null);
			  };

					  const handleAnalyze = async (modelType: 'default' = 'default') => {
	    	    if (!file) return;
	   		
	   		    // Authentication is not required for analysis in the current low-volume phase.
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
			        let message = t.defaultErrorMessage;
			
			        // 413：文件体积超过 Next/代理的上传上限，给出明确提示
			        if (res.status === 413) {
			          message =
			            lang === 'zh'
			              ? '文件太大，超过当前在线版本的上传大小上限。建议控制在 100MB 以内，或拆分为多个文件后再上传。'
			              : 'File is too large for the current online version. Please keep it under 100MB or split it into multiple documents.';
			        } else {
			          try {
			            const errorData = await res.json();
			            if (errorData?.error) {
			              message = errorData.error;
			            }
			          } catch {
			            // ignore JSON parse error, fallback to 默认提示
			          }
			        }
			        throw new Error(message);
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
		    <div className="min-h-screen bg-slate-50">
		      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 text-slate-900">
		        {/* 顶部导航：品牌 + 主功能链接 + 语言切换 + 登录 */}
		        <div className="mb-10 flex items-center justify-between gap-8">
		          <div className="flex items-center gap-3">
		            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg shadow-sm">
		              R
		            </div>
		            <div className="leading-tight">
			              <p className="text-sm font-semibold text-slate-900">{t.appName}</p>
			              <p className="text-xs text-slate-600">AI RFP &amp; bid compliance copilot</p>
			              <p className="text-[10px] text-slate-500 mt-0.5">
			                {lang === 'zh' ? `版本：${APP_VERSION}` : `Version: ${APP_VERSION}`}
			              </p>
		            </div>
		          </div>
		          <div className="flex items-center gap-6">
		            <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
		              <Link
		                href={lang === 'zh' ? '/zh' : '/'}
		                className="hover:text-slate-900 transition-colors"
		              >
		                {lang === 'zh' ? '标书扫描器' : 'Bid Scanner'}
		              </Link>
		              <Link
		                href={lang === 'zh' ? '/zh/compliance-matrix' : '/compliance-matrix'}
		                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
		              >
		                <span>{lang === 'zh' ? '合规矩阵生成器' : 'Compliance Matrix'}</span>
		                <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
		                  NEW
		                </span>
		              </Link>
		            </nav>
				        <div className="flex items-center gap-4">
			              <div className="flex justify-center gap-2">
		                <Link
		                  href="/zh"
		                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
		                    lang === 'zh'
		                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
		                      : 'bg-transparent text-slate-600 border-slate-300 hover:border-slate-400'
		                  }`}
		                >
		                  {t.langSwitchZh}
		                </Link>
		                <Link
				                  href="/?lang=en"
		                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
		                    lang === 'en'
		                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
		                      : 'bg-transparent text-slate-600 border-slate-300 hover:border-slate-400'
		                  }`}
		                >
		                  {t.langSwitchEn}
		                </Link>
				              </div>
			            {/* 顶部右侧目前不展示登录 / 积分信息，保留为空，后续需要时可再开启 */}
		            </div>
		          </div>
		        </div>

		        {/* Hero 区域，参考 Raphael 风格，但采用浅色 B2B SaaS 配色 */}
		        <header className="mb-12 flex flex-col items-center text-center gap-4">
		          <div className="hidden inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-medium text-amber-700 shadow-sm">
		            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
		            <span>{lang === 'zh' ? ' 标书合规性检查 · 废标风险预防' : 'AI proposal compliance · Disqualification risk guard'}</span>
		          </div>
		          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
		            {t.heroTitle}
		          </h1>
		          <p className="max-w-2xl text-base md:text-lg text-slate-600">
		            {t.heroSubtitle}
		          </p>
		          <p className="text-base md:text-lg font-semibold text-slate-700">
		            Don&apos;t let a decimal point ruin your month of work.
		          </p>
          
		        </header>

	      {/* 上传区 + 合规矩阵入口 */}
	        {!analyzing && !result && (
	          <div className="max-w-2xl mx-auto space-y-4">
	            {/* 标书扫描器上传卡片 */}
	            <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
	              <CardHeader>
	                <CardTitle>{t.uploadCardTitle}</CardTitle>
	                <CardDescription>
		              {t.uploadCardDesc}
	                </CardDescription>
	              </CardHeader>
	              <CardContent>
		            <div className="space-y-4">
		              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors bg-slate-50">
			                <input
			                  type="file"
				                      accept=".pdf,.doc,.docx"
			                  onChange={handleFileChange}
			                  className="hidden"
			                  id="file-upload"
			                />
			                    <label htmlFor="file-upload" className="cursor-pointer">
			                  <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
				                      <p className="text-sm text-slate-600">
					                        {file ? file.name : t.uploadPlaceholder}
					                      </p>
			                    </label>
			                  </div>
			                  <p className="text-xs text-slate-500 text-center">
			                    Security First: GDPR Compliant &amp; Data Encryption.
			                  </p>
			                  
			          {error && (
			            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-2">
				              <AlertCircle className="h-5 w-5 text-rose-600 mt-0.5" />
				              <div className="text-sm text-rose-700 space-y-2">
				                <p>{error}</p>
				                <a
					                  href="mailto:edwin.z.w@qq.com"
					                  className="inline-block underline underline-offset-2 text-rose-800 hover:text-rose-900"
					                >
					                  {lang === 'zh'
					                    ? '点击这里给我发邮件：edwin.z.w@qq.com'
					                    : 'Click here to email me: edwin.z.w@qq.com'}
					                </a>
					                <div className="pt-1">
					                  <p className="text-xs mb-1">
					                    {lang === 'zh'
					                      ? '也可以微信扫码联系我：'
					                      : 'Or scan this WeChat QR code to contact me:'}
					                  </p>
					                  <img
					                    src="/wechat-qr.png"
					                    alt="WeChat QR code"
					                    className="h-20 w-20 rounded-md border border-rose-200 bg-white"
					                  />
					                </div>
				              </div>
				            </div>
			          )}
			
			                  {/* 仅保留单一模型按钮（Gemini 2.5 Flash） */}
			                  <div className="space-y-3">
			                    <Button
			                      onClick={() => handleAnalyze('default')}
			                      disabled={!file}
			                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
			                      size="lg"
			                    >
			                      <Upload className="mr-2 h-5 w-5" />
			                      {t.analyzeButton}
			                    </Button>
			                  </div>
			              </div>
		              </CardContent>
		            </Card>

		            {/* 合规矩阵生成器功能入口，和标书扫描器一起在首页展示 */}
		            <Card className="bg-slate-900 text-white border-slate-800 shadow-sm rounded-xl">
		              <CardHeader>
		                {/* 标题字号与上方“上传标书文件”等 CardTitle 保持一致 */}
		                <CardTitle className="flex items-center gap-2">
		                  <span>{t.matrixLinkLabel}</span>
		                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white">
		                    NEW
		                  </span>
		                </CardTitle>
		                <CardDescription className="text-slate-200">
		                  {t.matrixLinkDesc}
		                </CardDescription>
		              </CardHeader>
		              <CardContent>
		                <div className="flex justify-end">
		                  <Link
		                    href={lang === 'zh' ? '/zh/compliance-matrix' : '/compliance-matrix'}
		                    className="inline-flex"
		                  >
		                    <Button
		                      variant="secondary"
		                      size="sm"
		                      className="inline-flex items-center gap-1"
		                    >
		                      <span>
		                        {lang === 'zh'
		                          ? '前往招标文件提取'
		                          : 'Open Compliance Matrix'}
		                      </span>
		                      <ArrowRight className="h-4 w-4" />
		                    </Button>
		                  </Link>
		                </div>
		              </CardContent>
		            </Card>

		            {/* 投标文件生成（Bid Writer）入口卡片，仅在中文首页展示 */}
		            {lang === 'zh' && (
		              <Card className="bg-slate-900 text-white border-slate-800 shadow-sm rounded-xl">
		                <CardHeader>
		                  <CardTitle className="flex items-center gap-2">
		                    <span>{t.bidWriterLinkLabel}</span>
		                  </CardTitle>
		                  <CardDescription className="text-slate-200">
		                    {t.bidWriterLinkDesc}
		                  </CardDescription>
		                </CardHeader>
		                <CardContent>
		                  <div className="flex justify-end">
		                    <Link href="/zh/bid-writer" className="inline-flex">
		                      <Button
		                        variant="secondary"
		                        size="sm"
		                        className="inline-flex items-center gap-1"
		                      >
		                        <span>前往投标文件生成</span>
		                        <ArrowRight className="h-4 w-4" />
		                      </Button>
		                    </Link>
		                  </div>
		                </CardContent>
		              </Card>
		            )}

			            {/* Font Compliance Checker 热点入口（红色渐变小卡片） - 先从首页隐藏 */}
			            {false && (
			              <Card className="bg-gradient-to-r from-rose-600 via-orange-500 to-amber-400 text-white border-none shadow-md rounded-xl">
			                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
			                  <div className="flex items-start gap-3">
			                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
			                      <Flame className="h-4 w-4" />
			                      <span>HOT</span>
			                    </div>
			                    <div className="text-sm md:text-base">
			                      <p className="font-semibold">Font Wars: Is Your Document Government-Approved?</p>
			                      <p className="text-xs md:text-sm text-amber-50/90">
			                        Is your font too woke? Check compliance after Rubio banned Calibri.
			                      </p>
			                    </div>
			                  </div>
			                  <Link href="/font-checker" className="inline-flex">
			                    <Button
			                      variant="secondary"
			                      size="sm"
			                      className="inline-flex items-center gap-1 bg-white/90 text-rose-700 hover:bg-white"
			                    >
			                      <span>Check My Document Now</span>
			                      <ArrowRight className="h-4 w-4" />
			                    </Button>
			                  </Link>
			                </CardContent>
			              </Card>
			            )}
		          </div>
	        )}

	        {/* 分析中 */}
		        {analyzing && (
	          <div className="max-w-6xl mx-auto">
	            <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
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
		                    <p className="sr-only">
		                      AI proposal analysis progress indicator while the bid checker scans your document.
		                    </p>
	            <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                      <div 
	                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
	            <Card className="bg-white border-slate-200 shadow-sm rounded-lg">
                <CardContent className="pt-6">
	                  <div className="text-center">
	                    <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
		                    <p className="text-2xl font-bold text-slate-900">{result.total_pages}</p>
		                    <p className="text-sm text-slate-600">{t.totalPagesLabel}</p>
	                </div>
                </CardContent>
              </Card>
              
	            <Card className="bg-white border-slate-200 shadow-sm rounded-lg">
                <CardContent className="pt-6">
	                  <div className="text-center">
	                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
		                    <p className="text-2xl font-bold text-rose-600">
	                      {result.errors.filter((e: ErrorItem) => e.priority === 'P1').length}
	                    </p>
		                    <p className="text-sm text-slate-600">{t.p1Label}</p>
	                </div>
                </CardContent>
              </Card>
              
	            <Card className="bg-white border-slate-200 shadow-sm rounded-lg">
                <CardContent className="pt-6">
	                  <div className="text-center">
	                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
		                    <p className="text-2xl font-bold text-amber-600">
	                      {result.errors.filter((e: ErrorItem) => e.priority === 'P2').length}
	                    </p>
		                    <p className="text-sm text-slate-600">{t.p2Label}</p>
	                </div>
                </CardContent>
              </Card>
              
	            <Card className="bg-white border-slate-200 shadow-sm rounded-lg">
                <CardContent className="pt-6">
	                  <div className="text-center">
	                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
		                    <p className="text-2xl font-bold text-emerald-600">
	                      {result.errors.filter((e: ErrorItem) => e.priority === 'P3').length}
	                    </p>
		                    <p className="text-sm text-slate-600">{t.p3Label}</p>
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
		      {/* FAQ Section */}
		      <section className="mt-16 bg-white/80 rounded-2xl shadow-sm border border-slate-200">
		        <div className="px-6 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
		          <h2 className="text-2xl font-semibold text-slate-900 mb-4">
		            {t.faqTitle}
		          </h2>
		          <div className="space-y-6 text-sm md:text-base text-slate-700">
		            <div>
		              <h3 className="font-semibold text-slate-900">
		                {t.faqQ1}
		              </h3>
		              <p className="mt-1">
		                {t.faqA1}
		              </p>
		            </div>
		            <div>
		              <h3 className="font-semibold text-slate-900">
		                {t.faqQ2}
		              </h3>
		              <p className="mt-1">
		                {t.faqA2}
		              </p>
		            </div>
		          </div>
		        </div>
		      </section>
	    </div>
	  );
	}

function RuleCard({ ruleId, title, statusLabel }: { ruleId: string; title: string; statusLabel: string }) {
  return (
	    <Card className="bg-white border-slate-200 shadow-sm rounded-lg">
	      <CardContent className="pt-6">
	        <div className="flex justify-between items-center mb-2">
	          <span className="font-semibold text-slate-900">{ruleId}</span>
		          <Badge variant="secondary">{statusLabel}</Badge>
	        </div>
	        <p className="text-sm text-slate-600">{title}</p>
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
	    destructive: 'border-rose-600',
	    warning: 'border-amber-500',
	    info: 'border-blue-500',
  }[variant];

  const t = translations[lang];

	  return (
	    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
	      <CardHeader>
	        <CardTitle>{title}</CardTitle>
	        <CardDescription>{description}</CardDescription>
	      </CardHeader>
	      <CardContent>
	        <div className="space-y-4">
	          {errors.map((error) => (
	            <div
	              key={error.error_id}
	              className={`border-l-4 ${borderColor} bg-slate-50 p-4 rounded-lg`}
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
		                  <span className="text-slate-600">{t.errorContentLabel}</span>
	                  <span className="bg-rose-50 text-rose-700 px-1 rounded font-medium">
	                    {error.snippet}
	                  </span>
	                </div>
	              ) : (
	                <p className="text-sm text-slate-700 mb-2">{error.snippet}</p>
	              )}

              {/* 修正建议 - 如果是错别字则显示正确写法 */}
	              <div className="text-sm text-blue-600 mb-2">
                {error.rule_id === 'R0002' ? (
                  <div>
	                    <span className="font-semibold">{t.correctTextLabel}</span>
		                    <span className="bg-emerald-50 text-emerald-700 px-1 rounded ml-1">
                      {extractCorrectText(error.suggestion)}
                    </span>
                  </div>
                ) : (
		                  <span>{t.suggestionPrefix}{error.suggestion}</span>
                )}
              </div>

	              <p className="text-xs text-slate-500">
		                {t.confidenceLabel}: {(error.confidence * 100).toFixed(0)}%
	              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
	
	// Default English page at "/"
	export default function Page() {
	  return <HomePage lang="en" />;
	}
	