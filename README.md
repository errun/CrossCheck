# Blot.new - 标书智能审查系统

AI 驱动的标书自动审查与可视化分析系统，基于 Next.js 14 和 Gemini AI。

## 功能特性

- ✅ **智能审查**：基于 Gemini AI 的标书自动审查
- ✅ **多规则检测**：支持 7 种审查规则（R0001-R0004, F2, S1, S2）
- ✅ **可视化分析**：实时扫描进度展示
- ✅ **错误定位**：精确到页码的错误定位
- ✅ **导出功能**：支持导出 CSV 格式检查清单
- ✅ **无数据库**：纯内存存储，轻量级部署

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **UI 框架**: TailwindCSS + shadcn/ui
- **PDF 处理**: pdf-parse
- **AI 模型**: OpenRouter API (Gemini 2.5 Flash)
- **存储**: 内存缓存（无数据库）

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
# 或
yarn install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`：

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入您的 OpenRouter API Key：

```env
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

> 获取 API Key: https://openrouter.ai/keys

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

1. **上传 PDF**：点击上传区域选择标书 PDF 文件（最大 50MB）
2. **开始分析**：点击"开始分析"按钮，AI 将自动审查文件
3. **查看结果**：分析完成后查看错误清单，按优先级分类
4. **导出清单**：点击"下载检查清单"导出 CSV 文件

## 审查规则

| 规则 ID | 检查项 | 优先级 | 说明 |
|---------|--------|--------|------|
| R0001 | 价格一致性 | P1 (致命) | 检查开标一览表和报价明细表价格是否一致 |
| R0002 | 错别字与格式 | P3 (一般) | 检查错别字、标点、格式错误 |
| R0003 | 身份信息一致性 | P1 (致命) | 检查公司名称、编号等信息一致性 |
| F2 | 强制条款负偏离 | P1 (致命) | 检查带"★"的强制条款是否满足 |
| S1 | 重要参数负偏离 | P2 (重大) | 检查带"▲"的重要参数是否满足 |
| S2 | 证明材料缺失 | P2 (重大) | 检查技术支持资料是否有效 |
| R4 | 签署完整性 | P3 (一般) | 检查签署和公章状态 |

## 项目结构

```
blot-bid-checker/
├── app/
│   ├── api/
│   │   ├── analyze/       # 分析 API
│   │   └── export/        # 导出 API
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/
│   └── ui/                # UI 组件
├── lib/
│   ├── gemini.ts          # Gemini AI 集成
│   ├── cache.ts           # 内存缓存管理
│   └── utils.ts           # 工具函数
├── types/
│   └── index.ts           # TypeScript 类型定义
└── prd.txt                # 产品需求文档
```

## API 接口

### POST /api/analyze
上传并分析 PDF 文件

**请求**:
- Content-Type: multipart/form-data
- Body: file (PDF 文件)

**响应**:
```json
{
  "doc_id": "uuid",
  "total_pages": 86,
  "errors": [...],
  "error_count": 5
}
```

### GET /api/analyze?doc_id=xxx
获取分析结果

### GET /api/export?doc_id=xxx&format=csv
导出检查清单

## 部署

### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 导入项目
3. 配置环境变量 `OPENROUTER_API_KEY`
4. 部署

### 本地构建

```bash
npm run build
npm run start
```

## 注意事项

- ⚠️ **会话限制**：分析结果仅保存 1 小时，服务重启会丢失
- ⚠️ **文件大小**：建议 PDF 文件不超过 50MB
- ⚠️ **API 配额**：注意 OpenRouter API 的使用配额

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue。

