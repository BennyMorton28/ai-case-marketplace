const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DeploymentVerifier {
  constructor() {
    this.domain = 'kellogg.noyesai.com';
    this.criticalPaths = [
      '/',
      '/api/health',
      '/_next/static/css/app.css',
      '/static/images/logo.png'
    ];
    this.expectedServices = ['nginx', 'pm2'];
  }

  async verifyEndpoint(path) {
    return new Promise((resolve) => {
      const options = {
        hostname: this.domain,
        port: 443,
        path: path,
        method: 'GET',
        timeout: 10000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data.length > 100 ? `${data.slice(0, 100)}...` : data
          });
        });
      });

      req.on('error', (error) => {
        resolve({ error: error.message });
      });

      req.end();
    });
  }

  checkSystemServices() {
    const results = {};
    
    for (const service of this.expectedServices) {
      try {
        execSync(`systemctl is-active ${service}`);
        results[service] = 'active';
      } catch (error) {
        results[service] = 'inactive';
      }
    }

    return results;
  }

  checkProcessManager() {
    try {
      const pm2List = execSync('pm2 jlist').toString();
      const processes = JSON.parse(pm2List);
      return processes.map(p => ({
        name: p.name,
        status: p.pm2_env.status,
        uptime: p.pm2_env.pm_uptime,
        restarts: p.pm2_env.restart_time
      }));
    } catch (error) {
      return { error: error.message };
    }
  }

  checkStaticFiles() {
    const staticDir = path.join(process.cwd(), '.next/static');
    const results = {
      exists: fs.existsSync(staticDir),
      files: [],
      totalSize: 0
    };

    if (results.exists) {
      const files = execSync(`find ${staticDir} -type f`).toString().split('\n');
      results.files = files.filter(f => f).map(file => {
        const stats = fs.statSync(file);
        results.totalSize += stats.size;
        return {
          path: file.replace(process.cwd(), ''),
          size: stats.size
        };
      });
    }

    return results;
  }

  checkEnvironmentVariables() {
    const required = [
      'OPENAI_API_KEY',
      'AWS_S3_BUCKET_NAME',
      'AWS_S3_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY'
    ];

    return required.reduce((acc, key) => {
      acc[key] = process.env[key] ? 'set' : 'missing';
      return acc;
    }, {});
  }

  async runAllChecks() {
    console.log('Starting deployment verification...');

    const results = {
      timestamp: new Date().toISOString(),
      endpoints: {},
      system: this.checkSystemServices(),
      processes: this.checkProcessManager(),
      static: this.checkStaticFiles(),
      env: this.checkEnvironmentVariables()
    };

    // Check all critical paths
    for (const path of this.criticalPaths) {
      console.log(`Checking endpoint: ${path}`);
      results.endpoints[path] = await this.verifyEndpoint(path);
    }

    // Analyze results
    const issues = this.analyzeResults(results);

    // Save results
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const logPath = path.join(logDir, 'deployment-verification.log');
    fs.appendFileSync(logPath, 
      `\n${'-'.repeat(80)}\n${new Date().toISOString()}\n${JSON.stringify(results, null, 2)}\n`
    );

    if (issues.length > 0) {
      console.error('\nIssues found:');
      issues.forEach(issue => console.error(`- ${issue}`));
      process.exit(1);
    } else {
      console.log('\nAll checks passed successfully!');
      process.exit(0);
    }
  }

  analyzeResults(results) {
    const issues = [];

    // Check endpoints
    Object.entries(results.endpoints).forEach(([path, result]) => {
      if (result.error) {
        issues.push(`Endpoint ${path} error: ${result.error}`);
      } else if (result.status !== 200) {
        issues.push(`Endpoint ${path} returned status ${result.status}`);
      }
    });

    // Check system services
    Object.entries(results.system).forEach(([service, status]) => {
      if (status !== 'active') {
        issues.push(`Service ${service} is ${status}`);
      }
    });

    // Check PM2 processes
    if (results.processes.error) {
      issues.push(`PM2 error: ${results.processes.error}`);
    } else {
      results.processes.forEach(proc => {
        if (proc.status !== 'online') {
          issues.push(`Process ${proc.name} is ${proc.status}`);
        }
        if (proc.restarts > 5) {
          issues.push(`Process ${proc.name} has restarted ${proc.restarts} times`);
        }
      });
    }

    // Check static files
    if (!results.static.exists) {
      issues.push('Static directory is missing');
    } else if (results.static.files.length === 0) {
      issues.push('No static files found');
    }

    // Check environment variables
    Object.entries(results.env).forEach(([key, status]) => {
      if (status === 'missing') {
        issues.push(`Environment variable ${key} is missing`);
      }
    });

    return issues;
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new DeploymentVerifier();
  verifier.runAllChecks();
}

module.exports = DeploymentVerifier; 