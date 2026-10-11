#!/bin/bash

# Super Convenient Bot Update Script
# Usage: ./update-bot.sh

set -e

echo "🚀 Starting bot update process..."

# Navigate to bot directory
cd /home/bitnami/adrullan-faq-bot

# Stop the bot if running
echo "⏹️  Stopping bot..."
pm2 stop adrullan-faq-bot 2>/dev/null || echo "Bot wasn't running"

# Clear any staged files and reset to clean state
echo "🧹 Cleaning git state..."
git reset --hard HEAD
git clean -fd
git stash clear 2>/dev/null || true

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin master

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Make deploy script executable (just in case)
chmod +x deploy.sh

# Start the bot
echo "🚀 Starting bot..."
pm2 start adrullan-faq-bot 2>/dev/null || pm2 restart adrullan-faq-bot

# Show status
echo "📊 Bot Status:"
pm2 status adrullan-faq-bot

echo ""
echo "✅ Bot update complete!"
echo "🌐 Dashboard: http://18.190.207.216:3000"
echo "🔍 Health: http://18.190.207.216:3000/health"
