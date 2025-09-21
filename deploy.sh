#!/bin/bash

# Adrullan FAQ Bot Deployment Script
# Usage: ./deploy.sh [environment]

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
BOT_NAME="adrullan-faq-bot"
LOG_DIR="./logs"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Create logs directory if it doesn't exist
mkdir -p $LOG_DIR

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Check if bot is already running
if pm2 list | grep -q $BOT_NAME; then
    echo "📦 Bot is already running. Updating..."
    
    # Pull latest changes
    echo "📥 Pulling latest changes..."
    git pull origin main
    
    # Install/update dependencies
    echo "📦 Installing dependencies..."
    npm install --production
    
    # Restart the bot
    echo "🔄 Restarting bot..."
    pm2 restart $BOT_NAME --env $ENVIRONMENT
    
    # Save PM2 configuration
    pm2 save
    
    echo "✅ Bot updated and restarted successfully!"
else
    echo "🆕 Bot not running. Starting fresh..."
    
    # Pull latest changes
    echo "📥 Pulling latest changes..."
    git pull origin main
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install --production
    
    # Start the bot
    echo "🚀 Starting bot..."
    pm2 start ecosystem.config.js --env $ENVIRONMENT
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on boot
    echo "⚙️ Setting up PM2 startup..."
    pm2 startup
    echo "⚠️  Please run the command shown above as root to enable auto-startup"
    
    echo "✅ Bot started successfully!"
fi

# Show status
echo "📊 Bot Status:"
pm2 status $BOT_NAME

# Show logs
echo "📋 Recent logs:"
pm2 logs $BOT_NAME --lines 10

echo "🎉 Deployment complete!"
echo ""
echo "Useful commands:"
echo "  pm2 status                    - Check bot status"
echo "  pm2 logs $BOT_NAME           - View logs"
echo "  pm2 restart $BOT_NAME        - Restart bot"
echo "  pm2 stop $BOT_NAME           - Stop bot"
echo "  pm2 monit                     - Monitor resources"
echo ""
echo "Health check endpoints:"
echo "  http://localhost:3000/health  - Basic health check"
echo "  http://localhost:3000/status  - Detailed status"
echo "  http://localhost:3000/metrics - System metrics"

