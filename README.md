# 标书全能王（rfpai）- 标书智能审查系统

## 免费版修复分支

正式项目为 Vercel `erruns-projects/cross-check`，代码仓库为 `errun/CrossCheck`。此分支只供审核与预览，禁止直接合并或生产发布。

- 免费版仅供公开或虚构材料。上传前必须确认材料不含保密或个人信息，并知晓免费模型提供方可能留存及用于训练；接口同样要求 `free_consent=true`。本分支不修改 OpenRouter 账号隐私设置或消费额度。
- 三个功能默认使用 `nvidia/nemotron-3.5-super-vl:free`。可分别配置 `RFP_SCAN_MODEL`、`RFP_MATRIX_MODEL`、`RFP_DRAFT_MODEL`，但必须为 `:free` 且官方目录的输入、输出及请求价格均为0。没有付费降级。
- 保留现有 `OPENROUTER_API_KEY`。不提交 `.env`、Vercel会话文件或密钥；测试和预览不记录真实文档内容。
- 当前支持 PDF / `.docx`，最大4MB、50页、6万字符。超限明确拒绝，不截断后冒充完整结果。PDF按实际页定位，Word使用原文段落，不猜测分页。
- 检查主要核对明示的编号、主体、金额、期限等内部一致性及明确缺失的授权材料；不替代招标文件逐条对照、资格核验或最终人工审阅。
- 草稿包含原文要求和待确认响应，不将未知企业资料、资质、报价或附件写成已齐全；不承诺满足招标文件的全部格式。
- 免费额度检查读取 OpenRouter 账号共享计数，预留20%；并发可能短暂跨过预留阈值，提供方执行硬上限。429最多有限重试；没有新增全站共享限流存储，也不声称实例内计数等于严格全站限额。

验证：`npm ci --ignore-scripts`、`npm test`、`npm run typecheck`、`npm run build`。`tests/fixtures/`全部为虚构材料；单元测试模拟模型网络调用，不使用真实密钥。真实模型与浏览器证据另行交付审核。

## 本地运行

需要 Node.js 20 或更新版本。在本地未提交的 `.env.local` 中设置 `OPENROUTER_API_KEY`，然后执行：

```bash
npm ci --ignore-scripts
npm run dev
```

浏览器访问 `http://localhost:3000/zh`。生产构建使用 `npm run build` 和 `npm run start`。不需要新增付费服务或修改现有账号消费额度。

## 接口与导出

- `POST /api/analyze`：multipart 字段 `file`、`lang`、`free_consent=true`；`mode=matrix` 提取矩阵，其余模式检查内部一致性。
- `POST /api/generate-bid`：字段 `rfp_file`、`lang`、`free_consent=true`，返回待完善草稿。
- `POST /api/export`：提交已展示的 `errors`，返回 CSV，避免依赖跨实例内存缓存。
- `POST /api/matrix-export`：提交 `template=gov|enterprise` 和 `items`，返回 Excel；保留用户修改的合规状态与备注。
- `POST /api/bid-draft-docx`：提交 `content` 和 `lang`，返回 Word。页面的 PDF 按钮使用浏览器打印。

上传正文不保存到文件或日志。旧检查结果缓存只在单个实例内临时存在，服务重启会丢失；客户端直接提交结果导出。免费模型提供方的数据使用以界面告知为准。

## 验收边界

虚构 PDF 覆盖16条强制要求、8类预埋问题和无错误对照文件；自动测试包含原文定位、坏文件、超限、缺少告知、坏 JSON、截断、付费模型拦截及导出内容。样本通过不代表任意真实标书的完整率或准确率；扫描 PDF 需要先 OCR，Word 不提供真实页码，所有结果需要人工复核。
