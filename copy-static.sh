#!/bin/bash

# Copy public files
cp -r public .next/standalone/

# Copy static files
mkdir -p .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/

# Set permissions
chmod -R 755 .next/standalone/public
chmod -R 755 .next/standalone/.next/static 