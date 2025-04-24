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

    # Set proper permissions on target directory
    echo "Setting up target directory permissions..."
    sudo chown -R ec2-user:ec2-user "$target_dir"
    sudo chmod -R 755 "$target_dir"

    # Clean and create target directory
    echo "Cleaning target directory..."
    sudo rm -rf "$target_dir"/*
    sudo mkdir -p "$target_dir"
    sudo chown ec2-user:ec2-user "$target_dir"

    # Copy application files
    echo "Copying application files..."
    cp -r /home/ec2-user/app/* "$target_dir/"
    cp /home/ec2-user/app/.env "$target_dir/.env"

    # Set permissions
    echo "Setting permissions..."
    sudo chown -R ec2-user:ec2-user "$target_dir"
    sudo chmod -R 755 "$target_dir"
    sudo chmod 600 "$target_dir/.env"

    # Create necessary directories with proper permissions
    echo "Setting up directory structure..."
    sudo mkdir -p "$target_dir/public"
    sudo chown -R ec2-user:ec2-user "$target_dir/public"
    sudo chmod -R 755 "$target_dir/public"

    # Install dependencies
    echo "Installing dependencies..."
    cd "$target_dir"
    npm install

    # Set permissions before build
    echo "Setting permissions before build..."
    sudo chown -R ec2-user:ec2-user .
    sudo chmod -R 755 .
    sudo chmod 600 .env
    
    # Ensure .next directory has correct permissions
    sudo mkdir -p .next
    sudo chown -R ec2-user:ec2-user .next
    sudo chmod -R 755 .next

    # Build the application
    echo "Building application..."
    npm run build

    # Set permissions again after build
    echo "Setting final permissions..."
    sudo chown -R ec2-user:ec2-user .
    sudo chmod -R 755 .
    sudo chmod 600 .env

    # Ensure static files have correct permissions
    sudo chown -R ec2-user:ec2-user .next/static
    sudo chmod -R 755 .next/static

    # Start the application with PM2
    echo "Starting application with PM2..."
    
    # Stop any existing process on the target port
    echo "Cleaning up old processes..."
    pm2 delete "app-$target_port" || true
    
    # Start the new process
    echo "Starting new process..."
    PORT=$target_port pm2 start npm --name "app-$target_port" -- start

    # Perform health check
    echo "Performing health check..."
    echo "Health check URL: http://172.31.29.105:$target_port/api/health"
    
    for i in {1..30}; do
        echo "Attempt $i: Checking health endpoint..."
        response=$(curl -s "http://172.31.29.105:$target_port/api/health")
        echo "Response: $response"
        
        if echo "$response" | grep -q "ok"; then
            echo "Health check passed!"
            if ! update_nginx_backend "$target_env"; then
                echo "Failed to update Nginx configuration. Rolling back..."
                rollback_deployment
                exit 1
            fi
            echo "Successfully switched to $target_env environment"
            return 0
        fi
        echo "Waiting for application to start... ($i/30)"
        sleep 5  # Increased from 2 to 5 seconds
    done

    echo "Health check failed after 30 attempts"
    echo "Checking PM2 logs..."
    pm2 logs "app-$target_port" --lines 50
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

# Function to switch traffic to target environment
switch_traffic() {
    local target_env="$1"
    local target_dir="$2"
    
    echo "Switching traffic to $target_env environment..."
    
    # Update current symlink
    echo "Updating symlink to point to $target_env..."
    sudo rm -f "$CURRENT_LINK"
    sudo ln -s "$target_dir" "$CURRENT_LINK"

    # Copy and update Nginx configurations
    echo "Updating Nginx configurations..."
    sudo cp /home/ec2-user/app/deployment/nginx/blue-green.conf /etc/nginx/conf.d/blue-green.conf
    sudo cp /home/ec2-user/app/deployment/nginx/kellogg.noyesai.com.conf /etc/nginx/conf.d/kellogg.noyesai.com.conf
    sudo chown root:root /etc/nginx/conf.d/blue-green.conf /etc/nginx/conf.d/kellogg.noyesai.com.conf
    sudo chmod 644 /etc/nginx/conf.d/blue-green.conf /etc/nginx/conf.d/kellogg.noyesai.com.conf

    # Test and reload Nginx
    echo "Testing Nginx configuration..."
    if sudo nginx -t; then
        echo "Nginx configuration test passed. Reloading Nginx..."
        sudo systemctl reload nginx
        echo "Nginx reloaded successfully."
        return 0
    else
        echo "Nginx configuration test failed!"
        return 1
    fi
}

update_nginx_backend() {
    local target_env=$1
    local config_file="/etc/nginx/conf.d/blue-green.conf"
    
    echo "Updating Nginx backend to $target_env"
    
    # Create a temporary file
    local temp_file=$(mktemp)
    
    # Update the default backend in the configuration
    sed "s/default \".*_backend\";/default \"${target_env}_backend\";/" "$config_file" > "$temp_file"
    
    # Copy the temporary file back
    sudo cp "$temp_file" "$config_file"
    rm "$temp_file"
    
    # Test and reload nginx
    echo "Testing Nginx configuration..."
    sudo nginx -t
    if [ $? -eq 0 ]; then
        echo "Reloading Nginx..."
        sudo systemctl reload nginx
    else
        echo "Nginx configuration test failed!"
        return 1
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

# Ensure base directory exists with proper permissions
sudo mkdir -p "$BASE_DIR"
sudo chown -R ec2-user:ec2-user "$BASE_DIR"
sudo chmod -R 755 "$BASE_DIR"

# Create target directory if it doesn't exist
sudo mkdir -p "$target_dir"
sudo chown ec2-user:ec2-user "$target_dir"
sudo chmod 755 "$target_dir"

# Deploy to target environment
if deploy_app "$target_dir" "$target_port"; then
    echo "Deployment successful!"
    
    # Switch traffic to target environment
    if switch_traffic "$target_env" "$target_dir"; then
        echo "Deployment completed successfully!"
        exit 0
    else
        echo "Traffic switch failed! Rolling back..."
        # Stop the failed deployment
        pm2 delete "app-$target_port" || true
        exit 1
    fi
else
    echo "Deployment failed! Rolling back..."
    # Stop the failed deployment
    pm2 delete "app-$target_port" || true
    exit 1
fi 