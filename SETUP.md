# 项目设置指南

## 第一步：安装依赖

在项目根目录运行：

```bash
npm install
```

或者使用其他包管理器：

```bash
pnpm install
# 或
yarn install
```

## 第二步：配置 API Key

1. 访问 [OpenRouter](https://openrouter.ai/keys) 获取 API Key
2. 编辑 `.env.local` 文件
3. 将您的 API Key 填入：

```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
```

## 第三步：启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动

## 第四步：测试功能

1. 打开浏览器访问 http://localhost:3000
2. 上传一个测试 PDF 文件
3. 点击"开始分析"
4. 查看分析结果

## 常见问题

### Q: 提示 "OPENROUTER_API_KEY is not configured"
A: 请确保 `.env.local` 文件中已正确配置 API Key

### Q: PDF 解析失败
A: 确保上传的是有效的 PDF 文件，且文件大小不超过 50MB

### Q: AI 分析返回空结果
A: 可能是 PDF 文本提取失败，或者 AI 未检测到问题

### Q: 如何查看详细日志
A: 打开浏览器开发者工具（F12）查看 Console 日志

## 生产部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量 `OPENROUTER_API_KEY`
4. 点击部署

### 本地构建

```bash
npm run build
npm run start
```

## 技术支持

如遇到问题，请查看：
- README.md - 项目文档
- prd.txt - 产品需求文档
- 或提交 Issue

