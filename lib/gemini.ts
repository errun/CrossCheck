import { AIResponse, ErrorItem } from '@/types';

/**
 * 调用 Gemini AI 分析标书内容
 */
export async function analyzeWithGemini(
  pdfText: string,
  modelType: string = 'default'
): Promise<{ errors: ErrorItem[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  // 如果文本太长，分批处理
  const MAX_CHUNK_SIZE = 100000;

  if (pdfText.length > MAX_CHUNK_SIZE) {
    console.log(`Text too long (${pdfText.length} chars), splitting into chunks...`);
    const chunks = splitIntoChunks(pdfText, MAX_CHUNK_SIZE);
    const results = await Promise.all(
      chunks.map((chunk, index) => {
        console.log(`Processing chunk ${index + 1}/${chunks.length}`);
        return callGeminiAPI(chunk, apiKey, modelType);
      })
    );

    // 合并结果
    return {
      errors: results.flatMap(r => r.errors)
    };
  }

  return callGeminiAPI(pdfText, apiKey, modelType);
}

/**
 * 调用 OpenRouter API (Gemini)
 */
async function callGeminiAPI(
  pdfText: string,
  apiKey: string,
  modelType: string = 'default'
): Promise<{ errors: ErrorItem[] }> {
  const prompt = buildPrompt(pdfText);

  // 根据 modelType 选择模型
  const modelMap: Record<string, string> = {
    'default': 'google/gemini-2.5-flash',
    'gpt5': 'openai/gpt-5',
    'gemini3': 'google/gemini-3-pro-preview',
    'claude35': 'anthropic/claude-3.5-sonnet',
  };

  const model = modelMap[modelType] || modelMap['default'];
  console.log(`Using model: ${model}`);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://blot.new',
        'X-Title': 'Blot Bid Checker',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse.substring(0, 500));
    
    return parseAIResponse(aiResponse);
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

/**
 * 构建 AI Prompt
 */
function buildPrompt(pdfText: string): string {
  return `# 角色与目标
**角色：** 您是专业的政府采购/招投标AI审查专家（Blot.new 审查核心）。
**任务目标：** 严格遵循以下《检查清单》对投标文件进行审查，识别所有废标（P1）、扣分（P2）、格式（P3）风险。
**核心原则：** 必须确保所有查出的问题，均能追溯到**具体的页码和段落**。

# 投标文件内容全文:
${pdfText.substring(0, 80000)}

# 检查清单与规则
| ID | 检查项 | 优先级 | 检查内容 |
| :--- | :--- | :--- | :--- |
| **R0001** | **价格一致性** | **P1** | 提取《开标一览表》和《投标报价明细表》中的大写、小写总价，比对是否完全一致 |
| **R0002** | **错别字与格式** | **P3** | 逐行扫描全文，识别：错别字、标点误用、多余空格、页码不一致。**对于错别字，suggestion 必须明确给出正确写法，格式："应为：正确内容"** |
| **R0003** | **身份信息一致性** | **P1** | 提取公司全称/简称/统一社会信用代码，确保完全一致 |
| **F2** | **强制条款负偏离** | **P1** | 提取所有带"★"的条款，确认是否完全满足 |
| **S1** | **重要参数负偏离** | **P2** | 提取所有带"▲"的条款，识别负偏离 |
| **S2** | **证明材料缺失** | **P2** | 检查技术支持资料是否有效 |
| **R4** | **签署完整性** | **P3** | 检查签署和公章状态 |

# 输出格式（必须返回 JSON）
请返回以下格式的 JSON，不要包含任何其他文字说明：
\`\`\`json
{
  "errors": [
    {
      "rule_id": "R0001",
      "title": "价格不一致",
      "severity": "Critical",
      "priority": "P1",
      "page_no": 12,
      "snippet": "开标一览表总价：100万元，报价明细表：99万元",
      "suggestion": "立即统一并核对所有表格价格",
      "confidence": 0.95
    },
    {
      "rule_id": "R0002",
      "title": "错别字",
      "severity": "Low",
      "priority": "P3",
      "page_no": 5,
      "snippet": "内容片面  、科学性",
      "suggestion": "应为：内容片面、科学性（删除多余空格）",
      "confidence": 0.9
    }
  ]
}
\`\`\`

**重要提示：**
1. 每个错误必须包含准确的 page_no（从文本中推断页码，如果无法推断则返回 0）
2. snippet 必须包含具体的错误内容（不超过50字）
3. confidence < 0.7 的不要返回
4. 如果某个规则没有发现问题，不要返回该规则的错误
5. severity 必须是: Critical, High, Medium, Low 之一
6. priority 必须是: P1, P2, P3 之一
7. 只返回 JSON，不要有其他解释文字
8. **优先返回 P1 和 P2 级别的错误，P3 级别的错误只返回最重要的前 5 个**
9. **每个规则最多返回 5 个错误示例**`;
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(aiResponse: string): { errors: ErrorItem[] } {
  try {
    // 尝试提取 JSON（可能被包裹在 ```json ``` 中）
    let jsonStr = aiResponse.trim();

    // 移除 markdown 代码块标记
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }

    // 尝试修复不完整的 JSON（如果被截断）
    jsonStr = jsonStr.trim();
    if (!jsonStr.endsWith('}')) {
      // 查找最后一个完整的错误对象
      const lastCompleteError = jsonStr.lastIndexOf('},');
      if (lastCompleteError > 0) {
        jsonStr = jsonStr.substring(0, lastCompleteError + 1) + '\n  ]\n}';
      } else {
        // 如果连一个完整的错误都没有，尝试闭合
        jsonStr = jsonStr + '\n  ]\n}';
      }
    }

    const parsed: AIResponse = JSON.parse(jsonStr);

    // 规范化错误字段并为每个错误生成 UUID
    const errors: ErrorItem[] = parsed.errors.map((err) => normalizeError(err));

    console.log(`Parsed ${errors.length} errors from AI response`);

    return { errors };
  } catch (e) {
    console.error('AI response parse error:', e);
    console.error('Raw response (first 1000 chars):', aiResponse.substring(0, 1000));

    // 尝试手动提取已有的错误
    try {
      const errorsMatch = aiResponse.match(/"errors"\s*:\s*\[([\s\S]*)/);
      if (errorsMatch) {
        // 尝试提取所有完整的错误对象
        const errorsStr = errorsMatch[1];
        const errorObjects = [];
        let depth = 0;
        let currentObj = '';

        for (let i = 0; i < errorsStr.length; i++) {
          const char = errorsStr[i];
          if (char === '{') depth++;
          if (char === '}') depth--;

          currentObj += char;

          if (depth === 0 && char === '}') {
            try {
              const obj = JSON.parse(currentObj.trim().replace(/,$/, ''));
              errorObjects.push(normalizeError(obj));
              currentObj = '';
            } catch (e) {
              // 跳过无法解析的对象
            }
          }
        }

        if (errorObjects.length > 0) {
          console.log(`Manually extracted ${errorObjects.length} errors`);
          return { errors: errorObjects };
        }
      }
    } catch (extractError) {
      console.error('Manual extraction failed:', extractError);
    }

    // 返回空数组而不是抛出错误
    return { errors: [] };
  }
}

// 规范化 AI 返回的错误字段，防止 priority / severity 大小写或空格导致前端统计为 0
function normalizeError(raw: any): ErrorItem {
  const rawSeverity = String(raw.severity || '').toLowerCase().trim();
  let severity: ErrorItem['severity'];

  if (rawSeverity === 'critical') severity = 'Critical';
  else if (rawSeverity === 'high') severity = 'High';
  else if (rawSeverity === 'medium') severity = 'Medium';
  else severity = 'Low';

  const rawPriority = String(raw.priority || '').toUpperCase().trim();
  let priority: ErrorItem['priority'];

  if (rawPriority.startsWith('P1')) priority = 'P1';
  else if (rawPriority.startsWith('P2')) priority = 'P2';
  else if (rawPriority.startsWith('P3')) priority = 'P3';
  else {
    // 如果 priority 异常，按严重程度推断一个合理的优先级
    if (severity === 'Critical') priority = 'P1';
    else if (severity === 'High') priority = 'P2';
    else priority = 'P3';
  }

  const pageNo = typeof raw.page_no === 'number'
    ? raw.page_no
    : Number(raw.page_no) || 0;

  const confidence = typeof raw.confidence === 'number'
    ? raw.confidence
    : Number(raw.confidence) || 0;

  return {
    error_id: crypto.randomUUID(),
    rule_id: String(raw.rule_id || ''),
    title: String(raw.title || ''),
    severity,
    priority,
    page_no: pageNo,
    snippet: String(raw.snippet || ''),
    suggestion: String(raw.suggestion || ''),
    confidence,
  };
}

/**
 * 将长文本分割成多个块
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    chunks.push(text.substring(start, start + chunkSize));
    start += chunkSize;
  }
  
  return chunks;
}

