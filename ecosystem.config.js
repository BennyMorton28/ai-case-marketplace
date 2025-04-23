module.exports = {
  apps: [{
    name: "kellogg-cases",
    cwd: "/home/ec2-user/app",
    script: "./.next/standalone/server.js",
    instances: 1,
    exec_mode: "cluster",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
}
