# Deployment Guide

## Prerequisites

- Node.js and npm installed
- PM2 installed globally (`npm install -g pm2`)
- Git access to the repository
- Nginx installed and configured
- Proper permissions on the server

### Environment Variables

The following environment variables are **required** for the application to function properly. The deployment script will automatically validate these variables before proceeding:

```bash
# Authentication (Required)
NEXTAUTH_SECRET=<random-string>  # Used for encrypting session data
NEXTAUTH_URL=https://kellogg.noyesai.com  # The canonical URL of the website

# Azure AD Configuration (Required)
AZURE_AD_CLIENT_ID=<client-id>  # Azure AD application client ID
AZURE_AD_CLIENT_SECRET=<client-secret>  # Azure AD application client secret
AZURE_AD_TENANT_ID=<tenant-id>  # Azure AD tenant ID

# Database Configuration (Required)
DATABASE_URL=<postgresql-url>  # URL for the PostgreSQL database

# Port Configuration (Automatically set by deployment script)
PORT=<3000-or-3001>  # Set automatically based on blue/green environment
```

### Setting Up Environment Variables

1. Create a `.env` file in the root directory:
   ```bash
   sudo nano /home/ec2-user/app/.env
   ```

2. Add the required environment variables with their values.

3. Ensure the `.env` file has the correct permissions:
   ```bash
   sudo chown ec2-user:ec2-user /home/ec2-user/app/.env
   sudo chmod 600 /home/ec2-user/app/.env
   ```

**Note**: The deployment script will automatically copy and configure the `.env` file for each environment.

## Initial Setup

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd ai-case-marketplace
   ```

2. Set up the environment structure:
   ```bash
   sudo mkdir -p /home/ec2-user/environments/{blue,green}
   sudo chown -R ec2-user:ec2-user /home/ec2-user/environments
   ```

## Deployment Process

### Blue/Green Deployment

We use a blue/green deployment strategy to ensure zero-downtime deployments. The process automatically manages two environments (blue and green) and switches between them for each deployment.

To deploy:

```bash
cd /home/ec2-user/app
git pull origin master  # Always pull latest changes first
bash deployment/scripts/blue-green-deploy.sh
```

The script will automatically:
1. Validate all required environment variables
2. Determine the current active environment (blue or green)
3. Clean up the target environment directory
4. Copy application files and .env
5. Install dependencies and build the application
6. Clean up any existing PM2 processes on the target port
7. Start the new version with PM2
8. Perform health checks (with automatic retry)
9. Update both the symlink and Nginx configuration
10. Switch traffic to the new version if all checks pass
11. Keep the previous environment running as a backup
12. Automatically rollback if any step fails

### Environment Details

#### Blue Environment
- Port: 3000
- Directory: /home/ec2-user/environments/blue
- PM2 Process Name: app-3000
- Nginx Upstream: blue_backend

#### Green Environment
- Port: 3001
- Directory: /home/ec2-user/environments/green
- PM2 Process Name: app-3001
- Nginx Upstream: green_backend

## Verification Steps

After deployment, the script will show detailed output of each step. You can also manually verify:

1. Check environment status:
   ```bash
   # View current environment
   readlink /home/ec2-user/environments/current
   
   # Check PM2 processes (both should be running)
   pm2 list
   ```

2. Verify Nginx configuration:
   ```bash
   # Check current routing
   cat /etc/nginx/conf.d/blue-green.conf
   
   # Test configuration
   sudo nginx -t
   ```

3. Test all endpoints:
   ```bash
   # Check both environments
   curl http://172.31.29.105:3000/api/health  # Blue
   curl http://172.31.29.105:3001/api/health  # Green
   
   # Check production URL
   curl https://kellogg.noyesai.com/api/health
   ```

## Troubleshooting

### Common Issues

1. **Environment Variable Errors**
   - Check the `.env` file exists and has correct permissions
   - Verify all required variables are set
   - The deployment script will validate variables automatically

2. **Health Check Failures**
   - Check PM2 logs: `pm2 logs app-3000` or `pm2 logs app-3001`
   - The script will show health check attempts and responses
   - Verify both environments: `curl http://172.31.29.105:3000/api/health`

3. **Nginx Issues**
   - Check error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify configuration: `sudo nginx -t`
   - Check both upstreams are defined in `/etc/nginx/conf.d/blue-green.conf`

### Automatic Rollback

The deployment script includes automatic rollback if:
- Environment variable validation fails
- Application build fails
- Health checks fail
- Nginx configuration test fails
- Traffic switch fails

### Manual Rollback

If needed, you can manually switch environments:

```bash
bash deployment/scripts/blue-green-deploy.sh
```

The script will automatically detect the current environment and switch to the other one. 