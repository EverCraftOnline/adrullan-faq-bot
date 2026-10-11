# 🚀 Production Deployment Guide

This guide covers deploying the Adrullan FAQ Bot to AWS Lightsail with full monitoring, logging, and production features.

## 📋 Prerequisites

- AWS Account
- Discord Bot Token
- Anthropic API Key
- Git repository with your bot code

## 🏗️ New Production Features

### 🔍 **Comprehensive Monitoring System**
- **Real-time metrics tracking** (memory, CPU, message counts, errors)
- **Health checks** with automatic alerts
- **Performance monitoring** with restart thresholds
- **Command usage statistics** and top commands tracking

### 📊 **Advanced Logging**
- **Structured JSON logging** with timestamps and levels
- **Daily log rotation** with automatic cleanup (30 days)
- **Separate error logs** for easier debugging
- **Color-coded console output** for development

### 🏥 **Health Check Endpoints**
- **REST API** for monitoring and management
- **Profile switching** via HTTP endpoints
- **File management** and upload status
- **Log viewing** and error tracking
- **Graceful restart** capabilities

### 🛡️ **Production Safety**
- **Graceful shutdown** handling (SIGINT/SIGTERM)
- **Memory leak protection** with automatic restarts
- **Error recovery** and unhandled rejection handling
- **PM2 process management** with auto-restart

## 🚀 AWS Lightsail Deployment

### **Step 1: Create Lightsail Instance**

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click **"Create instance"**
3. Choose **"Linux/Unix"** platform
4. Select **"Node.js"** blueprint (or Ubuntu)
5. Choose **"Micro"** plan ($5/month)
6. Name it **"adrullan-faq-bot"**
7. Click **"Create instance"**

### **Step 2: Connect and Setup**

```bash
# Download SSH key from Lightsail console
# Connect via SSH
ssh -i LightsailDefaultKey-us-east-1.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not pre-installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

### **Step 3: Deploy Your Bot**

```bash
# Clone your repository
git clone <your-repo-url>
cd adrullan-faq-bot

# Install dependencies
npm install

# Create environment file
nano .env
```

**Add to .env:**
```bash
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
NODE_ENV=production
HEALTH_CHECK_PORT=3000
ADMIN_USER_ID=your_discord_user_id
DASHBOARD_USERNAME=your_username
DASHBOARD_PASSWORD=your_secure_password
```

### **Step 4: Configure PM2**

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy the bot
./deploy.sh production
```

### **Step 5: Setup Static IP (Optional)**

1. Go to Lightsail Console → Your Instance → **"Networking"**
2. Click **"Create static IP"**
3. Attach to your instance
4. This prevents IP changes on restart

## 🔧 Configuration Files

### **PM2 Ecosystem (`ecosystem.config.js`)**
```javascript
module.exports = {
  apps: [{
    name: 'adrullan-faq-bot',
    script: 'bot.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '400M',
    env: {
      NODE_ENV: 'production',
      HEALTH_CHECK_PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### **Deployment Script (`deploy.sh`)**
- **Automatic updates** from Git
- **Dependency management**
- **PM2 process management**
- **Status monitoring**

## 📊 Monitoring & Management

### **Discord Commands (Admin Only)**
- `!monitor status` - Bot status and statistics
- `!monitor metrics` - Detailed system metrics
- `!monitor logs [error]` - View recent logs
- `!monitor health` - Run health check
- `!monitor restart` - Restart the bot
- `!monitor profiles` - Show available profiles
- `!monitor files` - Show uploaded files

### **HTTP Endpoints**
- `GET /health` - Basic health check
- `GET /status` - Detailed status
- `GET /metrics` - System metrics
- `GET /bot/status` - Bot-specific status
- `GET /bot/profiles` - List profiles
- `POST /bot/profiles/:name/switch` - Switch profile
- `GET /bot/files` - List uploaded files
- `GET /bot/logs` - Recent logs
- `GET /bot/logs/errors` - Error logs
- `POST /bot/restart` - Restart bot

### **PM2 Commands**
```bash
pm2 status                    # Check bot status
pm2 logs adrullan-faq-bot     # View logs
pm2 restart adrullan-faq-bot  # Restart bot
pm2 stop adrullan-faq-bot     # Stop bot
pm2 monit                     # Monitor resources
pm2 save                      # Save configuration
pm2 startup                   # Setup auto-start
```

## 🔍 Log Files

### **Log Structure**
```
logs/
├── 2024-01-15.log          # Daily logs
├── 2024-01-15-errors.log   # Error logs
├── err.log                 # PM2 error log
├── out.log                 # PM2 output log
└── combined.log            # PM2 combined log
```

### **Log Levels**
- **INFO** - General information
- **SUCCESS** - Successful operations
- **WARN** - Warnings
- **ERROR** - Errors
- **DEBUG** - Debug information

## 🛠️ Maintenance

### **Daily Tasks**
- Check bot status: `pm2 status`
- Review logs: `pm2 logs adrullan-faq-bot --lines 50`
- Monitor memory: `pm2 monit`

### **Weekly Tasks**
- Update dependencies: `npm update`
- Clean old logs: Automatic (30 days)
- Check disk space: `df -h`

### **Monthly Tasks**
- Review error logs
- Update system packages: `sudo apt update && sudo apt upgrade`
- Check PM2 configuration: `pm2 show adrullan-faq-bot`

## 🚨 Troubleshooting

### **Common Issues**

**Bot not responding:**
```bash
pm2 restart adrullan-faq-bot
pm2 logs adrullan-faq-bot --lines 20
```

**High memory usage:**
```bash
pm2 monit
# If over 400MB, PM2 will auto-restart
```

**Connection errors:**
```bash
# Check environment variables
cat .env

# Check Discord token
curl -H "Authorization: Bot YOUR_TOKEN" https://discord.com/api/v10/users/@me
```

**Health check failing:**
```bash
curl http://localhost:3000/health
pm2 logs adrullan-faq-bot | grep ERROR
```

### **Emergency Procedures**

**Complete restart:**
```bash
pm2 stop adrullan-faq-bot
pm2 delete adrullan-faq-bot
./deploy.sh production
```

**Rollback to previous version:**
```bash
git log --oneline
git checkout <previous-commit>
./deploy.sh production
```

## 📈 Performance Optimization

### **Memory Management**
- **Auto-restart** at 400MB memory usage
- **Garbage collection** optimization
- **Log rotation** to prevent disk bloat

### **Error Handling**
- **Graceful degradation** on API failures
- **Retry mechanisms** for transient errors
- **Circuit breaker** pattern for external services

### **Monitoring Alerts**
- **Memory usage** > 80% system memory
- **Error rate** > 10% of messages
- **No activity** for > 5 minutes

## 🔒 Security Best Practices

### **Environment Variables**
- Never commit `.env` to Git
- Use strong, unique tokens
- Rotate keys regularly

### **Access Control**
- Admin-only commands
- Role-based permissions
- Audit logging

### **Network Security**
- Firewall configuration
- SSH key management
- Regular security updates

## 💰 Cost Optimization

### **Lightsail Pricing**
- **Micro Plan**: $5/month
- **1GB RAM, 1 vCPU, 40GB SSD**
- **2TB data transfer included**

### **Cost Monitoring**
- Track data usage in Lightsail console
- Monitor API usage with Anthropic
- Optimize log retention periods

## 🎯 Success Metrics

### **Uptime Targets**
- **99.9% uptime** (8.76 hours downtime/year)
- **< 1 minute** response time
- **< 5% error rate**

### **Performance Targets**
- **< 400MB** memory usage
- **< 1 second** command response
- **< 5 minutes** recovery time

## 📞 Support

### **Monitoring Dashboard**
Access your bot's dashboard at: `http://your-lightsail-ip:3000`

**Security Features:**
- **Basic Authentication** required for dashboard access
- **Default credentials**: admin / admin123 (change in .env!)
- **Health checks** remain public for monitoring
- **Profile switching** and bot control require authentication

### **Log Analysis**
```bash
# Search for specific errors
grep "ERROR" logs/2024-01-15.log

# Monitor real-time logs
pm2 logs adrullan-faq-bot --follow

# Check system resources
pm2 monit
```

### **Emergency Contacts**
- **Discord**: Your server admin
- **AWS Support**: Lightsail console
- **Anthropic Support**: API documentation

---

## 🎉 You're All Set!

Your Adrullan FAQ Bot is now running in production with:
- ✅ **Comprehensive monitoring**
- ✅ **Automatic restarts**
- ✅ **Health checks**
- ✅ **Structured logging**
- ✅ **Admin dashboard**
- ✅ **Graceful shutdown**
- ✅ **Performance optimization**

**Next Steps:**
1. Test all commands in Discord
2. Check health endpoints
3. Monitor logs for any issues
4. Set up monitoring alerts
5. Enjoy your production-ready bot! 🚀

