# 🤖 Generic Discord FAQ Bot Framework

A powerful, configurable Discord bot framework for creating AI-powered FAQ and community support bots. Built with Node.js, Discord.js, and Anthropic's Claude AI.

## ✨ Features

- **🎯 AI-Powered Responses**: Uses Anthropic's Claude AI for intelligent, context-aware answers
- **📚 Knowledge Base Management**: Load and manage FAQ data from JSON files
- **🎭 Multiple AI Personalities**: Switchable profiles for different response styles
- **📊 Advanced Monitoring**: Health checks, metrics, and logging
- **🔒 Rate Limiting**: Built-in protection against API overuse
- **⚙️ Highly Configurable**: Template-based configuration system
- **🚀 Easy Deployment**: PM2 configuration and deployment scripts

## 🏗️ Architecture

```
discord-faq-bot-framework/
├── config/
│   ├── project.json              # Main configuration
│   └── project.template.json     # Configuration template
├── data/                         # Knowledge base files
├── profiles/                     # AI personality profiles
├── commands/                     # Discord bot commands
├── lib/                          # Core utilities
├── scripts/                      # Setup and utility scripts
├── templates/                    # Code templates
├── public/                       # Web dashboard
└── bot.js                        # Main bot entry point
```

## 🚀 Quick Start

### 1. Create New Project

```bash
# Run the project creator
node scripts/create-new-project.js

# Follow the prompts to configure your project
```

### 2. Setup Environment

Create a `.env` file:

```env
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
NODE_ENV=production
HEALTH_CHECK_PORT=3000
ADMIN_USER_ID=your_discord_user_id
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=your_secure_password
```

### 3. Add Your Data

Create knowledge base files in the `data/` directory:

```json
[
  {
    "id": "sample_faq",
    "title": "Sample FAQ Entry",
    "content": "Your FAQ content here...",
    "category": "faq",
    "tags": ["sample", "getting-started"],
    "source_url": "https://example.com",
    "last_updated": "2025-01-15",
    "priority": "high"
  }
]
```

### 4. Run the Bot

```bash
npm install
npm start
```

## 📋 Available Commands

- `!ask <question>` - Ask a question with smart context selection
- `!askall <question>` - Ask using all available context (admin only)
- `!quiz` - Start an interactive quiz
- `!help` - Show command help
- `!profile list` - List available AI personalities
- `!profile switch <name>` - Switch AI personality
- `!stats` - View usage statistics (admin only)
- `!monitor status` - Show bot status (admin only)

## ⚙️ Configuration

The framework uses a powerful configuration system in `config/project.json`:

```json
{
  "project": {
    "name": "Your Bot Name",
    "description": "Bot description",
    "website": "https://example.com"
  },
  "branding": {
    "botName": "your-bot-name",
    "displayName": "Your Bot Display Name",
    "emoji": "🤖",
    "color": "#0099ff"
  },
  "discord": {
    "adminUserIds": ["123456789"],
    "adminRoles": ["Admin"],
    "supportChannels": ["#general", "#help"]
  }
}
```

## 🎭 AI Profiles

The framework includes four predefined AI personalities:

- **casual** - Friendly, approachable responses
- **technical** - Detailed technical explanations
- **creative** - Imaginative, story-focused responses
- **locked-down** - Conservative, fact-only responses

Create custom profiles or modify existing ones in the `profiles/` directory.

## 📊 Monitoring & Health Checks

The bot includes comprehensive monitoring:

- **Health Check Endpoint**: `http://localhost:3000/health`
- **Metrics Dashboard**: `http://localhost:3000/metrics`
- **Log Management**: Automatic log rotation and cleanup
- **Performance Tracking**: Memory usage, response times, error rates

## 🚀 Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs your-bot-name
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["npm", "start"]
```

## 🔧 Customization

### Adding New Commands

1. Create a new file in `commands/`
2. Export an `execute` function
3. Add the command handler in `bot.js`

```javascript
module.exports = {
  async execute(message) {
    // Your command logic here
  }
};
```

### Creating Custom Profiles

Use the profile generator:

```bash
node scripts/generate-profile.js casual
```

Or create manually in `profiles/` directory.

### Adding Data Categories

Update the configuration in `config/project.json`:

```json
{
  "data": {
    "categories": {
      "faq": "Frequently Asked Questions",
      "guides": "How-to guides",
      "lore": "Story and world building",
      "technical": "Technical documentation"
    }
  }
}
```

## 📚 Examples

### Nexus Bot Setup

```bash
# Create Nexus bot
node scripts/create-new-project.js
# Follow prompts with Nexus-specific information

# Or use the quick setup
./scripts/setup-nexus.sh
```

### Gaming Community Bot

```bash
# Create gaming bot
node scripts/create-new-project.js
# Configure for gaming community
# Add game-specific data files
# Customize profiles for gaming context
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the docs/ directory
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions

## 🎯 Use Cases

This framework is perfect for:

- **Gaming Communities**: FAQ bots for games, lore questions, guides
- **Blockchain Projects**: Technical support, API documentation, community help
- **Software Projects**: Documentation, troubleshooting, community support
- **Educational Platforms**: Student support, course materials, Q&A
- **Business Support**: Customer service, product information, help desk

## 🔮 Future Features

- [ ] Multi-language support
- [ ] Voice command integration
- [ ] Advanced analytics dashboard
- [ ] Plugin system
- [ ] Multi-server support
- [ ] Integration with external APIs



