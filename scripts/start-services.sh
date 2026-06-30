#!/usr/bin/env bash
#=============================================================================
# start-services.sh — WSL → Windows 一键启动 TTS + STT + LLM（bash 包装）
#
# 转发到 start-services.ps1，在 Windows PowerShell 中执行。
# 用法:
#   ./scripts/start-services.sh              # 正常启动
#   ./scripts/start-services.sh -NoAdb       # 跳过 adb reverse
#   ./scripts/start-services.sh -NoCheck     # 跳过健康检查
#=============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PS1="$SCRIPT_DIR/start-services.ps1"

if [ ! -f "$PS1" ]; then
    echo "[ERROR] 找不到 $PS1" >&2
    exit 1
fi

# 检查 powershell.exe 是否可用（WSL 跨系统调用）
if ! command -v powershell.exe &>/dev/null; then
    echo "[ERROR] 需要 powershell.exe（从 WSL 调用 Windows PowerShell）" >&2
    exit 1
fi

# 把所有参数透传给 .ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(wslpath -w "$PS1")" "$@"
