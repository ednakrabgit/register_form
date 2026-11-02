@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Pull Latest Code from GitHub (Viriyah Registration System)

echo ===============================================================================
echo            Viriyah Insurance - Viriyah Registration System
echo                     PULL LATEST CODE FROM GITHUB
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

:: Check Remote Configuration
set REMOTE_NAME=origin
git remote | findstr /i "ednakrabgit" >nul
if %errorlevel% equ 0 set REMOTE_NAME=ednakrabgit

echo [INFO] Using Remote: %REMOTE_NAME%

:: Get current branch name
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=main

echo [INFO] Active Branch: %CURRENT_BRANCH%
echo.

:: Check for uncommitted local changes
git status --porcelain | findstr /r "." >nul
if %errorlevel% equ 0 (
    echo -------------------------------------------------------------------------------
    echo [WARNING] You have uncommitted local changes!
    echo -------------------------------------------------------------------------------
    git status -s
    echo -------------------------------------------------------------------------------
    echo.
    echo Options:
    echo  [1] Stash local changes before pulling [Recommended]
    echo  [2] Continue pull anyway [May cause merge conflict]
    echo  [3] Cancel
    echo.
    set /p PULL_CHOICE="Enter choice [1, 2, or 3]: "
    if "!PULL_CHOICE!"=="1" (
        echo [INFO] Stashing local changes...
        git stash save "Auto-stash before pull"
    )
    if "!PULL_CHOICE!"=="3" (
        echo [INFO] Pull cancelled by user.
        goto :END
    )
)

echo.
echo [1/2] Fetching updates from %REMOTE_NAME%...
git fetch %REMOTE_NAME%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to fetch from %REMOTE_NAME%. Please check network connection.
    pause
    exit /b 1
)

echo.
echo [2/2] Pulling latest commits into %CURRENT_BRANCH%...
git pull %REMOTE_NAME% %CURRENT_BRANCH%
if %errorlevel% equ 0 (
    :: Keep both local main and feature/dotnet pointers synchronized
    if /i "%CURRENT_BRANCH%"=="main" (
        git branch -f feature/dotnet main >nul 2>&1
    ) else (
        git branch -f main %CURRENT_BRANCH% >nul 2>&1
    )
    echo.
    echo ===============================================================================
    echo [SUCCESS] Code successfully updated from GitHub!
    echo Repository: https://github.com/ednakrabgit/register_form
    echo Branch: %CURRENT_BRANCH%
    echo ===============================================================================
) else (
    echo.
    echo ===============================================================================
    echo [ERROR] Git pull failed! Please check merge conflicts or network credentials.
    echo ===============================================================================
)

:END
echo.
echo [CURRENT REPOSITORY STATUS]
git status -s
echo.
pause
