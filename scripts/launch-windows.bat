@echo off
REM ========================================================================
REM  Siabanni Transcribe — Lancement Windows
REM  Consortium SFR
REM ========================================================================

cd /d "%~dp0.."

if not exist node_modules (
    echo  Les dependances ne sont pas installees.
    echo  Lance d'abord : install-windows.bat
    pause
    exit /b 1
)

call npm start
