# 本地构建脚本
# 用于开发环境构建完整应用（包含 Python 工具）

Write-Host "🔨 开始本地构建..." -ForegroundColor Cyan

# 1. 构建 Python 工具
Write-Host "`n📦 步骤 1/3: 构建 Python 工具..." -ForegroundColor Yellow
if (Test-Path ".venv") {
    Write-Host "使用虚拟环境" -ForegroundColor Gray
    & .venv\Scripts\python.exe -m PyInstaller auto-asset-tool.spec --noconfirm
} else {
    Write-Host "使用系统 Python" -ForegroundColor Gray
    python -m PyInstaller auto-asset-tool.spec --noconfirm
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python 工具构建失败" -ForegroundColor Red
    exit 1
}

# 2. 复制到 tools 目录
Write-Host "`n📁 步骤 2/3: 复制工具到 tools 目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "tools" | Out-Null
Copy-Item "dist\auto-asset-tool.exe" "tools\auto-asset-tool.exe" -Force

if (Test-Path "tools\auto-asset-tool.exe") {
    $size = (Get-Item "tools\auto-asset-tool.exe").Length / 1MB
    Write-Host "✓ 工具已复制 (大小: $([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ 工具复制失败" -ForegroundColor Red
    exit 1
}

# 3. 构建 Electron 应用
Write-Host "`n🚀 步骤 3/3: 构建 Electron 应用..." -ForegroundColor Yellow
npm run make

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ 构建完成！" -ForegroundColor Green
    Write-Host "📦 构建产物位置:" -ForegroundColor Cyan
    Write-Host "  - dist/" -ForegroundColor Gray
    Get-ChildItem dist -Filter "*.exe" | ForEach-Object {
        Write-Host "    • $($_.Name)" -ForegroundColor White
    }
} else {
    Write-Host "`n❌ Electron 应用构建失败" -ForegroundColor Red
    exit 1
}
