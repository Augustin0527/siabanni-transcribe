@echo off
REM ========================================================================
REM  Siabanni Transcribe — Script d'installation Windows
REM  Consortium SFR
REM ========================================================================
REM  Double-clique sur ce fichier pour installer les dependances.
REM  Node.js (version 18 ou plus recente) doit etre installe au prealable :
REM      https://nodejs.org/fr/download
REM ========================================================================

echo.
echo  ============================================================
echo   Siabanni Transcribe - Installation des dependances Windows
echo   Consortium SFR
echo  ============================================================
echo.

REM Verification de Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] Node.js n'est pas installe.
    echo  Telecharge-le ici : https://nodejs.org/fr/download
    echo  Choisis la version LTS ^(recommandee^), redemarre, puis relance ce script.
    pause
    exit /b 1
)

echo  [OK] Node.js detecte
node --version
echo.

REM Verification de npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] npm est introuvable. Reinstalle Node.js.
    pause
    exit /b 1
)

REM Se placer dans le dossier parent (racine du projet)
cd /d "%~dp0.."

echo  [1/3] Installation des dependances npm ^(peut prendre 5-10 minutes^)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  [ERREUR] L'installation a echoue.
    pause
    exit /b 1
)

echo.
echo  [2/3] Verification de l'installation...
if not exist node_modules (
    echo  [ERREUR] Le dossier node_modules est manquant.
    pause
    exit /b 1
)

echo.
echo  [3/3] Tout est pret !
echo.
echo  ============================================================
echo   Installation reussie !
echo  ============================================================
echo.
echo   Pour lancer l'application :
echo     - Double-clique sur launch-windows.bat
echo     - Ou execute : npm start
echo.
echo   Premier lancement : le modele Whisper ^(142 Mo pour "base"^)
echo   sera telecharge automatiquement. Patiente quelques minutes.
echo.
pause
