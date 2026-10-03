@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0evaluation.ps1" stop
pause
