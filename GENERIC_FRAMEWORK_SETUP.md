# 🚀 Generic Discord FAQ Bot Framework Setup

This document explains how to set up the generic Discord FAQ Bot framework and create new project instances.

## 📁 **Generic Framework Structure**

The generic framework should contain:

```
discord-faq-bot-framework/
├── config/
│   ├── project.template.json     # Template configuration
│   └── nexus-example.json        # Example Nexus config
├── templates/
│   ├── profile.template.json     # Profile template
│   └── systemPrompt.template.txt # System prompt template
├── scripts/
│   ├── init-project.js          # Interactive project setup
│   ├── generate-package.js      # Package.json generator
│   ├── generate-profile.js      # Profile generator
│   ├── setup-nexus.sh          # Nexus setup script
│   └── setup-nexus.bat         # Windows Nexus setup
├── lib/
│   ├── configLoader.js          # Configuration system
│   ├── anthropicClient.js       # AI client (generic)
│   ├── knowledgeLoader.js       # Data loader (generic)
│   ├── rateLimiter.js          # Rate limiting (generic)
│   ├── monitor.js              # Monitoring (generic)
│   └── healthCheck.js          # Health checks (generic)
├── commands/                    # All command files (generic)
├── data/                       # Empty - for project data
├── profiles/                   # Empty - for generated profiles
├── public/                     # Dashboard templates
├── bot.js                      # Main bot file (generic)
├── ecosystem.config.js         # PM2 config (generic)
└── README.md                   # Framework documentation
```

## 🎮 **Project-Specific Setup**

### **For Nexus Bot:**

1. **Create New Repository**: `nexus-faq-bot` in EnigmaFactory account
2. **Clone Generic Framework**: Copy the framework files
3. **Run Setup Script**: `scripts/setup-nexus.sh` or `scripts/setup-nexus.bat`
4. **Configure Environment**: Add Discord token and Anthropic API key
5. **Add Nexus Data**: Create data files for Nexus content
6. **Deploy**: Set up hosting and deploy

### **For Future Projects:**

1. **Copy Framework**: Clone or copy the generic framework
2. **Run Init Script**: `node scripts/init-project.js`
3. **Configure**: Answer prompts for project-specific settings
4. **Customize**: Add project-specific data and content
5. **Deploy**: Set up hosting and deploy

## 🔧 **Environment Setup**

Each project needs:

```env
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
NODE_ENV=production
HEALTH_CHECK_PORT=3000
ADMIN_USER_ID=your_discord_user_id
DASHBOARD_USERNAME=your_username
DASHBOARD_PASSWORD=your_secure_password
```

## 📊 **Data Structure**

Each project should have data files in `data/` directory:

- `project_faq.json` - Main FAQ content
- `guides.json` - How-to guides and tutorials
- `lore.json` - Story, characters, world building
- `technical.json` - Technical documentation

## 🎭 **Profile System**

The framework includes predefined profiles:

- **casual** - Friendly, approachable responses
- **technical** - Detailed technical explanations
- **creative** - Imaginative, story-focused responses
- **locked-down** - Conservative, fact-only responses

## 🚀 **Quick Start Commands**

```bash
# Initialize new project
node scripts/init-project.js

# Generate package.json
node scripts/generate-package.js

# Generate profiles
node scripts/generate-profile.js

# Setup Nexus specifically
./scripts/setup-nexus.sh
# or on Windows:
scripts/setup-nexus.bat
```

## 🔄 **Migration from Existing Projects**

To migrate from an existing bot (like Adrullan):

1. **Extract Data**: Copy data files to new project
2. **Update Config**: Modify project.json with new settings
3. **Regenerate**: Run setup scripts to update all files
4. **Test**: Verify all functionality works
5. **Deploy**: Set up new hosting environment

## 📝 **Next Steps**

1. Create generic framework repository
2. Set up Nexus bot with new credentials
3. Create project-specific data
4. Deploy and test
5. Document any customizations needed



