#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment process..."

# Pull latest changes
echo "Pulling latest changes..."
git pull origin master

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Setup static files
echo "Setting up static files..."
bash deployment/scripts/setup-static.sh

# Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 restart kellogg-cases

# Verify deployment
echo "Verifying deployment..."

# Check if PM2 process is running
if pm2 status | grep -q "kellogg-cases.*online"; then
    echo "✓ PM2 process is running"
else
    echo "✗ PM2 process failed to start"
    exit 1
fi

# Check if Next.js server is responding
if curl -s -o /dev/null -w "%{http_code}" http://172.31.29.105:3000/api/health | grep -q "200"; then
    echo "✓ Next.js server is responding"
else
    echo "✗ Next.js server is not responding"
    exit 1
fi

# Check if static files are accessible
if [ -d ".next/standalone/.next/static" ]; then
    echo "✓ Static files directory exists"
else
    echo "✗ Static files directory is missing"
    exit 1
fi

echo "Deployment completed successfully!" 