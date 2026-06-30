<#=============================================================================
  start-services.ps1 — 一键启动 TTS + STT 本地服务（Windows）

   启动内容:
    STT  faster-whisper  D:\project\stt-server\server.py       :5000
    TTS  Windows SAPI    D:\project\tts-server\local-tts-server.js  :4000
    LLM  DeepSeek 代理   D:\project\llm-server\index.js        :3001

  用法:
     .\scripts\start-services.ps1              # 正常启动
     .\scripts\start-services.ps1 -NoCheck     # 跳过健康检查

   输入 stop 回车停止所有服务退出。
#=============================================================================#>

param(
    [switch]$NoCheck
)

$ErrorActionPreference = "Stop"

# ─── 配置 ───────────────────────────────────────────────────────────────────
$HealthTimeout = 60  # 秒
$SttDir        = "D:\project\stt-server"
$TtsDir        = "D:\project\tts-server"
$LlmDir        = "D:\project\llm-server"

# ─── 辅助函数 ────────────────────────────────────────────────────────────────
function Write-Step($msg)      { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)        { Write-Host "  $msg ✓" -ForegroundColor Green }
function Write-Warn($msg)      { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Fail($msg)      { Write-Host "  ✗ $msg" -ForegroundColor Red }

function Test-PortOpen($port, $timeoutMs=1500) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $async = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $async.AsyncWaitHandle.WaitOne($timeoutMs) | Out-Null
        if ($tcp.Connected) { $tcp.Close(); return $true }
        $tcp.Close(); return $false
    } catch { return $false }
}

# ─── 横幅 ────────────────────────────────────────────────────────────────────
Write-Host @"

  ╔══════════════════════════════════════════╗
  ║     厨房 AI 副厨 — 本地服务启动          ║
  ╚══════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# ─── 1. 前置检查 ─────────────────────────────────────────────────────────────
Write-Step "前置检查"

$nodeVer = node --version 2>$null
if (-not $nodeVer) { Write-Fail "Node.js 未安装或不在 PATH 中"; exit 1 }
Write-OK "Node.js $nodeVer"

$pyVer = python --version 2>&1
if ($LASTEXITCODE -ne 0) { Write-Fail "Python 未安装或不在 PATH 中"; exit 1 }
Write-OK "$($pyVer.Trim())"

# ─── 2. STT 虚拟环境 ────────────────────────────────────────────────────────
Write-Step "STT 虚拟环境"
$sttPython = "$SttDir\.venv\Scripts\python.exe"
if (-not (Test-Path $sttPython)) {
    Write-Host "  首次运行，创建 Windows venv ..." -ForegroundColor Yellow
    pushd $SttDir
    try {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw "venv 创建失败" }
        & $sttPython -m pip install -q -r requirements.txt
        if ($LASTEXITCODE -ne 0) { throw "pip install 失败" }
        Write-OK "虚拟环境创建完成"
    } finally { popd }
} else {
    Write-OK "虚拟环境已存在"
}

# ─── 3. 启动服务（记录 PID 以便退出时清理） ─────────────────────────────────
$childPids = @()

Write-Step "启动服务"

# STT
if (Test-PortOpen 5000) {
    Write-Warn "STT (5000) 已被占用，跳过启动"
} else {
    Write-Host "  启动 STT 服务 ..." -NoNewline -ForegroundColor Gray
    $proc = Start-Process -FilePath $sttPython `
        -ArgumentList "server.py" `
        -WorkingDirectory $SttDir `
        -WindowStyle Normal -PassThru
    $childPids += $proc.Id
    Write-Host " PID $($proc.Id)" -ForegroundColor Gray
}

# TTS
if (Test-PortOpen 4000) {
    Write-Warn "TTS (4000) 已被占用，跳过启动"
} else {
    Write-Host "  启动 TTS 服务 ..." -NoNewline -ForegroundColor Gray
    $proc = Start-Process -FilePath "node" `
        -ArgumentList "local-tts-server.js" `
        -WorkingDirectory $TtsDir `
        -WindowStyle Normal -PassThru
    $childPids += $proc.Id
    Write-Host " PID $($proc.Id)" -ForegroundColor Gray
}

# LLM (DeepSeek proxy)
if (Test-PortOpen 3001) {
    Write-Warn "LLM (3001) 已被占用，跳过启动"
} else {
    Write-Host "  启动 LLM 服务 ..." -NoNewline -ForegroundColor Gray
    $proc = Start-Process -FilePath "node" `
        -ArgumentList "index.js" `
        -WorkingDirectory $LlmDir `
        -WindowStyle Normal -PassThru
    $childPids += $proc.Id
    Write-Host " PID $($proc.Id)" -ForegroundColor Gray
}

# ─── 5. 健康检查 ────────────────────────────────────────────────────────────
if (-not $NoCheck) {
    Write-Step "健康检查（最长等待 ${HealthTimeout}s）"

    # 给服务几秒启动时间，避免一启动就检查失败
    Start-Sleep 3

    $checkList = @()
    if (Test-PortOpen 5000) { $checkList += @{Name="STT"; Port=5000} }
    if (Test-PortOpen 4000) { $checkList += @{Name="TTS"; Port=4000} }
    if (Test-PortOpen 3001) { $checkList += @{Name="LLM"; Port=3001} }

    foreach ($svc in $checkList) {
        $deadline = (Get-Date).AddSeconds($HealthTimeout)
        $ok = $false
        while (-not $ok -and (Get-Date) -lt $deadline) {
            if (Test-PortOpen $svc.Port) { $ok = $true; break }
            Start-Sleep 2
        }
        if ($ok) { Write-OK "$($svc.Name) 端口 $($svc.Port) 已就绪" }
        else     { Write-Warn "$($svc.Name) 端口 $($svc.Port) 未就绪" }
    }
}

# ─── 6. 结果 ────────────────────────────────────────────────────────────────
Write-Host @"

  ┌────────────────────────────────────────────┐
  │  服务             地址                      │
  ├────────────────────────────────────────────┤
   │  STT  http://localhost:5000  (whisper)     │
   │  TTS  http://localhost:4000  (SAPI)        │
   │  LLM  http://localhost:3001  (DeepSeek)    │
  └────────────────────────────────────────────┘

"@ -ForegroundColor Magenta

if ($childPids.Count -eq 0) {
    Write-Host "所有服务已在运行中，脚本退出。" -ForegroundColor Green
    exit 0
}

Write-Host "输入 stop 后回车停止服务并退出 ..." -ForegroundColor Cyan
do {
    $input = (Read-Host).Trim().ToLower()
} while ($input -ne "stop")

# ─── 7. 清理 ────────────────────────────────────────────────────────────────
Write-Step "停止服务"
foreach ($childPid in $childPids) {
    try {
        $p = Get-Process -Id $childPid -ErrorAction Stop
        $p.CloseMainWindow() | Out-Null
        if (-not $p.HasExited) { $p.Kill() }
        Write-OK "已停止 PID $childPid"
    } catch {
        Write-Warn "PID $childPid 已不存在"
    }
}

Write-Host @"

  服务已全部停止。
  再见！

"@ -ForegroundColor Magenta
