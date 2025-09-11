const express = require('express');
const path = require('path');
const monitor = require('./monitor');
const profileManager = require('./profileManager');
const anthropicClient = require('./anthropicClient');

class HealthCheckServer {
  constructor() {
    this.app = express();
    this.port = process.env.HEALTH_CHECK_PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Basic authentication middleware for dashboard
    this.app.use((req, res, next) => {
      // Skip auth for health checks (needed for monitoring)
      if (req.path === '/health' || req.path === '/api') {
        return next();
      }
      
      // Check for basic auth
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Adrullan Bot Dashboard"');
        return res.status(401).send('Authentication required');
      }
      
      // Decode credentials
      const credentials = Buffer.from(auth.slice(6), 'base64').toString();
      const [username, password] = credentials.split(':');
      
      // Check against environment variables
      const validUsername = process.env.DASHBOARD_USERNAME || 'admin';
      const validPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
      
      if (username === validUsername && password === validPassword) {
        return next();
      }
      
      res.setHeader('WWW-Authenticate', 'Basic realm="Adrullan Bot Dashboard"');
      return res.status(401).send('Invalid credentials');
    });
    
    // Serve static files from public directory (after auth)
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // CORS headers for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    // Dashboard route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
    });

    // Dashboard API endpoint
    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    // Basic health check
    this.app.get('/health', (req, res) => {
      const health = monitor.isHealthy();
      const status = health.healthy ? 200 : 503;
      
      res.status(status).json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: monitor.getUptime(),
        checks: health.checks,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Detailed status
    this.app.get('/status', (req, res) => {
      const status = monitor.getStatus();
      res.json(status);
    });

    // System metrics
    this.app.get('/metrics', (req, res) => {
      const metrics = monitor.getSystemMetrics();
      res.json(metrics);
    });

    // Bot-specific status
    this.app.get('/bot/status', (req, res) => {
      const status = {
        ...monitor.getStatus(),
        activeProfile: profileManager.activeProfile,
        contextMode: anthropicClient.isContextPassing() ? 'Context Passing' : 'File Usage',
        availableProfiles: profileManager.getAllProfiles(),
        environment: process.env.NODE_ENV || 'development'
      };
      res.json(status);
    });

    // Profile management endpoints
    this.app.get('/bot/profiles', (req, res) => {
      const profiles = profileManager.getAllProfiles().map(name => {
        const profile = profileManager.getProfile(name);
        return {
          name,
          displayName: profile.name,
          description: profile.description,
          active: name === profileManager.activeProfile
        };
      });
      res.json(profiles);
    });

    this.app.post('/bot/profiles/:name/switch', (req, res) => {
      const { name } = req.params;
      const success = profileManager.setActiveProfile(name);
      
      if (success) {
        monitor.trackProfileSwitch(profileManager.activeProfile, name);
        res.json({ success: true, message: `Switched to profile: ${name}` });
      } else {
        res.status(404).json({ success: false, message: `Profile not found: ${name}` });
      }
    });

    // File upload status
    this.app.get('/bot/files', async (req, res) => {
      try {
        const files = await anthropicClient.listWorkspaceFiles();
        res.json({
          count: files.length,
          files: files.map(file => ({
            id: file.id,
            filename: file.filename,
            size: file.size_bytes,
            created: file.created_at
          }))
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Logs endpoint (last 100 lines)
    this.app.get('/bot/logs', (req, res) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const logFile = require('path').join(__dirname, '..', 'logs', `${today}.log`);
        
        if (require('fs').existsSync(logFile)) {
          const logs = require('fs').readFileSync(logFile, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .slice(-100)
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return { message: line, timestamp: new Date().toISOString() };
              }
            });
          
          res.json({ logs });
        } else {
          res.json({ logs: [] });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Error logs
    this.app.get('/bot/logs/errors', (req, res) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const errorLogFile = require('path').join(__dirname, '..', 'logs', `${today}-errors.log`);
        
        if (require('fs').existsSync(errorLogFile)) {
          const errors = require('fs').readFileSync(errorLogFile, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .slice(-50)
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return { message: line, timestamp: new Date().toISOString() };
              }
            });
          
          res.json({ errors });
        } else {
          res.json({ errors: [] });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Restart endpoint (for PM2)
    this.app.post('/bot/restart', (req, res) => {
      monitor.log('INFO', 'Restart requested via health check endpoint');
      res.json({ message: 'Restart initiated' });
      
      // Graceful shutdown
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Adrullan FAQ Bot',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        dashboard: '/dashboard',
        endpoints: [
          'GET /health - Basic health check',
          'GET /status - Detailed status',
          'GET /metrics - System metrics',
          'GET /bot/status - Bot-specific status',
          'GET /bot/profiles - List profiles',
          'POST /bot/profiles/:name/switch - Switch profile',
          'GET /bot/files - List uploaded files',
          'GET /bot/logs - Recent logs',
          'GET /bot/logs/errors - Error logs',
          'POST /bot/restart - Restart bot'
        ]
      });
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      monitor.log('SUCCESS', `Health check server started on port ${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      monitor.log('INFO', 'Health check server stopped');
    }
  }
}

module.exports = HealthCheckServer;

