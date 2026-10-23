@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0aplicar-migraciones.ps1"
echo.
pause
