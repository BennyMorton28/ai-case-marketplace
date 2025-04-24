#!/bin/bash

# Exit on any error
set -e

echo "Setting up static files for standalone mode..."

# Create necessary directories
mkdir -p .next/standalone/.next/static

# Copy static files
echo "Copying static files..."
cp -r .next/static/* .next/standalone/.next/static/

# Set correct ownership
echo "Setting correct ownership..."
sudo chown -R nginx:nginx .next/standalone/.next/static

# Set correct permissions
echo "Setting correct permissions..."
sudo chmod -R 755 .next/standalone/.next/static

echo "Static file setup complete!" 