#!/bin/bash

# Exit on any error
set -e

# Configuration
BLUE_PORT=3000
GREEN_PORT=3001
BASE_DIR="/home/ec2-user/environments"
BLUE_DIR="$BASE_DIR/blue"
GREEN_DIR="$BASE_DIR/green"
CURRENT_LINK="$BASE_DIR/current"

# Function to check if required environment variables exist
check_environment_variables() {
    local env_file="$1/.env"
    if [ ! -f "$env_file" ]; then
        echo "Error: .env file not found in $1"
        return 1
    fi

    required_vars=(
        "NEXTAUTH_SECRET"
        "NEXTAUTH_URL"
        "AZURE_AD_CLIENT_ID"
        "AZURE_AD_CLIENT_SECRET"
        "AZURE_AD_TENANT_ID"
        "DATABASE_URL"
    )

    missing_vars=()
    while IFS= read -r line || [[ -n "$line" ]]; do
        if [[ ! "$line" =~ ^[[:space:]]*# && "$line" =~ = ]]; then
            var_name="${line%%=*}"
            required_vars=("${required_vars[@]/$var_name}")
        fi
    done < "$env_file"

    for var in "${required_vars[@]}"; do
        if [ ! -z "$var" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "Error: Missing required environment variables in $env_file:"
        printf '%s\n' "${missing_vars[@]}"
        return 1
    fi

    return 0
}

# Function to deploy the application
deploy_app() {
    local target_dir="$1"
    local target_port="$2"

    # Check environment variables before proceeding
    if ! check_environment_variables "/home/ec2-user/app"; then
        echo "Environment variables check failed. Aborting deployment."
        return 1
    fi

    # Clean and create target directory
    echo "Cleaning target directory..."
    rm -rf "$target_dir"/*
    mkdir -p "$target_dir"

    # Copy application files
    echo "Copying application files..."
    cp -r /home/ec2-user/app/* "$target_dir/"
    cp /home/ec2-user/app/.env "$target_dir/.env"

    # Install dependencies
    echo "Installing dependencies..."
    cd "$target_dir"
    npm install

    # Build the application
    echo "Building application..."
    npm run build

    # Set permissions
    echo "Setting permissions..."
    sudo chown -R ec2-user:ec2-user .
    sudo chmod -R 755 .
    sudo chmod 600 .env

    # Start the application with PM2
    echo "Starting application with PM2..."
    PORT=$target_port pm2 start npm --name "app-$target_port" -- start

    # Perform health check
    echo "Performing health check..."
    for i in {1..30}; do
        if curl -s "http://172.31.29.105:$target_port/api/health" | grep -q "ok"; then
            echo "Health check passed!"
            return 0
        fi
        echo "Waiting for application to start... ($i/30)"
        sleep 2
    done

    echo "Health check failed after 30 attempts"
    return 1
}

# Function to get current environment
get_current_env() {
    if [ -L "$CURRENT_LINK" ]; then
        current=$(readlink "$CURRENT_LINK")
        if [ "$current" = "$BLUE_DIR" ]; then
            echo "blue"
        elif [ "$current" = "$GREEN_DIR" ]; then
            echo "green"
        else
            echo "unknown"
        fi
    else
        echo "none"
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

# Function to get environment port
get_env_port() {
    if [ "$1" = "blue" ]; then
        echo "$BLUE_PORT"
    else
        echo "$GREEN_PORT"
    fi
}

echo "Starting blue/green deployment..."

# Determine current and target environments
current_env=$(get_current_env)
target_env=$(get_target_env)
target_dir="${BASE_DIR}/${target_env}"
target_port=$(get_env_port "$target_env")

echo "Current environment: $current_env"
echo "Target environment: $target_env"
echo "Target directory: $target_dir"
echo "Target port: $target_port"

# Create target directory if it doesn't exist
mkdir -p "$target_dir"

# Deploy to target environment
if deploy_app "$target_dir" "$target_port"; then
    echo "Deployment successful!"
    
    # Update current symlink
    sudo ln -sf "$target_dir" "$CURRENT_LINK"
    
    # Update Nginx configuration
    echo "Updating Nginx configuration..."
    sudo tee /etc/nginx/conf.d/blue-green.conf > /dev/null << EOF
upstream blue_backend {
    server 172.31.29.105:$BLUE_PORT;
    keepalive 32;
}

upstream green_backend {
    server 172.31.29.105:$GREEN_PORT;
    keepalive 32;
}

map \$request_uri \$backend {
    default $(if [ "$target_env" = "blue" ]; then echo "blue_backend"; else echo "green_backend"; fi);
}
EOF

    # Test and reload Nginx
    echo "Testing Nginx configuration..."
    if sudo nginx -t; then
        echo "Reloading Nginx..."
        sudo systemctl reload nginx
        echo "Deployment completed successfully!"
        exit 0
    else
        echo "Nginx configuration test failed!"
        exit 1
    fi
else
    echo "Deployment failed! Rolling back..."
    # Stop the failed deployment
    pm2 delete "app-$target_port" || true
    exit 1
fi 