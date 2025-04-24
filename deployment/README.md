# Deployment Guide

## Prerequisites

- Node.js and npm installed
- PM2 installed globally (`npm install -g pm2`)
- Git access to the repository
- Nginx installed and configured
- Proper permissions on the server

### Environment Variables

The following environment variables are **required** for the application to function properly. The deployment script will validate the presence of these variables:

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
bash deployment/scripts/blue-green-deploy.sh
```

The script will:
1. Validate all required environment variables
2. Determine the current active environment (blue or green)
3. Deploy to the inactive environment
4. Install dependencies and build the application
5. Start the new version with PM2
6. Perform health checks
7. Update Nginx configuration
8. Switch traffic to the new version if health checks pass
9. Automatically rollback if deployment fails

### Environment Details

#### Blue Environment
- Port: 3000
- Directory: /home/ec2-user/environments/blue
- PM2 Process Name: app-3000

#### Green Environment
- Port: 3001
- Directory: /home/ec2-user/environments/green
- PM2 Process Name: app-3001

## Verification Steps

After deployment:

1. Check environment status:
   ```bash
   # View current environment
   readlink /home/ec2-user/environments/current
   
   # Check PM2 processes
   pm2 list
   ```

2. Verify Nginx configuration:
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check current routing
   cat /etc/nginx/conf.d/blue-green.conf
   ```

3. Test the application:
   ```bash
   # Check health endpoint
   curl http://localhost:3000/api/health  # or 3001 depending on active environment
   
   # Check main site
   curl -I https://kellogg.noyesai.com
   ```

## Troubleshooting

### Common Issues

1. **Environment Variable Errors**
   - Check the `.env` file exists and has correct permissions
   - Verify all required variables are set
   - Run `bash deployment/scripts/blue-green-deploy.sh` to validate

2. **Health Check Failures**
   - Check PM2 logs: `pm2 logs app-3000` or `pm2 logs app-3001`
   - Verify application is running: `curl http://localhost:3000/api/health`
   - Check system resources: `top` or `htop`

3. **Nginx Issues**
   - Check error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify configuration: `sudo nginx -t`
   - Check upstream status: `curl http://localhost:3000/api/health`

### Manual Rollback

If needed, you can manually rollback to the previous environment:

```bash
# 1. Identify current and previous environments
current_env=$(readlink /home/ec2-user/environments/current)
previous_env=$(if [[ "$current_env" == *"blue"* ]]; then echo "green"; else echo "blue"; fi)

# 2. Switch symlink
sudo ln -sf /home/ec2-user/environments/$previous_env /home/ec2-user/environments/current

# 3. Update Nginx configuration
sudo tee /etc/nginx/conf.d/blue-green.conf > /dev/null << EOF
upstream blue_backend {
    server 127.0.0.1:3000;
}

upstream green_backend {
    server 127.0.0.1:3001;
}

map \$request_uri \$backend {
    default $(if [[ "$previous_env" == "blue" ]]; then echo "blue_backend"; else echo "green_backend"; fi);
}
EOF

# 4. Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
``` 