const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MaintenanceMode {
  constructor() {
    this.maintenanceFile = path.join(process.cwd(), 'public', 'maintenance.html');
    this.nginxConfigPath = '/etc/nginx/sites-available/kellogg.noyesai.com.conf';
    this.maintenanceTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Maintenance</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
            color: #333;
        }
        .maintenance-container {
            max-width: 600px;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 { color: #2563eb; margin-bottom: 20px; }
        p { margin-bottom: 15px; }
        .status { 
            display: inline-block;
            padding: 8px 16px;
            background: #dbeafe;
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="maintenance-container">
        <h1>System Maintenance</h1>
        <p>We're currently performing scheduled maintenance to improve our services.</p>
        <p>This maintenance window is expected to last approximately 30 minutes.</p>
        <div class="status">Estimated completion: <span id="completion-time">$COMPLETION_TIME</span></div>
        <p>We apologize for any inconvenience and appreciate your patience.</p>
        <p>For urgent matters, please contact your system administrator.</p>
    </div>
</body>
</html>`;
  }

  async start(duration = 30) {
    console.log('Enabling maintenance mode...');

    // Calculate completion time
    const completionTime = new Date(Date.now() + duration * 60000).toLocaleTimeString();

    // Create maintenance page
    const maintenanceContent = this.maintenanceTemplate.replace('$COMPLETION_TIME', completionTime);
    fs.writeFileSync(this.maintenanceFile, maintenanceContent);

    // Backup current nginx config
    const backupPath = `${this.nginxConfigPath}.backup`;
    fs.copyFileSync(this.nginxConfigPath, backupPath);

    // Modify nginx config to serve maintenance page
    let nginxConfig = fs.readFileSync(this.nginxConfigPath, 'utf8');
    
    // Add maintenance mode configuration
    const maintenanceLocation = `
    location / {
        if (-f $document_root/maintenance.html) {
            return 503;
        }
        try_files $uri $uri/ /index.html;
    }

    error_page 503 @maintenance;
    location @maintenance {
        rewrite ^(.*)$ /maintenance.html break;
    }`;

    nginxConfig = nginxConfig.replace(
      /location \/ {[^}]*}/,
      maintenanceLocation
    );

    fs.writeFileSync(this.nginxConfigPath, nginxConfig);

    // Test and reload nginx
    try {
      execSync('nginx -t');
      execSync('systemctl reload nginx');
      console.log(`Maintenance mode enabled. Will last approximately ${duration} minutes.`);
      console.log(`Estimated completion time: ${completionTime}`);
    } catch (error) {
      console.error('Error enabling maintenance mode:', error);
      // Restore backup
      fs.copyFileSync(backupPath, this.nginxConfigPath);
      execSync('systemctl reload nginx');
      throw error;
    }
  }

  async stop() {
    console.log('Disabling maintenance mode...');

    // Remove maintenance page
    if (fs.existsSync(this.maintenanceFile)) {
      fs.unlinkSync(this.maintenanceFile);
    }

    // Restore original nginx config
    const backupPath = `${this.nginxConfigPath}.backup`;
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, this.nginxConfigPath);
      fs.unlinkSync(backupPath);
    }

    // Reload nginx
    try {
      execSync('nginx -t');
      execSync('systemctl reload nginx');
      console.log('Maintenance mode disabled. System is back online.');
    } catch (error) {
      console.error('Error disabling maintenance mode:', error);
      throw error;
    }
  }
}

// Handle command line arguments
if (require.main === module) {
  const maintenance = new MaintenanceMode();
  const command = process.argv[2];
  const duration = parseInt(process.argv[3]) || 30;

  if (command === 'start') {
    maintenance.start(duration).catch(console.error);
  } else if (command === 'stop') {
    maintenance.stop().catch(console.error);
  } else {
    console.log('Usage: node maintenance-mode.js [start|stop] [duration_minutes]');
  }
}

module.exports = MaintenanceMode; 