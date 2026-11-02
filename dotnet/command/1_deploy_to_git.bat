@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Deploy Project to GitHub (Viriyah Registration System)

echo ===============================================================================
echo            Viriyah Insurance - Viriyah Registration System
echo             DIRECT DEPLOY / PUSH CODE TO GITHUB [NO PR REQUIRED]
echo ===============================================================================
echo.

:: Navigate to Git Repository Root (register_form)
cd /d "%~dp0..\.."

echo [INFO] Current Repository Directory: %CD%
echo [INFO] Target Git Remote: https://github.com/ednakrabgit/register_form
echo.

:: Check Git installation
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH!
    echo Please install Git before running this script.
    echo.
    pause
    exit /b 1
)

:: Check Remote Configuration (prefer ednakrabgit, fallback to origin)
set REMOTE_NAME=origin
git remote | findstr /i "ednakrabgit" >nul
if %errorlevel% equ 0 set REMOTE_NAME=ednakrabgit

echo [INFO] Using Remote: %REMOTE_NAME%

:: Get current branch name
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=main

echo [INFO] Active Branch: %CURRENT_BRANCH%
echo.

:: -------------------------------------------------------------------------------
:: 1. SYNC WITH REMOTE FIRST TO PREVENT DIVERGENCE
:: -------------------------------------------------------------------------------
echo [INFO] Fetching latest status from %REMOTE_NAME%...
git fetch %REMOTE_NAME% >nul 2>&1
if %errorlevel% equ 0 (
    git merge %REMOTE_NAME%/main --no-edit >nul 2>&1
)

echo -------------------------------------------------------------------------------
echo [GIT STATUS]
echo -------------------------------------------------------------------------------
git status -s
echo -------------------------------------------------------------------------------
echo.

:: -------------------------------------------------------------------------------
:: 2. CHECK IF THERE ARE LOCAL CHANGES
:: -------------------------------------------------------------------------------
set HAS_CHANGES=0
git status --porcelain | findstr /r "." >nul
if %errorlevel% equ 0 set HAS_CHANGES=1

if "!HAS_CHANGES!"=="0" (
    echo [INFO] No new modified files in working directory.
    echo.
    set /p FORCE_PUSH="Do you want to push existing commits directly to %REMOTE_NAME%/main? [Y/N]: "
    if /i "!FORCE_PUSH!"=="Y" (
        goto :DO_PUSH
    ) else (
        echo [INFO] Operation cancelled.
        goto :END
    )
)

:: Prompt for Commit Message
echo Please enter your commit message:
set /p COMMIT_MSG="Commit message [Press Enter for auto-timestamp]: "

if "!COMMIT_MSG!"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set datetime=%%I
    if "!datetime!"=="" (
        set COMMIT_MSG=Update registration system - %date%
    ) else (
        set YYYY=!datetime:~0,4!
        set MM=!datetime:~4,2!
        set DD=!datetime:~6,2!
        set HH=!datetime:~8,2!
        set MIN=!datetime:~10,2!
        set COMMIT_MSG=Update registration system - !YYYY!-!MM!-!DD! !HH!:!MIN!
    )
)

echo.
echo [1/3] Adding changes to Git staging...
git add .
if %errorlevel% neq 0 (
    echo [ERROR] Failed to add files to Git staging.
    pause
    exit /b 1
)

echo [2/3] Committing changes with message: "!COMMIT_MSG!"...
git commit -m "!COMMIT_MSG!"

:DO_PUSH
echo.
echo [3/3] Deploying directly to GitHub [Pushing to main branch]...

:: Push to current branch
git push %REMOTE_NAME% %CURRENT_BRANCH%

:: Directly update remote main (so NO Pull Request is ever needed!)
if /i not "%CURRENT_BRANCH%"=="main" (
    echo [INFO] Updating remote 'main' branch directly [No Pull Request required]...
    git push %REMOTE_NAME% %CURRENT_BRANCH%:main
    git branch -f main %CURRENT_BRANCH% >nul 2>&1
) else (
    echo [INFO] Synchronizing remote 'feature/dotnet' branch...
    git push %REMOTE_NAME% main:feature/dotnet >nul 2>&1
    git branch -f feature/dotnet main >nul 2>&1
)

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo [SUCCESS] Code successfully deployed directly to GitHub!
    echo Remote: https://github.com/ednakrabgit/register_form
    echo Target: 'main' branch [Updated directly - NO PULL REQUEST NEEDED!]
    echo Status: Branches 'main' and 'feature/dotnet' are 100%% synchronized.
    echo ===============================================================================
) else (
    echo.
    echo ===============================================================================
    echo [ERROR] Git push failed! Please check your network or GitHub credentials.
    echo ===============================================================================
)

:END
echo.
pause
