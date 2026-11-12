@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Deploy /dotnet and SQLite DB to GCE VM (free-tier-vm)

echo ===============================================================================
echo            Viriyah Insurance - Deploy /dotnet + SQLite DB to GCE VM
echo                       Target VM: free-tier-vm (us-central1-a)
echo ===============================================================================
echo.

cd /d "%~dp0..\.."
set REPO_ROOT=%CD%
set VM_NAME=free-tier-vm
set VM_ZONE=us-central1-a
set GCP_PROJECT=project-86010b3e-ea84-4c5a-8ec
set TMP_TAR=%TEMP%\dotnet_vm_deploy.tar.gz
set TMP_PUB=%TEMP%\viriyah_vm_publish

echo [1/5] Syncing latest MS SQL Server data to SQLite (dotnet\backend\app.db)...
python export_mssql_to_sqlite.py
if %errorlevel% neq 0 (
    echo [ERROR] Failed to export MSSQL to SQLite!
    pause
    exit /b 1
)

echo.
echo [2/5] Building Frontend SPA (dotnet\frontend\dist)...
pushd "%REPO_ROOT%\dotnet\frontend"
call npm run build
if %errorlevel% neq 0 (
    popd
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)
popd

echo.
echo [3/5] Publishing .NET 8 Backend for linux-x64...
if exist "%TMP_PUB%" rmdir /s /q "%TMP_PUB%"
dotnet publish "%REPO_ROOT%\dotnet\backend\backend.csproj" -c Release -r linux-x64 --no-self-contained -o "%TMP_PUB%"
if %errorlevel% neq 0 (
    echo [ERROR] Backend publish failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Packaging /dotnet + SQLite DB archive...
python -c "import os, tarfile; ex_d={'node_modules','bin','obj','out','logs','.vs','notebookLM','diagrams'}; ex_e={'.mp4','.pptx','.docx','.pdf'}; t=tarfile.open(r'%TMP_TAR%','w:gz'); [t.add(os.path.join(r,f), arcname=os.path.relpath(os.path.join(r,f),'.').replace('\\','/')) for r,ds,fs in os.walk('dotnet') if not ds.__setitem__(slice(None),[d for d in ds if d not in ex_d]) for f in fs if os.path.splitext(f)[1].lower() not in ex_e]; [t.add(os.path.join(r,f), arcname='dotnet/backend/out_linux/'+os.path.relpath(os.path.join(r,f),r'%TMP_PUB%').replace('\\','/')) for r,ds,fs in os.walk(r'%TMP_PUB%') for f in fs if f!='app.db']; t.close(); print('[OK] Packaged:', r'%TMP_TAR%')"
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Uploading and restarting service on %VM_NAME%...
call gcloud compute scp "%TMP_TAR%" %VM_NAME%:/tmp/dotnet_vm_deploy.tar.gz --zone=%VM_ZONE% --project=%GCP_PROJECT%
if %errorlevel% neq 0 (
    echo [ERROR] gcloud compute scp failed!
    pause
    exit /b 1
)

call gcloud compute ssh %VM_NAME% --zone=%VM_ZONE% --project=%GCP_PROJECT% --command="sudo systemctl stop viriyah-backend && sudo tar -xzf /tmp/dotnet_vm_deploy.tar.gz -C /opt/register_form && rm -f /tmp/dotnet_vm_deploy.tar.gz && sudo chown -R www-data:www-data /opt/register_form && sudo systemctl start viriyah-backend && sudo systemctl reload nginx && sleep 2 && curl -sf http://127.0.0.1:8085/health && echo ''"
if %errorlevel% neq 0 (
    echo [ERROR] Remote VM deployment failed!
    pause
    exit /b 1
)

del /f /q "%TMP_TAR%" 2>nul
if exist "%TMP_PUB%" rmdir /s /q "%TMP_PUB%"

echo.
echo ===============================================================================
echo               DEPLOY TO VM (%VM_NAME%) COMPLETED SUCCESSFULLY
echo ===============================================================================
pause
