#!/bin/bash

# Exit on any error
set -e

echo "Setting up blue/green deployment environment..."

# Create base directories
sudo mkdir -p /home/ec2-user/environments/blue
sudo mkdir -p /home/ec2-user/environments/green
sudo mkdir -p /home/ec2-user/environments/current

# Set up symlink for current environment if it doesn't exist
if [ ! -L /home/ec2-user/environments/current ]; then
    sudo ln -s /home/ec2-user/environments/blue /home/ec2-user/environments/current
fi

# Set permissions
sudo chown -R ec2-user:ec2-user /home/ec2-user/environments
sudo chmod -R 755 /home/ec2-user/environments

echo "Environment setup complete!" 