module.exports = {
  apps: [{
    name: 'adrullan-faq-bot',
    script: 'bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '400M', // Restart if memory exceeds 400MB
    env: {
      NODE_ENV: 'production',
      HEALTH_CHECK_PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Graceful shutdown settings
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    // Restart settings
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // Advanced settings
    node_args: '--max-old-space-size=512',
    // Environment-specific settings
    env_production: {
      NODE_ENV: 'production',
      HEALTH_CHECK_PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      HEALTH_CHECK_PORT: 3001
    }
  }],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'bitnami',
      host: '18.190.207.216',
      ref: 'origin/main',
      repo: 'https://github.com/EverCraftOnline/adrullan-faq-bot.git',
      path: '/home/bitnami/adrullan-faq-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

