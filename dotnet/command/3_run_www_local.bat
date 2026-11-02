@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Run Local WWW Services (Viriyah Registration System)

echo ===============================================================================
echo            Viriyah Insurance - Viriyah Registration System
echo                   START LOCAL WWW AND SERVICES RUNTIME
echo ===============================================================================
echo.

:: Navigate to dotnet directory
cd /d "%~dp0.."
set DOTNET_DIR=%CD%

echo [INFO] Project Directory: %DOTNET_DIR%
echo.

:: -------------------------------------------------------------------------------
:: 1. CHECK AND START APACHE SERVICE (PORT 80)
:: -------------------------------------------------------------------------------
echo [1/3] Checking Apache24 Web Server...
sc.exe query Apache24 2>nul | findstr /i "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] Apache24 service is already RUNNING [Port 80].
) else (
    echo [INFO] Apache24 is not running. Attempting to start service...
    net start Apache24 >nul 2>&1
    sc.exe query Apache24 2>nul | findstr /i "RUNNING" >nul
    if %errorlevel% equ 0 (
        echo [OK] Apache24 service started successfully.
    ) else (
        echo [WARNING] Could not start Apache24 automatically.
        echo Please run this script as Administrator if Apache fails to bind port 80.
    )
)
echo.

:: -------------------------------------------------------------------------------
:: 2. CHECK AND START DOCKER COMPOSE STACK (MS SQL 2025 AND BACKEND API PORT 8085)
:: -------------------------------------------------------------------------------
echo [2/3] Checking Docker Compose Services [MS SQL 2025 and ASP.NET Core 8 API]...
where docker >nul 2>&1
if %errorlevel% equ 0 (
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Starting containers via Docker Compose...
        docker compose up -d
        if %errorlevel% equ 0 (
            echo [OK] Docker containers [mssql2025, backend, frontend] are UP.
        ) else (
            echo [WARNING] Docker Compose encountered a warning.
        )
    ) else (
        echo [WARNING] Docker Desktop daemon is not running.
        echo If you need the MS SQL 2025 or Backend API container, please start Docker Desktop.
    )
) else (
    echo [INFO] Docker CLI not found. Skipping Docker Compose startup.
)
echo.

:: -------------------------------------------------------------------------------
:: 3. LAUNCH BROWSER AND SHOW ENDPOINTS
:: -------------------------------------------------------------------------------
echo [3/3] Launching Local Application in Default Web Browser...
start "" "http://localhost/"

echo.
echo ===============================================================================
echo                  LOCAL SERVICES DASHBOARD AND ENDPOINTS
echo ===============================================================================
echo  [1] Frontend Web Application (Apache Port 80):
echo      -^> http://localhost/  or  http://127.0.0.1/
echo.
echo  [2] Backend RESTful API (.NET 8 Port 8085):
echo      -^> http://localhost:8085/api
echo      -^> http://localhost:8085/api/config
echo.
echo  [3] Microsoft SQL Server 2025 (Primary Enterprise RDBMS):
echo      -^> Host: localhost,14333
echo      -^> User: sa  ^|  Password: Pass@456981@XKTT
echo      -^> Database: thaiairp_iptc
echo.
echo  [4] Interactive Database Architecture Infographic:
echo      -^> http://localhost/frontend/public/db_infographic.html
echo.
echo  [5] Official Git Repository:
echo      -^> https://github.com/ednakrabgit/register_form
echo ===============================================================================
echo.
echo Press any key to close this window...
pause >nul
