import { AIResponse, ComplianceMatrixItem, ErrorItem, Language } from '@/types';
import { logger } from '@/lib/logger';

/**
 * 调用 Gemini AI 分析标书内容
 */
export async function analyzeWithGemini(
	pdfText: string,
	modelType: string = 'default',
	lang: Language = 'zh',
): Promise<{ errors: ErrorItem[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

	  // 如果文本太长，分批处理
  const MAX_CHUNK_SIZE = 100000;

  if (pdfText.length > MAX_CHUNK_SIZE) {
    logger.info('gemini: text too long, splitting into chunks', {
      textLength: pdfText.length,
      chunkSize: MAX_CHUNK_SIZE,
    });
    const chunks = splitIntoChunks(pdfText, MAX_CHUNK_SIZE);
	    const results = await Promise.all(
	      chunks.map((chunk, index) => {
	        logger.debug('gemini: processing chunk', {
	          chunkIndex: index + 1,
	          totalChunks: chunks.length,
	          lang,
	        });
	        return callGeminiAPI(chunk, apiKey, modelType, lang);
	      })
	    );

    // 合并结果
    return {
      errors: results.flatMap(r => r.errors)
    };
  }

		  return callGeminiAPI(pdfText, apiKey, modelType, lang);
}

/**
	 * 提取 RFP 中的强制性要求，生成合规矩阵（matrix 模式）
	 */
export async function extractComplianceMatrix(
	  pdfText: string,
	  modelType: string = 'default',
	  lang: Language = 'zh',
): Promise<{ items: ComplianceMatrixItem[] }> {
	  const apiKey = process.env.OPENROUTER_API_KEY;

	  if (!apiKey) {
	    throw new Error('OPENROUTER_API_KEY is not configured');
	  }

	  // 合规矩阵目前只对前 80k 字符进行分析，避免提示词过长
	  const MAX_CHUNK_SIZE = 80000;
	  const truncated = pdfText.substring(0, MAX_CHUNK_SIZE);
	  const prompt = buildComplianceMatrixPrompt(truncated, lang);

	  // 复用与标书扫描相同的模型映射
	  const modelMap: Record<string, string> = {
	    default: 'google/gemini-2.5-flash',
	    gpt5: 'openai/gpt-5',
	    gemini3: 'google/gemini-3-pro-preview',
	    claude35: 'anthropic/claude-3.5-sonnet',
	  };
	  const model = modelMap[modelType] || modelMap.default;

		  try {
		    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		      method: 'POST',
		      headers: {
		        'Content-Type': 'application/json',
		        Authorization: `Bearer ${apiKey}`,
		        // 注意：Header 必须保持 ASCII，不能包含中文
		        // 新主域名：rfpai.io
		        'HTTP-Referer': 'https://rfpai.io',
		        'X-Title': 'CrossCheck Compliance Matrix',
		      },
	      body: JSON.stringify({
	        model,
	        messages: [
	          {
	            role: 'user',
	            content: prompt,
	          },
	        ],
	        temperature: 0.2,
	        max_tokens: 6000,
	      }),
	    });

	    if (!response.ok) {
	      const errorText = await response.text();
	      throw new Error(`OpenRouter API error (matrix): ${response.status} - ${errorText}`);
	    }

	    const data = await response.json();
	    const aiResponse = data.choices[0].message.content as string;
	    logger.debug('gemini: matrix AI response preview', {
	      preview: aiResponse.substring(0, 500),
	    });
	    return parseComplianceMatrixResponse(aiResponse);
	  } catch (error) {
	    logger.error('gemini: compliance matrix API call failed', {
	      error: (error as Error)?.message,
	    });
	    throw error;
	  }
}

/**
 * 调用 OpenRouter API (Gemini)
 */
async function callGeminiAPI(
	pdfText: string,
	apiKey: string,
	modelType: string = 'default',
	lang: Language = 'zh',
): Promise<{ errors: ErrorItem[] }> {
	  const prompt = buildPrompt(pdfText, lang);

  // 根据 modelType 选择模型
  const modelMap: Record<string, string> = {
    'default': 'google/gemini-2.5-flash',
    'gpt5': 'openai/gpt-5',
    'gemini3': 'google/gemini-3-pro-preview',
    'claude35': 'anthropic/claude-3.5-sonnet',
  };

  const model = modelMap[modelType] || modelMap['default'];
  logger.info('gemini: using model', { model, modelType, lang });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
		        // OpenRouter 推荐带上来源站点和应用标题，注意 Header 只能使用 ASCII 字符
		        // 否则在 Node 的 fetch/undici 中会因为 ByteString 校验失败而报错
		        // 新主站域名：rfpai.io
		        'HTTP-Referer': 'https://rfpai.io',
		        'X-Title': 'CrossCheck RFP Checker',
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
    
    logger.debug('gemini: AI response preview', {
      preview: aiResponse.substring(0, 500),
    });
    
    return parseAIResponse(aiResponse);
  } catch (error) {
    logger.error('gemini: API call failed', {
      error: (error as Error)?.message,
    });
    throw error;
  }
}

	/**
		 * 构建 AI Prompt（根据语言选择中英文提示）
		 */
		function buildPrompt(pdfText: string, lang: Language): string {
	  const truncated = pdfText.substring(0, 80000);

	  if (lang === 'en') {
	    return `# Role & Objective
You are an expert AI assistant specialized in government procurement and bid proposal review (CrossCheck core engine).

**Goal:** Strictly follow the following **Checklist & Rules** to review the bid document, and identify all risks in three levels:
- **P1**: Fatal issues that may directly cause bid rejection
- **P2**: Major issues that may cause score deduction or disadvantages
- **P3**: Formatting / minor issues

**Key principle:** Every issue you return **must be traceable to a specific page number and text snippet**.

# Full bid document text
${truncated}

# Checklist & Rules
| ID | Rule | Priority | Description |
| :--- | :--- | :--- | :--- |
| **R0001** | **Price consistency** | **P1** | Extract the total price (both uppercase and lowercase if available) from the “Bid opening summary table” and the “Detailed quotation table”, and check if they are fully consistent. |
| **R0002** | **Typos & formatting** | **P3** | Scan the whole document line by line to find typos, wrong punctuation, extra spaces, inconsistent page numbers, etc. **For typo errors, the suggestion field must clearly give the corrected text in one of these formats: "should be: CORRECT_TEXT" or "correct text: CORRECT_TEXT".** |
| **R0003** | **Identity information consistency** | **P1** | Extract the company full name, short name, and unified social credit code (or registration number) and make sure they are fully consistent. |
| **F2** | **Mandatory clauses negative deviation** | **P1** | Extract all clauses marked with "★" and check whether they are fully satisfied. |
| **S1** | **Important technical parameters negative deviation** | **P2** | Extract all clauses marked with "▲" and identify any negative deviation. |
| **S2** | **Missing supporting documents** | **P2** | Check whether all required technical/supporting documents are provided and valid. |
| **R4** | **Signature & stamping completeness** | **P3** | Check signatures, company chop / stamps, and whether all required pages are signed and stamped. |

# Output format (MUST be valid JSON)
Return **only** a JSON object in the following format. Do **not** include any extra explanation or commentary:
\`\`\`json
{
  "errors": [
    {
      "rule_id": "R0001",
      "title": "Inconsistent total price between tables",
      "severity": "Critical",
      "priority": "P1",
      "page_no": 12,
      "snippet": "Bid opening summary total: 1,000,000; detailed quotation total: 990,000",
      "suggestion": "Unify and re-check all price tables to ensure the totals are exactly the same.",
      "confidence": 0.95
    },
    {
      "rule_id": "R0002",
      "title": "Typo in text",
      "severity": "Low",
      "priority": "P3",
      "page_no": 5,
      "snippet": "conteent  , scientific",
      "suggestion": "should be: content, scientific (remove the extra space and fix the typo)",
      "confidence": 0.9
    }
  ]
}
\`\`\`

## Important requirements
1. Each error **must** contain an accurate **page_no**. If you cannot infer the exact page number, use 0.
2. **snippet** must contain the concrete problematic text (no more than 50 characters if possible).
3. Do **not** return errors with **confidence < 0.7**.
4. If a rule has no issues, **do not** include that rule in the errors array.
5. **severity** must be one of: Critical, High, Medium, Low.
6. **priority** must be one of: P1, P2, P3.
7. Return **only JSON**, with no extra explanation around it.
8. **Prioritize P1 and P2 issues. P3 issues should only include the most important 5 items.**
9. **At most 5 error examples per rule.**`;
	  }

		  // 默认中文提示词
		  return `# 角色与目标
**角色：** 您是专业的政府采购/招投标AI审查专家（CrossCheck 审查核心）。
**任务目标：** 严格遵循以下《检查清单》对投标文件进行审查，识别所有废标（P1）、扣分（P2）、格式（P3）风险。
**核心原则：** 必须确保所有查出的问题，均能追溯到**具体的页码和段落**。

# 投标文件内容全文:
${truncated}

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
	 * 构建 AI Prompt（合规矩阵模式：从 RFP 中提取强制性要求）
	 */
function buildComplianceMatrixPrompt(rfpText: string, lang: Language): string {
		  const base = `You are an expert RFP analyst.
Your task is to read the following RFP document and extract **all mandatory requirements**.

- Focus on sentences or clauses that express mandatory obligations, especially those containing keywords such as:
  - "shall", "must", "will", "required", "mandatory"
- For Chinese RFPs, also include phrases such as: "必须", "应当", "应当", "不得", "须提供".

For each mandatory requirement you find, return one JSON object with:
- "id": an incremental integer starting from 1
- "text": the original requirement sentence or clause (as concise as possible but complete)
- "page": the page number if you can infer it (otherwise 0)
- "section": the reference section number or heading, e.g. "3.1", "4.2.1" or a short section title.

Return **only** a JSON array in the following format, with no extra explanation:
\`\`\`json
[
  {
    "id": 1,
    "text": "The bidder shall provide at least three similar project references in the last three years.",
    "page": 5,
    "section": "3.1"
  },
  {
    "id": 2,
    "text": "The system must support 7x24 hours operation with no single point of failure.",
    "page": 8,
    "section": "4.2.1"
  }
]
\`\`\`

Important rules:
1. Do NOT include optional or purely descriptive sentences.
2. Prefer requirements that clearly describe what the bidder **shall/must** do or provide.
3. If you cannot infer page number or section, use 0 for page and an empty string for section.
4. Output must be valid JSON array, with no trailing commas.

Now analyze the following RFP text and output the JSON array of mandatory requirements:`;

	  return `${base}

----- BEGIN RFP TEXT -----
${rfpText}
----- END RFP TEXT -----`;
}

/**
	 * 解析 AI 返回的合规矩阵 JSON
	 */
function parseComplianceMatrixResponse(aiResponse: string): { items: ComplianceMatrixItem[] } {
	  try {
	    let jsonStr = aiResponse.trim();

	    // 移除 markdown 代码块标记
	    if (jsonStr.startsWith('```json')) {
	      jsonStr = jsonStr.replace(/```json\s*/i, '').replace(/```\s*$/i, '');
	    } else if (jsonStr.startsWith('```')) {
	      jsonStr = jsonStr.replace(/```\s*/i, '').replace(/```\s*$/i, '');
	    }

	    jsonStr = jsonStr.trim();

	    // 如果前后包含多余说明，只保留数组部分
	    if (!jsonStr.startsWith('[')) {
	      const firstBracket = jsonStr.indexOf('[');
	      const lastBracket = jsonStr.lastIndexOf(']');
	      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
	        jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
	      }
	    }

	    const rawItems: any[] = JSON.parse(jsonStr);
	    const items: ComplianceMatrixItem[] = rawItems.map((raw, index) => ({
	      id: typeof raw.id === 'number' ? raw.id : index + 1,
	      text: String(raw.text || raw.requirement || ''),
	      page: typeof raw.page === 'number' ? raw.page : Number(raw.page) || 0,
	      section: String(raw.section || raw.section_id || ''),
	    }));

	    logger.info('gemini: parsed compliance requirements', {
	      count: items.length,
	    });
	    return { items };
	  } catch (e) {
	    logger.error('gemini: compliance matrix parse error', {
	      error: (e as Error)?.message,
	      preview: aiResponse.substring(0, 1000),
	    });
	    return { items: [] };
	  }
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

    logger.info('gemini: parsed AI errors', { count: errors.length });

    return { errors };
  } catch (e) {
    logger.error('gemini: AI response parse error', {
      error: (e as Error)?.message,
      preview: aiResponse.substring(0, 1000),
    });

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
          logger.warn('gemini: manually extracted errors after parse failure', {
            count: errorObjects.length,
          });
          return { errors: errorObjects };
        }
      }
    } catch (extractError) {
      logger.error('gemini: manual extraction failed', {
        error: (extractError as Error)?.message,
      });
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
