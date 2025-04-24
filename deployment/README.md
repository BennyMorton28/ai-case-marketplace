# Deployment Guide

## Prerequisites

- Node.js and npm installed
- PM2 installed globally (`npm install -g pm2`)
- Git access to the repository
- Nginx installed and configured
- Proper permissions on the server

## Initial Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd ai-case-marketplace
   ```

2. Set up blue/green environment:
   ```bash
   bash deployment/scripts/setup-environment.sh
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the application:
   ```bash
   npm run build
   ```

## Deployment Process

### Blue/Green Deployment (Recommended)

We use a blue/green deployment strategy to ensure zero-downtime deployments. The process maintains two environments (blue and green) and switches between them for each deployment.

To deploy:

```bash
bash deployment/scripts/blue-green-deploy.sh
```

This script will:
1. Determine the current active environment (blue or green)
2. Set up the inactive environment with the new code
3. Build and start the new version
4. Verify the new version is healthy
5. Switch traffic to the new version
6. Shut down the old version

Benefits:
- Zero downtime deployments
- Automatic rollback if deployment fails
- No users affected during deployment
- Easy rollback capability

### Manual Deployment (Not Recommended)

If you need to deploy manually, follow these steps:

1. Pull latest changes:
   ```bash
   git pull origin master
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

4. Set up static files:
   ```bash
   bash deployment/scripts/setup-static.sh
   ```

5. Restart the PM2 process:
   ```bash
   pm2 restart kellogg-cases
   ```

## Environment Details

### Blue Environment
- Port: 3000
- PM2 Process Name: blue
- Used for initial deployment

### Green Environment
- Port: 3001
- PM2 Process Name: green
- Used as alternate environment

## Verification

After deployment, verify:

1. Both environments are configured:
   ```bash
   ls -la /home/ec2-user/environments/
   ```

2. Current environment is running:
   ```bash
   pm2 status
   ```

3. Nginx is properly routing:
   ```bash
   curl -I https://kellogg.noyesai.com
   ```

4. Static files are accessible in both environments:
   ```bash
   ls -la /home/ec2-user/environments/current/.next/standalone/.next/static/
   ```

## Rollback Process

To rollback to the previous version:

1. Identify the previous environment:
   ```bash
   readlink /home/ec2-user/environments/current
   ```

2. Switch back to the other environment:
   ```bash
   sudo rm /home/ec2-user/environments/current
   sudo ln -s /home/ec2-user/environments/[other-env] /home/ec2-user/environments/current
   ```

3. Update nginx configuration:
   ```bash
   echo "map \$request_uri \$backend { default \"[other-env]_backend\"; }" | sudo tee /etc/nginx/current_backend.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```

## Troubleshooting

### Static Files Not Loading
1. Check if files exist in both environments:
   ```bash
   ls -la /home/ec2-user/environments/*/static/
   ```
2. Verify nginx configuration
3. Check nginx error logs
4. Verify file permissions

### Deployment Failed
1. Check deployment logs
2. Verify both environments are properly configured
3. Check PM2 logs for both environments
4. Verify nginx configuration

### Health Checks Failed
1. Check application logs
2. Verify ports are correctly assigned
3. Check resource usage
4. Verify database connections 