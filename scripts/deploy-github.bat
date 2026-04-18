@echo off
REM ============================================================================
REM  Siabanni Transcribe - Deploiement GitHub (Windows)
REM  Consortium SFR
REM ----------------------------------------------------------------------------
REM  Ce script :
REM    1. Verifie Git et GitHub CLI
REM    2. Te connecte a GitHub si besoin
REM    3. Cree le depot distant
REM    4. Push le code
REM    5. Cree une release v1.0.0 qui lance la compilation automatique
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo   Siabanni Transcribe - Deploiement sur GitHub
echo   Consortium SFR
echo  ============================================================
echo.

REM --- Verification Git ---
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] Git n'est pas installe.
    echo  Installe-le : https://git-scm.com/download/win
    pause
    exit /b 1
)
echo  [OK] Git detecte

REM --- Verification GitHub CLI ---
where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] GitHub CLI n'est pas installe.
    echo  Installe-le : https://cli.github.com/
    echo  Ou via winget : winget install --id GitHub.cli
    pause
    exit /b 1
)
echo  [OK] GitHub CLI detecte
echo.

REM --- Se placer a la racine du projet ---
cd /d "%~dp0.."
echo  Dossier du projet : %CD%
echo.

REM --- Authentification ---
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo  [CONNEXION] Tu dois te connecter a GitHub.
    echo  Une page va s'ouvrir dans ton navigateur.
    echo.
    gh auth login --web --git-protocol https
    if %errorlevel% neq 0 (
        echo  [ERREUR] Echec de la connexion.
        pause
        exit /b 1
    )
) else (
    echo  [OK] Deja connecte a GitHub.
)
echo.

REM --- Recuperer le username ---
for /f "delims=" %%i in ('gh api user --jq .login') do set GH_USER=%%i
echo  Utilisateur GitHub : %GH_USER%
echo.

REM --- Nom du depot ---
set REPO_NAME=siabanni-transcribe
set /p USER_REPO=Nom du depot [%REPO_NAME%] :
if not "%USER_REPO%"=="" set REPO_NAME=%USER_REPO%

REM --- Visibilite ---
echo.
echo  Le depot doit-il etre :
echo    1^) Public ^(tout le monde peut voir et telecharger - recommande^)
echo    2^) Prive ^(visible seulement par toi^)
set VIS_CHOICE=1
set /p VIS_CHOICE=Choix [1] :
if "%VIS_CHOICE%"=="2" (
    set VISIBILITY=--private
    echo  Depot PRIVE
) else (
    set VISIBILITY=--public
    echo  Depot PUBLIC
)
echo.

REM --- Init git si besoin ---
if not exist ".git" (
    echo  [INIT] Initialisation du depot git local...
    git init -q -b main
    git add .
    git commit -q -m "Initial commit - Siabanni Transcribe v1.0.0 par le Consortium SFR"
) else (
    echo  [OK] Depot git local deja initialise.
)

REM --- Verifier si le depot existe deja ---
gh repo view "%GH_USER%/%REPO_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [INFO] Le depot %GH_USER%/%REPO_NAME% existe deja.
    git remote | findstr origin >nul
    if %errorlevel% neq 0 (
        git remote add origin "https://github.com/%GH_USER%/%REPO_NAME%.git"
    )
    git branch -M main
    git push -u origin main
    echo  [OK] Code pousse.
) else (
    echo  [GITHUB] Creation du depot %GH_USER%/%REPO_NAME%...
    gh repo create "%REPO_NAME%" %VISIBILITY% --description "Application de transcription automatique - Consortium SFR" --source=. --remote=origin --push
    if %errorlevel% neq 0 (
        echo  [ERREUR] Impossible de creer le depot.
        pause
        exit /b 1
    )
    echo  [OK] Depot cree et code pousse !
)

echo.
echo  URL : https://github.com/%GH_USER%/%REPO_NAME%
echo.

REM --- Creer tag v1.0.0 ? ---
set CREATE_TAG=O
set /p CREATE_TAG=Creer le tag v1.0.0 maintenant (declenche la compilation auto) ? [O/n] :
if /i "%CREATE_TAG%"=="O" (
    git tag v1.0.0 2>nul
    git push origin v1.0.0
    echo.
    echo  [OK] Tag v1.0.0 pousse.
    echo  GitHub Actions compile maintenant les installeurs Windows et macOS...
    echo.
    echo  Suis la progression ici :
    echo    https://github.com/%GH_USER%/%REPO_NAME%/actions
    echo.
    echo  Dans ~10 minutes, les installeurs seront disponibles ici :
    echo    https://github.com/%GH_USER%/%REPO_NAME%/releases
    echo.
    echo  Ouverture de la page Actions...
    start https://github.com/%GH_USER%/%REPO_NAME%/actions
)

echo.
echo  ============================================================
echo   Deploiement termine !
echo  ============================================================
pause
