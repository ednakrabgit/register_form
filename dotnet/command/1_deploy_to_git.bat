@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Deploy Project to GitHub (Viriyah Registration System)

echo ===============================================================================
echo            Viriyah Insurance - Viriyah Registration System
echo                     DEPLOY / PUSH CODE TO GITHUB
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

:: Get current branch name
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=feature/dotnet

echo [INFO] Active Branch: %CURRENT_BRANCH%
echo.

:: Check Remote Configuration (prefer ednakrabgit, fallback to origin)
set REMOTE_NAME=origin
git remote | findstr /i "ednakrabgit" >nul
if %errorlevel% equ 0 set REMOTE_NAME=ednakrabgit

echo [INFO] Using Remote: %REMOTE_NAME%
echo.
echo -------------------------------------------------------------------------------
echo [GIT STATUS]
echo -------------------------------------------------------------------------------
git status -s
echo -------------------------------------------------------------------------------
echo.

:: Check if there are changes
git status --porcelain | findstr /r "." >nul
if %errorlevel% neq 0 (
    echo [INFO] No new changes detected in working directory.
    echo.
    set /p FORCE_PUSH="Do you still want to push existing commits to %REMOTE_NAME%/%CURRENT_BRANCH%? [Y/N]: "
    if /i "!FORCE_PUSH!"=="Y" (
        echo [INFO] Pushing to %REMOTE_NAME% %CURRENT_BRANCH%...
        git push %REMOTE_NAME% %CURRENT_BRANCH%
        goto :END
    ) else (
        echo [INFO] Operation cancelled.
        goto :END
    )
)

:: Prompt for Commit Message
echo Please enter your commit message:
set /p COMMIT_MSG="Commit message (Press Enter for auto-timestamp): "

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
    echo [ERROR] Failed to add files to Git.
    pause
    exit /b 1
)

echo [2/3] Committing changes with message: "!COMMIT_MSG!"...
git commit -m "!COMMIT_MSG!"

echo.
echo [3/3] Pushing to %REMOTE_NAME% %CURRENT_BRANCH%...
git push %REMOTE_NAME% %CURRENT_BRANCH%
if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo [SUCCESS] Code successfully deployed to GitHub!
    echo Remote URL: https://github.com/ednakrabgit/register_form
    echo Branch: %CURRENT_BRANCH%
    echo ===============================================================================
) else (
    echo.
    echo ===============================================================================
    echo [ERROR] Git push failed! Please check your network or GitHub credentials.
    echo Tip: You can also run 'git push %REMOTE_NAME% %CURRENT_BRANCH%' manually.
    echo ===============================================================================
)

:END
echo.
pause
