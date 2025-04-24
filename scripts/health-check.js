const https = require('https');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

class HealthCheck {
  constructor() {
    this.domain = 'kellogg.noyesai.com';
    this.checkInterval = 60000; // 1 minute
    this.logPath = path.join(process.cwd(), 'logs', 'health-checks.log');
    this.metricsPath = path.join(process.cwd(), 'logs', 'metrics.json');
    
    // Ensure log directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'logs'))) {
      fs.mkdirSync(path.join(process.cwd(), 'logs'));
    }
  }

  async checkEndpoint(path = '/') {
    return new Promise((resolve) => {
      const options = {
        hostname: this.domain,
        port: 443,
        path: path,
        method: 'GET',
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        let responseTime = Date.now();
        resolve({
          status: res.statusCode,
          responseTime: responseTime - startTime,
          headers: res.headers
        });
      });

      const startTime = Date.now();

      req.on('error', (error) => {
        resolve({
          status: 'error',
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });

      req.end();
    });
  }

  async checkSystem() {
    return new Promise((resolve) => {
      exec('pm2 jlist', (error, stdout) => {
        if (error) {
          resolve({ error: error.message });
          return;
        }
        try {
          const processes = JSON.parse(stdout);
          resolve({
            processes: processes.map(p => ({
              name: p.name,
              status: p.pm2_env.status,
              cpu: p.monit.cpu,
              memory: p.monit.memory,
              uptime: p.pm2_env.pm_uptime
            }))
          });
        } catch (e) {
          resolve({ error: 'Failed to parse PM2 output' });
        }
      });
    });
  }

  async checkNginx() {
    return new Promise((resolve) => {
      exec('systemctl status nginx', (error, stdout) => {
        resolve({
          status: error ? 'error' : 'active',
          output: stdout
        });
      });
    });
  }

  async runChecks() {
    const timestamp = new Date().toISOString();
    const results = {
      timestamp,
      main: await this.checkEndpoint('/'),
      api: await this.checkEndpoint('/api/health'),
      static: await this.checkEndpoint('/_next/static/css/app.css'),
      system: await this.checkSystem(),
      nginx: await this.checkNginx()
    };

    // Log results
    const logEntry = `${timestamp} - Health Check Results:\n${JSON.stringify(results, null, 2)}\n`;
    fs.appendFileSync(this.logPath, logEntry);

    // Update metrics
    let metrics = {};
    try {
      metrics = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
    } catch (e) {
      metrics = { checks: [] };
    }
    
    metrics.checks.push({
      timestamp,
      mainStatus: results.main.status,
      apiStatus: results.api.status,
      responseTime: results.main.responseTime,
      systemStatus: results.system.error ? 'error' : 'ok'
    });

    // Keep only last 1000 checks
    if (metrics.checks.length > 1000) {
      metrics.checks = metrics.checks.slice(-1000);
    }

    fs.writeFileSync(this.metricsPath, JSON.stringify(metrics, null, 2));

    // Alert on issues
    this.checkAlerts(results);

    return results;
  }

  checkAlerts(results) {
    const alerts = [];
    
    if (results.main.status !== 200) {
      alerts.push(`Main endpoint returned ${results.main.status}`);
    }
    if (results.main.responseTime > 2000) {
      alerts.push(`High response time: ${results.main.responseTime}ms`);
    }
    if (results.system.error) {
      alerts.push(`System check failed: ${results.system.error}`);
    }
    if (results.nginx.status === 'error') {
      alerts.push('Nginx check failed');
    }

    if (alerts.length > 0) {
      this.sendAlerts(alerts);
    }
  }

  sendAlerts(alerts) {
    // Log alerts
    const alertLog = `${new Date().toISOString()} - ALERTS:\n${alerts.join('\n')}\n`;
    fs.appendFileSync(path.join(process.cwd(), 'logs', 'alerts.log'), alertLog);

    // Here you could add more alert methods (email, SMS, etc.)
  }

  start() {
    console.log('Starting health checks...');
    this.runChecks();
    setInterval(() => this.runChecks(), this.checkInterval);
  }
}

// Start health checks if run directly
if (require.main === module) {
  const healthCheck = new HealthCheck();
  healthCheck.start();
}

module.exports = HealthCheck; 