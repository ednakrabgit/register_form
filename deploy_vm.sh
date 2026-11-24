#!/bin/bash
set -e
echo "=== Starting deployment on free-tier-vm ==="

# Stop backend service
echo "Stopping viriyah-backend..."
sudo systemctl stop viriyah-backend

# Extract tarball
echo "Extracting /tmp/vm_deploy.tar.gz..."
sudo rm -rf /tmp/vm_deploy
mkdir -p /tmp/vm_deploy
tar -xzf /tmp/vm_deploy.tar.gz -C /tmp/vm_deploy

# Deploy backend
echo "Deploying backend binaries and database..."
sudo mkdir -p /opt/register_form/dotnet/backend/out_linux
sudo cp -rf /tmp/vm_deploy/out_linux/* /opt/register_form/dotnet/backend/out_linux/
sudo cp -f /tmp/vm_deploy/out_linux/app.db /opt/register_form/dotnet/backend/app.db

# Deploy frontend to Nginx web root: /opt/register_form/dotnet/frontend/dist
echo "Deploying frontend to /opt/register_form/dotnet/frontend/dist..."
sudo mkdir -p /opt/register_form/dotnet/frontend/dist
sudo rm -rf /opt/register_form/dotnet/frontend/dist/*
sudo cp -rf /tmp/vm_deploy/dist/* /opt/register_form/dotnet/frontend/dist/

# Also sync /var/www/html as secondary
echo "Syncing /var/www/html..."
sudo mkdir -p /var/www/html
sudo rm -rf /var/www/html/*
sudo cp -rf /tmp/vm_deploy/dist/* /var/www/html/

# Permissions
echo "Setting permissions..."
sudo chown -R www-data:www-data /opt/register_form/dotnet/backend
sudo chown -R www-data:www-data /opt/register_form/dotnet/frontend
sudo chown -R www-data:www-data /var/www/html
sudo chmod 666 /opt/register_form/dotnet/backend/app.db || true

# Start backend service
echo "Starting viriyah-backend..."
sudo systemctl start viriyah-backend
sudo systemctl reload nginx

# Cleanup
echo "Cleaning up temp files..."
sudo rm -rf /tmp/vm_deploy /tmp/vm_deploy.tar.gz /tmp/deploy_vm.sh

echo "=== Deployment completed successfully! ==="
sudo systemctl status viriyah-backend --no-pager -n 10
