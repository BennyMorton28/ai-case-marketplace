#!/bin/bash

# Exit on any error
set -e

echo "Starting static file copy process..."

# Ensure directories exist
mkdir -p public
mkdir -p .next/static

# Set permissions
echo "Setting permissions..."
sudo chown -R nginx:nginx public
sudo chown -R nginx:nginx .next/static
sudo chmod -R 755 public
sudo chmod -R 755 .next/static

# Verify file existence
echo "Verifying directories..."
if [ ! -d ".next/static" ] || [ ! -d "public" ]; then
    echo "Error: Required directories not found"
    exit 1
fi

echo "Static file setup completed successfully" 