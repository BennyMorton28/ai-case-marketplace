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

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   npm run build
   ```

## Deployment Process

### Automated Deployment

We have automated the deployment process. Simply run:

```bash
bash deployment/scripts/deploy.sh
```

This script will:
1. Pull latest changes
2. Install dependencies
3. Build the application
4. Set up static files for standalone mode
5. Restart the PM2 process
6. Verify the deployment

### Manual Deployment Steps

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

## Important Notes

- The application runs in standalone mode
- Static files must be copied to `.next/standalone/.next/static/` after each build
- Nginx serves as a reverse proxy to the Next.js application
- The application runs on internal IP 172.31.29.105:3000

## Verification

After deployment, verify:

1. PM2 process is running:
   ```bash
   pm2 status
   ```

2. Next.js server is responding:
   ```bash
   curl http://172.31.29.105:3000/api/health
   ```

3. Static files are accessible:
   ```bash
   ls -la .next/standalone/.next/static/
   ```

## Troubleshooting

If static files are not loading:
1. Check if files exist in `.next/standalone/.next/static/`
2. Verify nginx configuration in `/etc/nginx/conf.d/kellogg.noyesai.com.conf`
3. Check nginx error logs: `sudo tail -f /var/log/nginx/kellogg.error.log`
4. Verify file permissions and ownership 