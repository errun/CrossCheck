import {
	AIResponse,
	BidComparisonItem,
	BidComparisonSummary,
	BidDraft,
	ComplianceStatus,
	ErrorItem,
	Language,
	MatrixItem,
	YesNo,
} from '@/types';
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
): Promise<{ items: MatrixItem[] }> {
	  const apiKey = process.env.OPENROUTER_API_KEY;

	  if (!apiKey) {
	    throw new Error('OPENROUTER_API_KEY is not configured');
	  }

	  // 合规矩阵：先截断到一个上限，再进一步分块（避免一次性返回过大响应导致连接中断/超时）
	  const MAX_MATRIX_INPUT_CHARS = 80000;
	  const truncated = pdfText.substring(0, MAX_MATRIX_INPUT_CHARS);

	  // 更小的 chunk 能显著降低单次请求的生成时长与返回体积，提高稳定性
	  const MATRIX_CHUNK_SIZE = 30000;
	  const MATRIX_CHUNK_OVERLAP = 1000;
	  const chunks =
		truncated.length > MATRIX_CHUNK_SIZE
			? splitIntoChunksWithOverlap(truncated, MATRIX_CHUNK_SIZE, MATRIX_CHUNK_OVERLAP)
			: [truncated];

	  // 复用与标书扫描相同的模型映射
	  const modelMap: Record<string, string> = {
	    default: 'google/gemini-2.5-flash',
	    gpt5: 'openai/gpt-5',
	    gemini3: 'google/gemini-3-pro-preview',
	    claude35: 'anthropic/claude-3.5-sonnet',
	  };
	  const model = modelMap[modelType] || modelMap.default;

		  try {
			const allItems: MatrixItem[] = [];

			for (let i = 0; i < chunks.length; i++) {
				const chunk = chunks[i];
				const prompt = buildComplianceMatrixPrompt(chunk, lang, {
					chunkIndex: i + 1,
					totalChunks: chunks.length,
				});

				logger.info('gemini: matrix calling OpenRouter', {
					chunkIndex: i + 1,
					totalChunks: chunks.length,
					chunkChars: chunk.length,
					model,
					modelType,
					lang,
				});

				const aiResponse = await callOpenRouterChatCompletionWithRetry({
					apiKey,
					model,
					prompt,
					temperature: 0.2,
					maxTokens: 3500,
					title: 'rfpai Compliance Matrix',
					featureTag: 'matrix',
				});

				logger.debug('gemini: matrix AI response preview', {
					chunkIndex: i + 1,
					preview: String(aiResponse || '').substring(0, 500),
				});

				const parsed = parseComplianceMatrixResponse(String(aiResponse || ''));
				allItems.push(...(parsed.items || []));
			}

			// 去重 + 重排 requirementId
			const seen = new Set<string>();
			const deduped: MatrixItem[] = [];
			for (const item of allItems) {
				const key = normalizeRequirementKey(item?.requirementText);
				if (!key) continue;
				if (seen.has(key)) continue;
				seen.add(key);
				deduped.push(item);
			}

			const reindexed = deduped.map((item, idx) => ({
				...item,
				requirementId: String(idx + 1),
			}));

			logger.info('gemini: compliance matrix merged requirements', {
				totalRaw: allItems.length,
				totalDeduped: reindexed.length,
				chunks: chunks.length,
			});

			return { items: reindexed };
		  } catch (error: any) {
			logger.error('gemini: compliance matrix API call failed', {
				error: error?.message,
				causeCode: error?.cause?.code,
				causeName: error?.cause?.name,
				causeMessage: error?.cause?.message,
			});
			throw error;
		  }
}

function normalizeRequirementKey(text: unknown): string {
	if (typeof text !== 'string') return '';
	return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error: any): boolean {
	const message = error?.message;
	const code = error?.cause?.code;
	return (
		message === 'fetch failed' ||
		code === 'UND_ERR_CONNECT_TIMEOUT' ||
		code === 'UND_ERR_HEADERS_TIMEOUT' ||
		code === 'UND_ERR_SOCKET' ||
		code === 'ECONNRESET' ||
		code === 'ETIMEDOUT' ||
		code === 'EAI_AGAIN' ||
		code === 'ENOTFOUND'
	);
}

async function callOpenRouterChatCompletionWithRetry(params: {
	apiKey: string;
	model: string;
	prompt: string;
	temperature: number;
	maxTokens: number;
	title: string;
	featureTag: string;
}): Promise<string> {
	const { apiKey, model, prompt, temperature, maxTokens, title, featureTag } = params;
	const maxAttempts = 3;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const controller = new AbortController();
		const timeoutMs = 60_000;
		const timer = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
					// 注意：Header 必须保持 ASCII
					'HTTP-Referer': 'https://rfpai.io',
					'X-Title': title,
				},
				body: JSON.stringify({
					model,
					messages: [{ role: 'user', content: prompt }],
					temperature,
					max_tokens: maxTokens,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`OpenRouter API error (${featureTag}): ${response.status} - ${errorText}`);
			}

			const data = await response.json();
			return String(data?.choices?.[0]?.message?.content ?? '');
		} catch (error: any) {
			const retryable = isRetryableFetchError(error);
			logger.warn('gemini: OpenRouter call failed', {
				featureTag,
				attempt,
				maxAttempts,
				retryable,
				error: error?.message,
				causeCode: error?.cause?.code,
				causeName: error?.cause?.name,
			});

			if (attempt < maxAttempts && retryable) {
				await sleep(500 * attempt);
				continue;
			}
			throw error;
		} finally {
			clearTimeout(timer);
		}
	}

	return '';
}

		/**
		 * 根据 RFP 提取的合规矩阵 + 投标文件全文，生成覆盖情况对比
		 */
export async function compareRfpAndBid(
		requirements: MatrixItem[],
		bidText: string,
		modelType: string = 'default',
		lang: Language = 'zh',
	): Promise<{ items: BidComparisonItem[]; summary: BidComparisonSummary }> {
		const apiKey = process.env.OPENROUTER_API_KEY;

		if (!apiKey) {
			throw new Error('OPENROUTER_API_KEY is not configured');
		}

		const MAX_BID_CHARS = 80000;
		const truncatedBid = bidText.substring(0, MAX_BID_CHARS);
		const prompt = buildBidComparePrompt(requirements, truncatedBid, lang);

		// 与其他功能共用模型映射
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
					// Header 只能为 ASCII
					'HTTP-Referer': 'https://rfpai.io',
					'X-Title': 'rfpai RFP vs Bid Comparator',
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
				throw new Error(`OpenRouter API error (bid-compare): ${response.status} - ${errorText}`);
			}

			const data = await response.json();
			const aiResponse = data.choices[0].message.content as string;
			logger.debug('gemini: bid-compare AI response preview', {
				preview: aiResponse.substring(0, 500),
			});
			return parseBidCompareResponse(aiResponse, requirements);
		} catch (error) {
			logger.error('gemini: bid-compare API call failed', {
				error: (error as Error)?.message,
			});
			throw error;
		}
	}

		/**
		 * 根据招标文件全文，生成一份投标文件草稿（不返回 JSON，直接返回正文文本）
		 */
		export async function generateBidDraftFromRfp(
			rfpText: string,
			modelType: string = 'default',
			lang: Language = 'zh',
		): Promise<BidDraft> {
			const apiKey = process.env.OPENROUTER_API_KEY;

			if (!apiKey) {
				throw new Error('OPENROUTER_API_KEY is not configured');
			}

			// 控制提示词长度，避免上下文过长
			const MAX_RFP_CHARS = 80000;
			const truncated = rfpText.substring(0, MAX_RFP_CHARS);
			const prompt = buildBidDraftPrompt(truncated, lang);

			// 与其他功能共用模型映射
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
						// Header 只能使用 ASCII 字符
						'HTTP-Referer': 'https://rfpai.io',
						'X-Title': 'rfpai Bid Draft Generator',
					},
					body: JSON.stringify({
						model,
						messages: [
							{
								role: 'user',
								content: prompt,
							},
						],
						// 稍微提高 temperature，让生成文案更有“人味”，但仍保持一定稳定性
						temperature: 0.5,
						max_tokens: 7000,
					}),
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(`OpenRouter API error (bid-draft): ${response.status} - ${errorText}`);
				}

				const data = await response.json();
				const aiResponse = data.choices[0].message.content as string;
				logger.debug('gemini: bid-draft AI response preview', {
					preview: aiResponse.substring(0, 500),
				});
				return { content: aiResponse };
			} catch (error) {
				logger.error('gemini: bid-draft API call failed', {
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
		        'X-Title': 'rfpai RFP Checker',
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
You are an expert AI assistant specialized in government procurement and bid proposal review (rfpai core engine).

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
**角色：** 您是专业的政府采购/招投标AI审查专家（rfpai 审查核心）。
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
function buildComplianceMatrixPrompt(
	rfpText: string,
	lang: Language,
	chunkInfo?: { chunkIndex: number; totalChunks: number },
): string {
		  const baseEn = `You are an expert RFP analyst.
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
	5. Keep each item's text concise (preferably <= 300 characters).
	6. If the chunk contains many requirements, you may return at most 120 items for this chunk.

	${
		chunkInfo && chunkInfo.totalChunks > 1
			? `Chunking note: This is part ${chunkInfo.chunkIndex} of ${chunkInfo.totalChunks}. Extract requirements ONLY from this part. Do not reference other parts.`
			: ''
	}

Now analyze the following RFP text and output the JSON array of mandatory requirements:`;

		  const baseZh = `你是资深招标文件（RFP）分析专家。
你的任务是从下方招标文件文本中提取 **所有强制性要求/硬性条款**。

- 重点关注包含“必须/应当/须/不得/需要/要求/shall/must/required”等表达强制义务的句子或条款。

对每条强制性要求，返回一个 JSON 对象，包含：
- "id": 从 1 开始的递增整数
- "text": 要求原文（尽量精炼但需完整）
- "page": 能推断则给页码，否则 0
- "section": 能推断则给章节号/标题，否则空字符串

重要规则：
1. 不要包含可选项或纯描述性内容。
2. 输出必须是 **有效 JSON 数组**，不要任何额外解释文字。
3. 每条 text 尽量简短（建议 <= 300 字）。
4. 若本段落包含很多要求，可最多返回 120 条。

${
	chunkInfo && chunkInfo.totalChunks > 1
		? `分段提示：这是第 ${chunkInfo.chunkIndex} / ${chunkInfo.totalChunks} 段。只从本段文本中提取要求，不要引用其他段落。`
		: ''
}

现在开始分析下方 RFP 文本并输出 JSON 数组：`;

		  const base = lang === 'zh' ? baseZh : baseEn;

	  return `${base}

----- BEGIN RFP TEXT -----
${rfpText}
----- END RFP TEXT -----`;
}

	/**
	 * 构建 RFP 要求 vs 投标文件对比 Prompt
	 */
	function buildBidComparePrompt(
		requirements: MatrixItem[],
		bidText: string,
		lang: Language,
	): string {
		const requirementsJson = JSON.stringify(
			requirements.map((r) => ({
				id: r.requirementId,
				text: r.requirementText,
				page: r.sourcePage ?? 0,
				section: r.sourceSection ?? '',
			})),
			null,
			2,
		);

		if (lang === 'en') {
			return `You are an expert bid consultant.

You are given:
1) A list of mandatory RFP requirements (JSON array below).
2) The full text of a bid/proposal document.

For each requirement, decide whether the bid **fully covers**, **partially covers**, or **does not cover** the requirement.

### Output format (MUST be valid JSON, no extra commentary)
Return a JSON object like:
\`\`\`json
{
  "items": [
    {
      "id": 1,
      "requirement_id": 1,
      "requirement_text": "The bidder shall provide ...",
      "status": "covered", // one of: covered, partially_covered, missing
      "evidence": "Short quote or description of where it is addressed in the bid",
      "comment": "Any short explanation or risk note"
    }
  ],
  "summary": {
    "total": 10,
    "covered": 6,
    "partially_covered": 2,
    "missing": 2
  }
}
\`\`\`

Rules:
1. If the bid clearly and fully satisfies the requirement, use status = "covered".
2. If the bid mentions it but in an incomplete or weak way, use status = "partially_covered".
3. If you cannot find any relevant content, use status = "missing" and set evidence to "not found".
4. evidence should be short (<= 200 characters) and concrete.
5. summary counts must be consistent with items.

### RFP mandatory requirements (JSON array)
${requirementsJson}

### Bid / proposal full text (truncated)
${bidText}`;
		}

		// 中文 Prompt
		return `你是一名资深招投标顾问。

你将拿到：
1）一份从招标文件（RFP）中提取出来的【强制性要求列表】（下面的 JSON 数组）；
2）一份投标文件的全文内容。

请针对每一条 RFP 要求，判断投标文件是：**完全覆盖**、**部分覆盖**，还是**未覆盖**。

### 输出格式（必须是合法 JSON，不要额外解释）
请严格返回如下结构：
\`\`\`json
{
  "items": [
    {
      "id": 1,
      "requirement_id": 1,
      "requirement_text": "投标人应当提供不少于三份近三年的类似业绩证明……",
      "status": "covered", // covered / partially_covered / missing 三选一
      "evidence": "简要说明在投标文件哪里体现了该要求，可包含少量引用文本",
      "comment": "补充说明或风险提示"
    }
  ],
  "summary": {
    "total": 10,
    "covered": 6,
    "partially_covered": 2,
    "missing": 2
  }
}
\`\`\`

规则：
1. 如果投标文件中对该要求有清晰且充分的响应，status = "covered"；
2. 如果有提到但不够完整、存在缺口或表述较弱，status = "partially_covered"；
3. 如果基本找不到相关内容，status = "missing"，并将 evidence 设为 "not found" 或类似说明；
4. evidence 需尽量简短（不超过 200 字），但要具体；
5. summary 中的各项计数必须与 items 一致。

### 招标文件强制性要求列表（JSON 数组）
${requirementsJson}

### 投标文件全文（已截断）
			${bidText}`;
		}

	/**
	 * 构建根据 RFP 生成投标文件草稿 Prompt
	 */
	function buildBidDraftPrompt(rfpText: string, lang: Language): string {
		if (lang === 'en') {
			return `You are a senior bid/proposal writer working for a bidder.

You will receive the main content of an RFP (Request for Proposal). Based on this RFP, draft a **full proposal document** in English.

Requirements:
1. Use formal, professional proposal language.
2. Structure the document with clear sections, for example:
   - Executive Summary
   - Understanding of Requirements
   - Overall Solution Approach
   - Technical Solution
   - Project Management & Implementation Plan
   - Service, Support & SLAs
   - Compliance & Risk Mitigation
   - Commercial/Business Terms response (high-level, no specific prices)
3. Do not simply copy the RFP text. Instead, **rephrase and respond** from the bidder's perspective while aligning with the RFP.
		4. You may use Markdown headings (#, ##, ###) to structure the document so it can be easily copied into Word.
		5. Highlight how the proposed solution addresses key evaluation criteria or scoring points if they can be inferred from the RFP.
		6. **Do NOT add any meta-intro sentences** such as "This is the generated bid draft" or "Below is the proposal". The **first line of your output must already be part of the proposal itself** (for example, a cover page title or the first section heading).
		
		Now read the following RFP text and output the **complete proposal draft** as continuous text (Markdown is OK). Do NOT output JSON or any extra explanations, and do not prepend any additional commentary before the proposal.
		
		----- BEGIN RFP TEXT -----
		${rfpText}
		----- END RFP TEXT -----`;
		}

				// 中文 Prompt：面向招投标场景的专家级投标文件生成
				return `# 角色
你是一名具有 10 年招投标经验的**高级投标文件编写专家**，代表投标人撰写正式投标文件草稿。

# 输入说明
- [TENDER_DOC] = 招标文件原文（你在下方看到的全部文本），是**唯一可信的信息来源**。

你需要在充分阅读 [TENDER_DOC] 的基础上，生成一份**格式严格合规、内容专业、充分响应招标要求**的中文投标文件草稿。

---

## 一、结构绝对合规（严格遵循“投标文件格式”）
1. 首先在 [TENDER_DOC] 中定位标题为“投标文件格式”或含义相近的章节，例如：“第四章 投标文件格式”“投标文件格式及要求”等。
2. 仔细阅读该章节中给出的**投标文件组成、章节标题、格式样张、顺序要求**。
3. 你生成的投标文件必须：
   - **严格按照“投标文件格式”章节给出的目录结构及标题层级来组织**；
   - 对该章节中出现的每一项章节、小节、表格名称、格式名称，都在输出中一一对应；
   - **不得新增“投标文件格式”中不存在的章节或子标题**，也不得随意删除或合并原有章节；
   - 标题文字应尽量与原文保持一致（仅可纠正常识性错别字）。
4. 如果 [TENDER_DOC] 中确实没有明确的“投标文件格式”章节：
   - 以文中“投标文件组成”“投标文件顺序”等条款为依据组织结构；
   - 若仍无法判断，则采用通用结构草拟，但需在显眼位置标注“[结构需根据招标文件最终确认]”。

		在输出时，请用 Markdown 标题表示层级：
		- 一级标题用 # 开头（例如：# 第一章 ……）
		- 二级标题用 ## 开头（例如：## 第一节 ……）
		- 三级标题用 ### 开头（例如：### （一）……）

---

## 二、基础信息自动提取与填充
1. 从 [TENDER_DOC] 的封面、招标公告、第一章或项目信息表中，**提取以下关键信息**（若能找到）：
   - 项目名称
   - 项目编号 / 招标编号
   - 采购人 / 招标人名称
   - 投标截止时间
2. 在编写以下标准表单或格式时（示例）：
   - 投标函
   - 法定代表人身份证明书
   - 授权委托书
   - 投标保证金承诺或声明
   - 其他“格式一、格式二…”类型的标准文本

   请将上述提取的信息**自动填入相应位置**。

		3. 对于在 [TENDER_DOC] 中**无法确定或未提供**的字段，统一使用占位符：
		   - 需用户自行填写的字段统一标注为：[需用户填写]

   绝不要自行编造项目名称、编号、金额等关键信息。

---

## 三、智能内容生成（结合采购品类的专业方案）
1. 先根据 [TENDER_DOC] 内容识别本项目的**主要采购品类**（可多选）：
   - 若出现“生鲜、蔬菜、水果、肉类、冷链、食堂、配送中心”等关键词，将其识别为 **生鲜食品 / 食材配送**；
   - 若出现“酒店、宾馆、客房用品、一次性用品、洗漱用品”等关键词，将其识别为 **酒店耗材 / 酒店用品**；
   - 若出现“服务器、存储、网络设备、台式机、笔记本、打印机、软件实施”等关键词，将其识别为 **IT 设备与系统集成**；
   - 若出现“保洁、保安、物业服务、运维服务、劳务派遣”等关键词，将其识别为 **物业 / 运维 / 服务类项目**；
   - 若为其他品类，请根据文本内容自行归纳，并在方案中用简短文字说明你认为的品类。

2. 根据识别到的品类，在相关章节（如“技术方案”“服务方案”“实施方案”“售后服务”“项目管理”等）中撰写**专业、可落地的方案内容**，例如：
   - **生鲜食品类**：
     - 冷链运输与温控管理方案；
     - 食品安全与检测流程（含进货查验、留样制度）；
     - 从业人员健康证与日常培训管理；
     - 异常天气/突发事件下的应急保障与补货机制；
   - **酒店耗材类**：
     - 材质环保与符合国家/行业标准的说明；
     - 破损包赔机制与现场更换响应时间；
     - 仓储与备货能力（覆盖周期、库存周转）；
     - 旺季与重大活动期间的供应保障方案；
   - **IT 设备与系统集成类**：
     - 设备安装、调试与上线验收流程；
     - 技术架构、网络与安全策略的总体说明；
     - 质保期服务内容、服务响应时间、备件保障；
     - 远程支持与现场服务机制；
   - **物业 / 运维 / 服务类项目**：
     - 项目组织架构与岗位职责；
     - 人员配置与排班计划；
     - 服务标准、考核指标与奖惩机制；
     - 投诉处理与持续改进机制。

3. 在商务条款、服务承诺、质保承诺等位置，**务必多次但自然地使用以下关键表述（不要生硬堆砌）：**
   - “完全响应（Fully Responsive）”
   - “严格执行（Strict Execution）”
   - “质保期内免费更换（Free replacement within warranty）”

   可以嵌入在完整句子中，例如：“本公司对招标文件中的服务标准完全响应，并将在合同期内严格执行各项考核要求。”

---

## 四、强制性条款与无效投标条件的实质性响应
1. 在 [TENDER_DOC] 中重点扫描以下内容：
   - 所有带“★”标记的条款（通常为强制性条款或重要条款）；
   - 与“无效投标”“投标无效情形”“将被视为无效投标”等相关的条款；
   - 明确写有“不得”“必须”“应当”“须提供”等强制性表述的内容。

2. 在“技术偏离表”“商务条款偏离表”或专门章节中，给出**集中的实质性响应**：
   - 对所有带“★”的条款，统一明确承诺：
     - “对招标文件中所有带“★”标注的强制性条款，本公司承诺完全响应，无任何负偏离，并在实际履约过程中严格执行。”
   - 对“无效投标”相关条件，统一声明：
     - “本公司在本次投标活动中将严格执行上述无效投标条款的约束，保证不触犯任何一项，无任何可能导致投标文件被判为无效的情形。”

3. 如 [TENDER_DOC] 提供了技术/商务偏离表的固定格式：
   - 请按照原表格的列名和顺序，用 Markdown 表格形式还原；
   - 如无实际偏离，可在偏离内容栏中统一填写“无偏离”或留空，并在文字说明中再次强调“完全响应、严格执行”。

---

## 五、采购清单与报价表格（价格列用占位符）
1. 在 [TENDER_DOC] 中查找与报价/清单有关的章节，例如：
   - “采购清单”“招标货物一览表”“服务需求一览表”；
   - “投标报价一览表”“分项报价表”“总报价表”“开标一览表”等。

2. 对于**明确给出样张或列名**的表格：
   - 在输出的投标文件中，使用 Markdown 表格语法**逐字还原原文中的列名和排列顺序**；
   - 从采购清单中提取每行的“货物/服务名称、规格型号、单位、数量”等字段，填入表格对应列；
		   - 对于所有涉及“单价、合价、总价、税额、合计金额”等金额类字段，统一填入占位符：[待填]
   - 绝对禁止自行虚构或估算任何价格数值。

3. 如原文未给出完整报价表结构：
   - 可以根据文字描述归纳出合理的表头；
   - 但需在表格上方标注：“[报价表结构需根据招标文件最终版确认]”。

---

## 六、语言风格与输出格式要求
1. 全文使用**正式、严谨的中文书面语**，符合政府采购和招投标文书习惯，不使用口语化表达。
2. 整体输出必须是**纯 Markdown 文本**，不得输出 JSON 或任何额外解释性文字（例如“解析如下”“注意事项”等）。
3. 标题层级应与 [TENDER_DOC] 中“投标文件格式”章节保持一致，便于后续导出为 Word 时自动转换为章节标题。
4. 对于需要列表或条款的部分，优先使用有序列表（1. 2. 3.）或无序列表（-）。
5. 所有表格使用标准 Markdown 表格语法，确保后续可以解析为 Word 表格。

---

## 七、开始生成
现在，请按照以上所有规则，对下方的 [TENDER_DOC] 进行通读和分析，并生成一份**完整、专业、格式合规的中文投标文件草稿**。

特别强调：
- 以 [TENDER_DOC] 为唯一事实依据；
- 结构严格服从“投标文件格式”章节；
- 价格一律使用“[待填]”占位；
		- 无法确定的信息一律使用“[需用户填写]”占位；
		- **正文开头不要出现诸如“这里是为您生成的投标文件草稿”“以下是投标文件草稿”等提示性语句，输出的第一行必须直接是投标文件正文内容本身（如“正本”“第一章 …… ”等）**。

----- 开始招标文件 [TENDER_DOC] 原文 -----
${rfpText}
----- 结束招标文件 [TENDER_DOC] 原文 -----`;
	}

function normalizeYesNo(value: unknown): YesNo | undefined {
	if (value === undefined || value === null) return undefined;
	const v = String(value).trim().toUpperCase();
	if (!v) return '';
	if (v === 'Y' || v === 'YES' || v === 'TRUE') return 'Y';
	if (v === 'N' || v === 'NO' || v === 'FALSE') return 'N';
	return '';
}

function normalizeComplianceStatus(value: unknown): ComplianceStatus | undefined {
	if (value === undefined || value === null) return undefined;
	const v = String(value).trim().toUpperCase();
	if (!v) return '';
	if (v === 'Y' || v === 'YES' || v === 'COMPLIANT') return 'Y';
	if (v === 'N' || v === 'NO' || v === 'NONCOMPLIANT' || v === 'NON-COMPLIANT') return 'N';
	if (v === 'PARTIAL' || v === 'PARTIALLY' || v === 'PARTIALLY_COVERED') return 'Partial';
	return '';
}

function normalizeMatrixItem(raw: any, index: number): MatrixItem {
	const sourcePageRaw = raw.sourcePage ?? raw.page ?? raw.source_page;
	const sourcePage =
		typeof sourcePageRaw === 'number' ? sourcePageRaw : Number(sourcePageRaw);

	return {
		requirementId: String(raw.requirementId ?? raw.requirement_id ?? raw.id ?? index + 1),
		requirementText: String(
			raw.requirementText ?? raw.requirement_text ?? raw.text ?? raw.requirement ?? '',
		),
		sourceSection: String(raw.sourceSection ?? raw.section ?? raw.section_id ?? ''),
		sourcePage: Number.isFinite(sourcePage) ? sourcePage : 0,
		requirementType: raw.requirementType ?? raw.requirement_type,
		complianceStatus: normalizeComplianceStatus(raw.complianceStatus ?? raw.compliance_status),
		amendmentId: raw.amendmentId ?? raw.amendment_id,
		farDfarsReference:
			raw.farDfarsReference ?? raw.far_dfars_reference ?? raw.far_dfars,
		responseOwner: raw.responseOwner ?? raw.response_owner,
		proposalVolume: raw.proposalVolume ?? raw.proposal_volume,
		proposalSection: raw.proposalSection ?? raw.proposal_section,
		proposalReference: raw.proposalReference ?? raw.proposal_reference,
		qaReviewed: normalizeYesNo(raw.qaReviewed ?? raw.qa_reviewed),
		riskGap: raw.riskGap ?? raw.risk_gap,
		customerPriority: raw.customerPriority ?? raw.customer_priority,
		responseStrategy: raw.responseStrategy ?? raw.response_strategy,
		dealStage: raw.dealStage ?? raw.deal_stage,
		legalRiskFlag: raw.legalRiskFlag ?? raw.legal_risk_flag,
		commentsNotes: raw.commentsNotes ?? raw.comments_notes ?? raw.comments,
	};
}

/**
 * 解析 AI 返回的合规矩阵 JSON
 */
function parseComplianceMatrixResponse(aiResponse: string): { items: MatrixItem[] } {
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
		    const items: MatrixItem[] = rawItems.map((raw, index) => normalizeMatrixItem(raw, index));

		    logger.info('gemini: parsed compliance requirements', {
		      count: items.length,
		    });
		    return { items };
		  } catch (e) {
		    logger.error('gemini: compliance matrix parse error', {
		      error: (e as Error)?.message,
		      preview: aiResponse.substring(0, 1000),
		    });

		    // 解析失败时，尝试像错误解析那样，手动逐个对象抽取，尽量救回一部分结果
		    try {
		      // 不再强依赖结尾的 ']'，只要找到第一个 '[' 后面的内容即可
		      const firstBracket = aiResponse.indexOf('[');
		      if (firstBracket !== -1) {
		        const arrayBody = aiResponse.substring(firstBracket + 1);
		        const objects: any[] = [];
		        let depth = 0;
		        let current = '';
		        for (let i = 0; i < arrayBody.length; i++) {
		          const ch = arrayBody[i];
		          if (ch === '{') {
		            // 遇到新的对象起点时，清空之前在深度 0 下积累的逗号/空白
		            if (depth === 0) {
		              current = '';
		            }
		            depth++;
		            current += ch;
		          } else if (ch === '}') {
		            if (depth > 0) {
		              current += ch;
		              depth--;
		              if (depth === 0) {
		                try {
		                  const obj = JSON.parse(current.trim().replace(/,$/, ''));
		                  objects.push(obj);
		                } catch {
		                  // 跳过无法解析的对象
		                }
		                current = '';
		              }
		            }
		          } else if (depth > 0) {
		            // 只在对象内部累积字符，避免把分隔逗号也并到下一个对象
		            current += ch;
		          }
		        }

		        if (objects.length > 0) {
		          const items: MatrixItem[] = objects.map((raw, index) => normalizeMatrixItem(raw, index));
		          logger.warn('gemini: manually extracted compliance requirements after parse failure', {
		            count: items.length,
		          });
		          return { items };
		        }
		      }
		    } catch (manualError) {
		      logger.error('gemini: compliance matrix manual extraction failed', {
		        error: (manualError as Error)?.message,
		      });
		    }

		    return { items: [] };
		  }
	}

	/**
	 * 解析投标 vs RFP 对比结果 JSON
	 */
	function parseBidCompareResponse(
		aiResponse: string,
		requirements: MatrixItem[],
	): { items: BidComparisonItem[]; summary: BidComparisonSummary } {
		try {
			let jsonStr = aiResponse.trim();

			// 去掉 ```json 包裹
			if (jsonStr.startsWith('```json')) {
				jsonStr = jsonStr.replace(/```json\s*/i, '').replace(/```\s*$/i, '');
			} else if (jsonStr.startsWith('```')) {
				jsonStr = jsonStr.replace(/```\s*/i, '').replace(/```\s*$/i, '');
			}

			jsonStr = jsonStr.trim();
			const parsed: any = JSON.parse(jsonStr);

			const items: BidComparisonItem[] = Array.isArray(parsed.items)
				? parsed.items.map((raw: any, index: number) => {
					const requirementId = String(
						raw.requirement_id ??
							raw.requirementId ??
							requirements[index]?.requirementId ??
							index + 1,
					);
					const requirement = String(
						raw.requirement_text ||
							raw.requirement ||
							requirements.find((r) => r.requirementId === requirementId)?.requirementText ||
							requirements[index]?.requirementText ||
							'',
					);
					let statusRaw = String(raw.status || 'missing').toLowerCase();
					let status: BidComparisonItem['status'];
					if (statusRaw === 'covered') status = 'covered';
					else if (statusRaw === 'partially_covered' || statusRaw === 'partial' || statusRaw === 'partially') status = 'partially_covered';
					else status = 'missing';

					return {
						id: typeof raw.id === 'number' ? raw.id : index + 1,
						requirement_id: requirementId,
						requirement_text: requirement,
						status,
						evidence: String(raw.evidence || ''),
						comment: String(raw.comment || ''),
					};
				})
				: [];

			const summaryRaw = parsed.summary || {};
			const summary: BidComparisonSummary = {
				total: typeof summaryRaw.total === 'number' ? summaryRaw.total : items.length,
				covered: typeof summaryRaw.covered === 'number'
					? summaryRaw.covered
					: items.filter((i) => i.status === 'covered').length,
				partially_covered: typeof summaryRaw.partially_covered === 'number'
					? summaryRaw.partially_covered
					: items.filter((i) => i.status === 'partially_covered').length,
				missing: typeof summaryRaw.missing === 'number'
					? summaryRaw.missing
					: items.filter((i) => i.status === 'missing').length,
			};

			logger.info('gemini: parsed bid-compare result', {
				count: items.length,
			});
			return { items, summary };
		} catch (e) {
				logger.error('gemini: bid-compare parse error', {
					error: (e as Error)?.message,
					preview: aiResponse.substring(0, 1000),
				});
				// 解析失败时，尝试像合规矩阵一样手动抽取 items，尽量救回部分结果
				try {
					const match = aiResponse.match(/"items"\s*:\s*\[([\s\S]*)/);
					if (match) {
						const arrayBody = match[1];
						const rawObjects: any[] = [];
						let depth = 0;
						let current = '';
						for (let i = 0; i < arrayBody.length; i++) {
							const ch = arrayBody[i];
							if (ch === '{') depth++;
							if (ch === '}') depth--;
							current += ch;
							if (depth === 0 && ch === '}') {
								try {
									const obj = JSON.parse(current.trim().replace(/,$/, ''));
									rawObjects.push(obj);
								} catch {
									// 跳过无法解析的对象
								}
								current = '';
							}
						}

						if (rawObjects.length > 0) {
							const items: BidComparisonItem[] = rawObjects.map((raw, index) => {
								const requirementId = String(
									raw.requirement_id ??
										raw.requirementId ??
										requirements[index]?.requirementId ??
										index + 1,
								);
								const requirement = String(
									raw.requirement_text ||
										raw.requirement ||
										requirements.find((r) => r.requirementId === requirementId)
											?.requirementText ||
										requirements[index]?.requirementText ||
										'',
								);
								let statusRaw = String(raw.status || 'missing').toLowerCase();
								let status: BidComparisonItem['status'];
								if (statusRaw === 'covered') status = 'covered';
								else if (
									statusRaw === 'partially_covered' ||
									statusRaw === 'partial' ||
									statusRaw === 'partially'
								)
									status = 'partially_covered';
								else status = 'missing';

								return {
									id: typeof raw.id === 'number' ? raw.id : index + 1,
									requirement_id: requirementId,
									requirement_text: requirement,
									status,
									evidence: String(raw.evidence || ''),
									comment: String(raw.comment || ''),
								};
							});

							const summary: BidComparisonSummary = {
								total: items.length,
								covered: items.filter((i) => i.status === 'covered').length,
								partially_covered: items.filter((i) => i.status === 'partially_covered').length,
								missing: items.filter((i) => i.status === 'missing').length,
							};

							logger.warn('gemini: manually extracted bid-compare items after parse failure', {
								count: items.length,
								summary,
							});
							return { items, summary };
						}
					}
				} catch (manualError) {
					logger.error('gemini: bid-compare manual extraction failed', {
						error: (manualError as Error)?.message,
					});
				}

				return {
					items: [],
					summary: {
						total: 0,
						covered: 0,
						partially_covered: 0,
						missing: 0,
					},
				};
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

function splitIntoChunksWithOverlap(text: string, chunkSize: number, overlap: number): string[] {
	if (chunkSize <= 0) return [text];
	const safeOverlap = Math.max(0, Math.min(overlap, Math.max(0, chunkSize - 1)));
	const chunks: string[] = [];
	let start = 0;

	while (start < text.length) {
		const end = Math.min(text.length, start + chunkSize);
		chunks.push(text.substring(start, end));
		if (end >= text.length) break;
		start = Math.max(0, end - safeOverlap);
	}

	return chunks;
}
