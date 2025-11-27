# 🚀 快速启动指南

## 第一步：安装依赖

在项目根目录打开终端，运行：

```bash
npm install
```

等待依赖安装完成（大约 1-2 分钟）。

## 第二步：获取 API Key

1. 访问 [OpenRouter](https://openrouter.ai/keys)
2. 注册/登录账号
3. 创建新的 API Key
4. 复制 API Key（格式：`sk-or-v1-...`）

## 第三步：配置 API Key

编辑项目根目录的 `.env.local` 文件：

```env
OPENROUTER_API_KEY=sk-or-v1-粘贴你的API-Key
```

保存文件。

## 第四步：启动项目

### Windows 用户（推荐）
双击运行 `start.ps1` 脚本，或在 PowerShell 中运行：
```powershell
.\start.ps1
```

### 所有平台
在终端运行：
```bash
npm run dev
```

## 第五步：使用系统

1. 打开浏览器访问 **http://localhost:3000**
2. 点击上传区域，选择一个 PDF 文件
3. 点击"开始分析"按钮
4. 等待 AI 分析完成（通常 10-30 秒）
5. 查看分析结果
6. 点击"下载检查清单"导出 CSV 文件

## 常见问题

### ❌ 提示 "OPENROUTER_API_KEY is not configured"
**解决**: 检查 `.env.local` 文件是否正确配置了 API Key

### ❌ 上传失败
**解决**: 
- 确保文件是 PDF 格式
- 文件大小不超过 50MB
- 检查网络连接

### ❌ 分析返回空结果
**解决**:
- 确保 PDF 有文本层（不是纯扫描版）
- 检查 API Key 是否有效
- 查看浏览器控制台（F12）的错误信息

### ❌ 端口 3000 被占用
**解决**: 修改端口
```bash
PORT=3001 npm run dev
```

## 测试建议

建议使用包含以下内容的 PDF 进行测试：
- 开标一览表
- 投标报价明细表
- 公司信息（名称、编号等）
- 技术要求响应表

## 下一步

- 阅读 [README.md](README.md) 了解详细功能
- 查看 [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) 了解技术架构
- 阅读 [prd.txt](prd.txt) 了解产品需求

## 技术支持

遇到问题？
1. 查看浏览器控制台（F12 → Console）
2. 查看终端输出日志
3. 阅读 SETUP.md 文档
4. 提交 GitHub Issue

---

**祝您使用愉快！** 🎉

