#!/bin/bash

# Configuration
EC2_HOST="3.21.60.197"
EC2_USER="ec2-user"
KEY_PATH="/Users/benny/Downloads/Noyes/Noyes AI/Kellogg/bmsd-case-demo-key.pem"
APP_NAME="kellogg-cases"
APP_DIR="/home/ec2-user/app"
REPO_URL="https://github.com/BennyMorton28/ai-case-marketplace.git"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting deployment process for Kellogg Cases...${NC}"

# Function to check if a command succeeded
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: $1${NC}"
        exit 1
    fi
}

# SSH into the server and execute deployment commands
ssh -i "$KEY_PATH" $EC2_USER@$EC2_HOST << 'EOF'
    # Create backup of current deployment
    echo "Creating backup of current deployment..."
    if [ -d "$APP_DIR" ]; then
        mv $APP_DIR ${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)
    fi

    # Clone the repository
    echo "Cloning repository..."
    git clone $REPO_URL $APP_DIR
    check_error "Failed to clone repository"

    # Navigate to app directory
    cd $APP_DIR

    # Install dependencies
    echo "Installing dependencies..."
    npm install
    check_error "Failed to install dependencies"

    # Generate Prisma client and push schema
    echo "Setting up database..."
    npm run prisma:generate
    npm run prisma:push
    check_error "Failed to setup database"

    # Build the application
    echo "Building application..."
    npm run build
    check_error "Failed to build application"

    # Start the new instance with PM2
    echo "Starting new instance..."
    pm2 start ecosystem.config.js --env production
    check_error "Failed to start new instance"

    # Wait for the new instance to be ready
    echo "Waiting for new instance to be ready..."
    sleep 10

    # Check if the new instance is responding
    if curl -s http://localhost:3000 > /dev/null; then
        echo "New instance is responding correctly"
        
        # Stop the old instance
        pm2 stop $APP_NAME
        pm2 delete $APP_NAME
        
        # Save PM2 configuration
        pm2 save
        
        echo "Deployment completed successfully!"
    else
        echo "New instance is not responding correctly"
        echo "Rolling back to previous version..."
        
        # Stop the new instance
        pm2 stop $APP_NAME
        pm2 delete $APP_NAME
        
        # Restore the backup
        mv ${APP_DIR}_backup_* $APP_DIR
        cd $APP_DIR
        pm2 start ecosystem.config.js --env production
        
        echo "Rollback completed"
        exit 1
    fi
EOF

# Check if the SSH command succeeded
check_error "Deployment failed"

echo -e "${GREEN}Deployment completed successfully!${NC}" 