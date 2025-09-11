const fs = require('fs');
const path = require('path');
const os = require('os');

class BotMonitor {
  constructor() {
    this.startTime = Date.now();
    this.messageCount = 0;
    this.errorCount = 0;
    this.commandCounts = new Map();
    this.profileSwitches = 0;
    this.uploadCount = 0;
    this.lastHealthCheck = Date.now();
    
    // Cost tracking
    this.totalTokensUsed = 0;
    this.totalCost = 0;
    this.dailyTokens = new Map(); // date -> tokens
    this.dailyCost = new Map(); // date -> cost
    this.requestCount = 0;
    
    // Anthropic pricing (as of 2024) - ESTIMATES ONLY
    // These are estimates based on public pricing. Actual costs may vary.
    this.pricing = {
      input: 0.015, // $0.015 per 1K tokens for Claude 3.5 Sonnet (ESTIMATE)
      output: 0.075  // $0.075 per 1K tokens for Claude 3.5 Sonnet (ESTIMATE)
    };
    
    // Create logs directory
    this.logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Start monitoring intervals
    this.startMonitoring();
  }

  // Log a message with timestamp and level
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      uptime: this.getUptime()
    };

    // Console output with colors
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      WARN: '\x1b[33m',    // Yellow
      ERROR: '\x1b[31m',   // Red
      DEBUG: '\x1b[90m',   // Gray
      SUCCESS: '\x1b[32m'  // Green
    };
    
    const color = colors[level] || '';
    const reset = '\x1b[0m';
    console.log(`${color}[${timestamp}] ${level}: ${message}${reset}`);
    
    if (data) {
      console.log(`${color}Data: ${JSON.stringify(data, null, 2)}${reset}`);
    }

    // Write to log file
    this.writeToLogFile(level, logEntry);
  }

  // Write to daily log files
  writeToLogFile(level, logEntry) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `${today}.log`);
    const errorLogFile = path.join(this.logsDir, `${today}-errors.log`);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Write to main log
    fs.appendFileSync(logFile, logLine);
    
    // Write errors to separate file
    if (level === 'ERROR') {
      fs.appendFileSync(errorLogFile, logLine);
    }
  }

  // Track message processing
  trackMessage(command = null) {
    this.messageCount++;
    this.lastHealthCheck = Date.now();
    
    if (command) {
      const count = this.commandCounts.get(command) || 0;
      this.commandCounts.set(command, count + 1);
    }
  }

  // Track errors
  trackError(error, context = null) {
    this.errorCount++;
    this.log('ERROR', `Error occurred: ${error.message}`, {
      stack: error.stack,
      context
    });
  }

  // Track profile switches
  trackProfileSwitch(fromProfile, toProfile) {
    this.profileSwitches++;
    this.log('INFO', `Profile switched from ${fromProfile} to ${toProfile}`);
  }

  // Track file uploads
  trackUpload(filename, success, fileId = null) {
    this.uploadCount++;
    this.log(success ? 'SUCCESS' : 'ERROR', `File upload: ${filename}`, {
      success,
      fileId
    });
  }

  // Track API usage and costs
  trackAPIUsage(inputTokens, outputTokens, model = 'claude-3-5-sonnet-20241022') {
    this.requestCount++;
    
    // Calculate costs based on tokens
    const inputCost = (inputTokens / 1000) * this.pricing.input;
    const outputCost = (outputTokens / 1000) * this.pricing.output;
    const totalCost = inputCost + outputCost;
    
    // Update totals
    this.totalTokensUsed += inputTokens + outputTokens;
    this.totalCost += totalCost;
    
    // Update daily tracking
    const today = new Date().toISOString().split('T')[0];
    this.dailyTokens.set(today, (this.dailyTokens.get(today) || 0) + inputTokens + outputTokens);
    this.dailyCost.set(today, (this.dailyCost.get(today) || 0) + totalCost);
    
    this.log('INFO', `API Usage: ${inputTokens} input + ${outputTokens} output tokens = $${totalCost.toFixed(4)} (ESTIMATED)`, {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: totalCost,
      model,
      note: 'Cost is estimated based on public pricing. Check Anthropic dashboard for actual billing.'
    });
  }

  // Get cost metrics
  getCostMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return {
      total: {
        tokens: this.totalTokensUsed,
        cost: this.totalCost,
        requests: this.requestCount
      },
      daily: {
        today: {
          tokens: this.dailyTokens.get(today) || 0,
          cost: this.dailyCost.get(today) || 0
        },
        yesterday: {
          tokens: this.dailyTokens.get(yesterday) || 0,
          cost: this.dailyCost.get(yesterday) || 0
        }
      },
      average: {
        costPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
        tokensPerRequest: this.requestCount > 0 ? this.totalTokensUsed / this.requestCount : 0
      },
      estimated: {
        monthlyCost: this.dailyCost.get(today) * 30, // Rough estimate
        tokensPerDay: Object.values(Object.fromEntries(this.dailyTokens)).reduce((a, b) => a + b, 0) / Math.max(1, this.dailyTokens.size)
      }
    };
  }

  // Get system metrics
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    return {
      uptime: this.getUptime(),
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        systemUsed: Math.round(usedMem / 1024 / 1024),
        systemTotal: Math.round(totalMem / 1024 / 1024),
        systemFree: Math.round(freeMem / 1024 / 1024)
      },
      cpu: {
        loadAverage: os.loadavg(),
        cpus: os.cpus().length
      },
      stats: {
        messagesProcessed: this.messageCount,
        errors: this.errorCount,
        profileSwitches: this.profileSwitches,
        uploads: this.uploadCount,
        lastHealthCheck: this.lastHealthCheck
      },
      commands: Object.fromEntries(this.commandCounts),
      costs: this.getCostMetrics()
    };
  }

  // Get uptime in human readable format
  getUptime() {
    const uptime = Date.now() - this.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Health check
  isHealthy() {
    const metrics = this.getSystemMetrics();
    const now = Date.now();
    
    // Check if we've processed a message recently (within 5 minutes)
    const recentActivity = (now - this.lastHealthCheck) < 300000;
    
    // Check memory usage (restart if over 80% of system memory)
    const memoryUsagePercent = (metrics.memory.systemUsed / metrics.memory.systemTotal) * 100;
    const memoryHealthy = memoryUsagePercent < 80;
    
    // Check error rate (restart if more than 10% error rate)
    const errorRate = this.messageCount > 0 ? (this.errorCount / this.messageCount) * 100 : 0;
    const errorRateHealthy = errorRate < 10;
    
    return {
      healthy: recentActivity && memoryHealthy && errorRateHealthy,
      checks: {
        recentActivity,
        memoryHealthy,
        errorRateHealthy
      },
      metrics
    };
  }

  // Start monitoring intervals (reduced frequency for cost savings)
  startMonitoring() {
    // Log system metrics every 15 minutes (was 5 minutes)
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.log('DEBUG', 'System metrics', metrics);
      
      // Check if we need to restart due to memory usage
      if (metrics.memory.heapUsed > 400) { // 400MB threshold
        this.log('WARN', 'High memory usage detected, consider restarting', {
          heapUsed: metrics.memory.heapUsed
        });
      }
    }, 900000); // 15 minutes (was 5 minutes)

    // Health check every 5 minutes (was 1 minute)
    setInterval(() => {
      const health = this.isHealthy();
      if (!health.healthy) {
        this.log('WARN', 'Health check failed', health);
      }
    }, 300000); // 5 minutes (was 1 minute)

    // Daily stats summary
    setInterval(() => {
      this.logDailyStats();
    }, 86400000); // 24 hours
  }

  // Log daily statistics
  logDailyStats() {
    const metrics = this.getSystemMetrics();
    this.log('INFO', 'Daily statistics', {
      uptime: metrics.uptime,
      messagesProcessed: metrics.stats.messagesProcessed,
      errors: metrics.stats.errors,
      profileSwitches: metrics.stats.profileSwitches,
      uploads: metrics.stats.uploads,
      topCommands: this.getTopCommands(5),
      memoryPeak: metrics.memory.heapUsed
    });
  }

  // Get top commands by usage
  getTopCommands(limit = 10) {
    return Array.from(this.commandCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([command, count]) => ({ command, count }));
  }

  // Clean old log files (keep last 30 days)
  cleanOldLogs() {
    const files = fs.readdirSync(this.logsDir);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      if (file.endsWith('.log')) {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          this.log('INFO', `Cleaned old log file: ${file}`);
        }
      }
    });
  }

  // Get status for admin commands
  getStatus() {
    const health = this.isHealthy();
    const metrics = this.getSystemMetrics();
    
    return {
      status: health.healthy ? 'healthy' : 'unhealthy',
      uptime: metrics.uptime,
      memory: `${metrics.memory.heapUsed}MB / ${metrics.memory.systemTotal}MB`,
      messages: metrics.stats.messagesProcessed,
      errors: metrics.stats.errors,
      profileSwitches: metrics.stats.profileSwitches,
      uploads: metrics.stats.uploads,
      topCommands: this.getTopCommands(3),
      lastActivity: new Date(this.lastHealthCheck).toLocaleString()
    };
  }
}

module.exports = new BotMonitor();

