'use client';

import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorItem } from '@/types';

// 从建议中提取正确的文本
function extractCorrectText(suggestion: string): string {
  // 尝试提取引号中的内容
  const quoteMatch = suggestion.match(/[""]([^""]+)[""]|"([^"]+)"/);
  if (quoteMatch) {
    return quoteMatch[1] || quoteMatch[2];
  }

  // 尝试提取"应为"、"改为"、"修改为"等关键词后的内容
  const patterns = [
    /应为[：:]\s*(.+?)(?:[。，,；;]|$)/,
    /改为[：:]\s*(.+?)(?:[。，,；;]|$)/,
    /修改为[：:]\s*(.+?)(?:[。，,；;]|$)/,
    /正确[的是]*[：:]\s*(.+?)(?:[。，,；;]|$)/,
    /建议[：:]\s*(.+?)(?:[。，,；;]|$)/,
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
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
	  const [totalPages, setTotalPages] = useState(0);

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
      setError(err.message || '分析失败，请重试');
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
	        <div className="text-center mb-12">
	          <h1 className="text-4xl font-bold text-gray-900 mb-2">
	            标书全能王
	          </h1>
	          <p className="text-gray-600">
	            AI 驱动的标书自动审查与可视化分析
	          </p>
	        </div>

        {/* 上传区 */}
        {!analyzing && !result && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>上传标书文件</CardTitle>
              <CardDescription>
	                支持 PDF / Word(.docx) 格式，最大 50MB
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
	                      {file ? file.name : '点击选择 PDF / Word 文件'}
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
	                    标书分析
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
                <CardTitle>正在分析中...</CardTitle>
                <CardDescription>
                  AI 正在逐页扫描您的标书文件
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 进度显示 */}
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold">
                      正在扫描第 {currentPage} / {totalPages} 页
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
                    <RuleCard ruleId="R0001" title="价格一致性" status="running" />
                    <RuleCard ruleId="R0002" title="错别字检查" status="running" />
                    <RuleCard ruleId="R0003" title="身份信息" status="running" />
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
                    <p className="text-sm text-gray-600">总页数</p>
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
                    <p className="text-sm text-gray-600">致命问题</p>
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
                    <p className="text-sm text-gray-600">重大问题</p>
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
                    <p className="text-sm text-gray-600">格式问题</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-4 flex-wrap">
              <Button onClick={handleDownload} size="lg">
                <Download className="mr-2 h-5 w-5" />
                下载检查清单
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
                返回首页
              </Button>
            </div>

            {/* 错误列表 */}
            <div>
              <ErrorList errors={result.errors} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RuleCard({ ruleId, title, status }: { ruleId: string; title: string; status: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">{ruleId}</span>
          <Badge variant="secondary">{status}</Badge>
        </div>
        <p className="text-sm text-gray-600">{title}</p>
      </CardContent>
    </Card>
  );
}

function ErrorList({ errors }: { errors: ErrorItem[] }) {
  const p1Errors = errors.filter(e => e.priority === 'P1');
  const p2Errors = errors.filter(e => e.priority === 'P2');
  const p3Errors = errors.filter(e => e.priority === 'P3');

  return (
    <div className="space-y-6">
      {p1Errors.length > 0 && (
        <ErrorSection
          title="🚨 致命问题（P1）"
          description="直接导致废标的风险"
          errors={p1Errors}
          variant="destructive"
        />
      )}

      {p2Errors.length > 0 && (
        <ErrorSection
          title="📉 重大问题（P2）"
          description="可能导致扣分或不利评审"
          errors={p2Errors}
          variant="warning"
        />
      )}

      {p3Errors.length > 0 && (
        <ErrorSection
          title="✅ 格式问题（P3）"
          description="建议优化项"
          errors={p3Errors}
          variant="info"
        />
      )}
    </div>
  );
}

function ErrorSection({
  title,
  description,
  errors,
  variant
}: {
  title: string;
  description: string;
  errors: ErrorItem[];
  variant: 'destructive' | 'warning' | 'info';
}) {
  const borderColor = {
    destructive: 'border-red-500',
    warning: 'border-orange-500',
    info: 'border-yellow-500',
  }[variant];

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
                  第 {error.page_no} 页
                </Badge>
              </div>

              {/* 错误内容 - 如果是错别字则标红 */}
              {error.rule_id === 'R0002' ? (
                <div className="text-sm mb-2">
                  <span className="text-gray-600">错误内容：</span>
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
                    <span className="font-semibold">✓ 正确写法：</span>
                    <span className="bg-green-100 text-green-700 px-1 rounded ml-1">
                      {extractCorrectText(error.suggestion)}
                    </span>
                  </div>
                ) : (
                  <span>💡 {error.suggestion}</span>
                )}
              </div>

              <p className="text-xs text-gray-500">
                置信度: {(error.confidence * 100).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

