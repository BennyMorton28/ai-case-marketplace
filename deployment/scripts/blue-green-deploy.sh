#!/bin/bash

# Exit on any error
set -e

echo "Starting blue/green deployment process..."

# Function to get current environment
get_current_env() {
    if [ -L /home/ec2-user/environments/current ]; then
        current=$(readlink /home/ec2-user/environments/current)
        echo $(basename $current)
    else
        echo "blue"
    fi
}

# Function to get target environment
get_target_env() {
    current=$(get_current_env)
    if [ "$current" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to get port for environment
get_port() {
    if [ "$1" = "blue" ]; then
        echo "3000"
    else
        echo "3001"
    fi
}

# Get current and target environments
CURRENT_ENV=$(get_current_env)
TARGET_ENV=$(get_target_env)
TARGET_PORT=$(get_port $TARGET_ENV)

echo "Current environment: $CURRENT_ENV"
echo "Target environment: $TARGET_ENV"
echo "Target port: $TARGET_PORT"

# Create target directory if it doesn't exist
sudo mkdir -p /home/ec2-user/environments/$TARGET_ENV
sudo chown -R ec2-user:ec2-user /home/ec2-user/environments/$TARGET_ENV

# Clean target directory
rm -rf /home/ec2-user/environments/$TARGET_ENV/*

# Copy application to target environment
cp -r /home/ec2-user/app/* /home/ec2-user/environments/$TARGET_ENV/

# Navigate to target environment
cd /home/ec2-user/environments/$TARGET_ENV

# Install dependencies
echo "Installing dependencies..."
npm install

# Set environment variables for the build
export PORT=$TARGET_PORT
export NODE_ENV=production

# Build the application
echo "Building application..."
npm run build

# Setup static files and standalone directory
echo "Setting up static files..."
sudo chown -R nginx:nginx .next/static
sudo chmod -R 755 .next/static

# Start new environment with PM2
echo "Starting new environment..."
pm2 delete $TARGET_ENV 2>/dev/null || true
cd .next/standalone
PORT=$TARGET_PORT NODE_ENV=production pm2 start server.js --name $TARGET_ENV --instances max

# Wait for application to start
echo "Waiting for application to start..."
sleep 10

# Verify new environment
echo "Verifying new environment..."
HEALTH_CHECK=0
MAX_RETRIES=5
RETRY_COUNT=0

while [ $HEALTH_CHECK -eq 0 ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "http://172.31.29.105:$TARGET_PORT/api/health" | grep -q "healthy"; then
        HEALTH_CHECK=1
    else
        echo "Health check failed, retrying in 5 seconds..."
        sleep 5
        RETRY_COUNT=$((RETRY_COUNT + 1))
    fi
done

if [ $HEALTH_CHECK -eq 0 ]; then
    echo "New environment failed health checks. Rolling back..."
    pm2 delete $TARGET_ENV
    exit 1
fi

# Update nginx configuration
echo "Updating nginx configuration..."
sudo bash -c "cat > /etc/nginx/conf.d/blue-green.conf << EOL
# Define upstream servers for blue/green deployment
upstream blue_backend {
    server 172.31.29.105:3000;
    keepalive 32;
}

upstream green_backend {
    server 172.31.29.105:3001;
    keepalive 32;
}

# Determine which backend to use
map \$request_uri \$backend {
    default \"${TARGET_ENV}_backend\";
}
EOL"

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration test passed. Reloading nginx..."
    sudo systemctl reload nginx
    
    # Update current environment symlink
    sudo rm -f /home/ec2-user/environments/current
    sudo ln -s /home/ec2-user/environments/$TARGET_ENV /home/ec2-user/environments/current
    sudo chown -R ec2-user:ec2-user /home/ec2-user/environments/current
    
    # Stop old environment after grace period
    echo "Waiting for connections to drain from old environment..."
    sleep 30
    pm2 delete $CURRENT_ENV
    
    echo "Deployment completed successfully!"
else
    echo "Nginx configuration test failed. Rolling back..."
    pm2 delete $TARGET_ENV
    exit 1
fi 