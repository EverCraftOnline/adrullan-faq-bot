#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function initProject() {
  console.log('🚀 Welcome to the Discord FAQ Bot Project Initializer!');
  console.log('This will help you set up a new project configuration.\n');

  try {
    // Collect project information
    const projectName = await question('📝 Project name (e.g., "Nexus FAQ Bot"): ');
    const projectDescription = await question('📝 Project description: ');
    const projectWebsite = await question('🌐 Project website URL: ');
    const projectAuthor = await question('👤 Author/Team name: ');
    const projectRepository = await question('📦 Repository URL (optional): ');
    
    // Bot configuration
    const botName = await question('🤖 Bot name (e.g., "nexus-faq-bot"): ');
    const displayName = await question('🏷️  Display name (e.g., "Nexus FAQ Bot"): ');
    const emoji = await question('😊 Bot emoji (e.g., "🔗"): ');
    const primaryColor = await question('🎨 Primary color (hex, e.g., "#00D4FF"): ');
    
    // Discord configuration
    const adminUserIds = await question('👑 Admin user IDs (comma-separated, optional): ');
    const adminRoles = await question('👑 Admin roles (comma-separated, e.g., "Admin,Developer"): ');
    const supportChannels = await question('💬 Support channels (comma-separated, e.g., "#general,#help"): ');
    
    // Features
    const enableProfiles = await question('⚙️  Enable AI profiles? (y/n, default: y): ');
    const enableMonitoring = await question('📊 Enable monitoring? (y/n, default: y): ');
    const enableFileUpload = await question('📤 Enable file upload? (y/n, default: y): ');
    
    // Create configuration object
    const config = {
      project: {
        name: projectName,
        description: projectDescription,
        version: "1.0.0",
        author: projectAuthor,
        repository: projectRepository || "",
        website: projectWebsite
      },
      branding: {
        botName: botName,
        displayName: displayName,
        emoji: emoji,
        color: primaryColor,
        primaryColor: primaryColor,
        secondaryColor: "#ffffff"
      },
      discord: {
        adminUserIds: adminUserIds ? adminUserIds.split(',').map(id => id.trim()) : [],
        adminRoles: adminRoles ? adminRoles.split(',').map(role => role.trim()) : ["Admin"],
        supportChannels: supportChannels ? supportChannels.split(',').map(channel => channel.trim()) : ["#general"],
        defaultPrefix: "!"
      },
      ai: {
        model: "claude-3-5-sonnet-20241022",
        maxTokens: 2000,
        contextLimits: {
          ask: 20000,
          askall: 50000
        },
        defaultSystemPrompt: `You are the official {{project.name}} assistant. You help community members by answering questions using only official documentation and FAQ entries.`
      },
      rateLimits: {
        dailyLimit: 20,
        cooldownSimple: 30000,
        cooldownComplex: 120000,
        costEstimates: {
          ask: 0.01,
          askSimple: 0.003,
          quiz: 0.005,
          refresh: 0.001
        }
      },
      features: {
        healthCheck: {
          enabled: true,
          port: 3000
        },
        profiles: {
          enabled: enableProfiles.toLowerCase() !== 'n',
          defaultProfile: "casual"
        },
        monitoring: {
          enabled: enableMonitoring.toLowerCase() !== 'n',
          logRetentionDays: 30
        },
        fileUpload: {
          enabled: enableFileUpload.toLowerCase() !== 'n',
          defaultMode: "fileUsage"
        }
      },
      data: {
        categories: {
          forum_faq: "Community Q&A from Discord forums",
          philosophy: "Design vision, team info, development history",
          guides: "System guides, tutorials, and how-tos",
          lore: "World building, story, characters, and background"
        },
        knowledgeBasePath: "./data/",
        profilesPath: "./profiles/",
        templatesPath: "./templates/"
      },
      deployment: {
        pm2: {
          name: botName,
          maxMemoryRestart: "400M",
          instances: 1
        },
        healthCheck: {
          port: 3000,
          endpoints: ["/health", "/status", "/metrics"]
        }
      }
    };

    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, '..', 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write configuration file
    const configPath = path.join(configDir, 'project.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('\n✅ Configuration created successfully!');
    console.log(`📁 Config file: ${configPath}`);
    
    // Generate package.json
    console.log('\n📦 Generating package.json...');
    const generatePackage = require('./generate-package');
    generatePackage();
    
    console.log('\n🎉 Project initialization complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Add your Discord token and Anthropic API key to .env');
    console.log('2. Create your data files in the data/ directory');
    console.log('3. Customize profiles in the profiles/ directory');
    console.log('4. Run: npm start');
    
  } catch (error) {
    console.error('❌ Error during initialization:', error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  initProject();
}

module.exports = initProject;



