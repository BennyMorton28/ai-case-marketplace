#!/bin/bash

# Exit on any error
set -e

echo "Starting static file copy process..."

# Ensure directories exist
mkdir -p .next/standalone/public
mkdir -p .next/standalone/.next/static

# Copy public files with verification
echo "Copying public files..."
if cp -rv public/* .next/standalone/public/; then
    echo "Public files copied successfully"
else
    echo "Error copying public files"
    exit 1
fi

# Copy static files with verification
echo "Copying static files..."
if cp -rv .next/static/* .next/standalone/.next/static/; then
    echo "Static files copied successfully"
else
    echo "Error copying static files"
    exit 1
fi

# Set permissions
echo "Setting permissions..."
chmod -R 755 .next/standalone/public
chmod -R 755 .next/standalone/.next/static

# Verify file existence
echo "Verifying file copy..."
if [ ! -d ".next/standalone/.next/static" ] || [ ! -d ".next/standalone/public" ]; then
    echo "Error: Required directories not found after copy"
    exit 1
fi

echo "Static file copy process completed successfully" 