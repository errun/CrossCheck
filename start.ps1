# rfpai 启动脚本 (Windows PowerShell)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  rfpai 标书智能审查系统" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "检查 Node.js..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未安装 Node.js" -ForegroundColor Red
    Write-Host "请访问 https://nodejs.org 下载安装" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green

# 检查依赖
Write-Host ""
Write-Host "检查依赖..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "正在安装依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 依赖安装失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✓ 依赖已安装" -ForegroundColor Green
}

# 检查环境变量
Write-Host ""
Write-Host "检查环境变量..." -ForegroundColor Yellow
if (!(Test-Path ".env.local")) {
    Write-Host "警告: .env.local 文件不存在" -ForegroundColor Yellow
    Write-Host "请配置 OPENROUTER_API_KEY" -ForegroundColor Yellow
} else {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "OPENROUTER_API_KEY=sk-") {
        Write-Host "✓ API Key 已配置" -ForegroundColor Green
    } else {
        Write-Host "警告: OPENROUTER_API_KEY 未配置" -ForegroundColor Yellow
        Write-Host "请编辑 .env.local 文件并填入您的 API Key" -ForegroundColor Yellow
        Write-Host "获取地址: https://openrouter.ai/keys" -ForegroundColor Cyan
    }
}

# 启动开发服务器
Write-Host ""
Write-Host "启动开发服务器..." -ForegroundColor Yellow
Write-Host "访问地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Gray
Write-Host ""

npm run dev
