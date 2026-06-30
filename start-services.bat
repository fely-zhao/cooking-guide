@echo off
:: 厨房 AI 副厨 — 一键启动本地服务
:: 双击此文件即可启动 STT + TTS + LLM
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-services.ps1"
pause
