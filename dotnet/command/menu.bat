@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:MENU
cls
title Viriyah Registration System - Command Center

echo ===============================================================================
echo            Viriyah Insurance - Viriyah Registration System
echo                      PROJECT COMMAND AND CONTROL CENTER
echo ===============================================================================
echo.
echo  Git Repository: https://github.com/ednakrabgit/register_form
echo  Database Standard: Microsoft SQL Server 2025 (Deprecated MySQL)
echo  Local Web URL: http://localhost/
echo.
echo -------------------------------------------------------------------------------
echo  SELECT AN ACTION:
echo -------------------------------------------------------------------------------
echo   [1] Deploy / Push Code to GitHub (1_deploy_to_git.bat)
echo   [2] Pull Latest Code from GitHub (2_pull_from_git.bat)
echo   [3] Run and Start Local WWW Web Application (3_run_www_local.bat)
echo   [4] Restart Apache24 Web Server
echo   [5] View Docker Containers Status (mssql, backend, frontend)
echo   [6] Open Documentation Directory in File Explorer
echo   [7] Backup SQL Server Database to www\db (backup_sqlserver_db.bat)
echo   [0] Exit
echo -------------------------------------------------------------------------------
echo.

set /p M_CHOICE="Enter choice [0-7]: "

if "%M_CHOICE%"=="1" (
    call "%~dp01_deploy_to_git.bat"
    goto :MENU
)
if "%M_CHOICE%"=="2" (
    call "%~dp02_pull_from_git.bat"
    goto :MENU
)
if "%M_CHOICE%"=="3" (
    call "%~dp03_run_www_local.bat"
    goto :MENU
)
if "%M_CHOICE%"=="4" (
    echo.
    echo [INFO] Restarting Apache24 service...
    net stop Apache24 >nul 2>&1
    net start Apache24 >nul 2>&1
    sc.exe query Apache24 | findstr /i "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo [OK] Apache24 restarted successfully!
    ) else (
        echo [WARNING] Please run as Administrator to restart Apache24 service.
    )
    timeout /t 3 >nul
    goto :MENU
)
if "%M_CHOICE%"=="5" (
    echo.
    echo ===============================================================================
    echo Docker Containers Status:
    echo ===============================================================================
    docker ps
    echo.
    pause
    goto :MENU
)
if "%M_CHOICE%"=="6" (
    explorer "%~dp0..\document"
    goto :MENU
)
if "%M_CHOICE%"=="7" (
    call "%~dp0..\..\db\backup_sqlserver_db.bat"
    goto :MENU
)
if "%M_CHOICE%"=="0" (
    exit /b 0
)

echo [ERROR] Invalid choice. Please try again.
timeout /t 2 >nul
goto :MENU
