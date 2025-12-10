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

async function createNewProject() {
  console.log('🚀 Discord FAQ Bot - New Project Creator');
  console.log('This will help you create a new bot project from scratch.\n');

  try {
    // Collect project information
    console.log('📝 Project Information:');
    const projectName = await question('Project name (e.g., "Nexus FAQ Bot"): ');
    const projectDescription = await question('Project description: ');
    const projectWebsite = await question('Project website URL: ');
    const projectAuthor = await question('Author/Team name: ');
    const projectRepository = await question('Repository URL (optional): ');
    
    console.log('\n🤖 Bot Configuration:');
    const botName = await question('Bot name (e.g., "nexus-faq-bot"): ');
    const displayName = projectName; // Use project name as display name
    const emoji = await question('Bot emoji (e.g., "🔗"): ');
    const primaryColor = await question('Primary color (hex, e.g., "#00D4FF"): ');
    
    console.log('\n👑 Discord Configuration:');
    const adminUserIds = await question('Admin user IDs (comma-separated, optional): ');
    const adminRoles = await question('Admin roles (comma-separated, e.g., "Admin,Developer"): ');
    const supportChannels = await question('Support channels (comma-separated, e.g., "#general,#help"): ');
    
    console.log('\n⚙️ Features:');
    const enableProfiles = await question('Enable AI profiles? (y/n, default: y): ');
    const enableMonitoring = await question('Enable monitoring? (y/n, default: y): ');
    const enableFileUpload = await question('Enable file upload? (y/n, default: y): ');
    
    // Create project directory
    const projectDir = path.join(process.cwd(), botName);
    if (fs.existsSync(projectDir)) {
      const overwrite = await question(`\n⚠️  Directory ${botName} already exists. Overwrite? (y/n): `);
      if (overwrite.toLowerCase() !== 'y') {
        console.log('❌ Project creation cancelled.');
        return;
      }
    }
    
    console.log(`\n📁 Creating project directory: ${projectDir}`);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
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
        defaultSystemPrompt: `You are the official ${projectName} assistant. You help community members by answering questions using only official documentation and FAQ entries.`
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
          faq: "Frequently Asked Questions",
          guides: "How-to guides and tutorials",
          lore: "Story, characters, and world building",
          technical: "Technical documentation and API references"
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

    // Create directory structure
    const directories = [
      'config',
      'data',
      'profiles',
      'templates',
      'scripts',
      'lib',
      'commands',
      'public',
      'logs'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(projectDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}/`);
      }
    });

    // Write configuration file
    const configPath = path.join(projectDir, 'config', 'project.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Created config/project.json');

    // Copy framework files
    const frameworkFiles = [
      'bot.js',
      'ecosystem.config.js',
      'package.json',
      'lib/configLoader.js',
      'lib/anthropicClient.js',
      'lib/knowledgeLoader.js',
      'lib/rateLimiter.js',
      'lib/monitor.js',
      'lib/healthCheck.js',
      'lib/profileManager.js'
    ];

    const frameworkDirs = [
      'commands',
      'templates',
      'scripts'
    ];

    console.log('\n📋 Copying framework files...');
    
    // Copy individual files
    frameworkFiles.forEach(file => {
      const srcPath = path.join(__dirname, '..', file);
      const destPath = path.join(projectDir, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file}`);
      }
    });

    // Copy directories
    frameworkDirs.forEach(dir => {
      const srcDir = path.join(__dirname, '..', dir);
      const destDir = path.join(projectDir, dir);
      if (fs.existsSync(srcDir)) {
        copyDir(srcDir, destDir);
        console.log(`✅ Copied ${dir}/`);
      }
    });

    // Copy public directory
    const publicSrc = path.join(__dirname, '..', 'public');
    const publicDest = path.join(projectDir, 'public');
    if (fs.existsSync(publicSrc)) {
      copyDir(publicSrc, publicDest);
      console.log('✅ Copied public/');
    }

    // Generate package.json for the new project
    console.log('\n📦 Generating project files...');
    process.chdir(projectDir);
    
    // Update configLoader to use the new config
    const generatePackage = require('./scripts/generate-package');
    generatePackage();

    // Generate profiles
    const { generateAllProfiles } = require('./scripts/generate-profile');
    generateAllProfiles();

    // Create sample data files
    createSampleDataFiles(projectDir, projectName);

    console.log('\n🎉 Project creation complete!');
    console.log(`\n📁 Project created at: ${projectDir}`);
    console.log('\n📋 Next steps:');
    console.log('1. cd ' + botName);
    console.log('2. Add your Discord token and Anthropic API key to .env');
    console.log('3. Customize the data files in the data/ directory');
    console.log('4. Update profiles in the profiles/ directory if needed');
    console.log('5. Run: npm install');
    console.log('6. Run: npm start');
    
  } catch (error) {
    console.error('❌ Error during project creation:', error.message);
  } finally {
    rl.close();
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function createSampleDataFiles(projectDir, projectName) {
  const sampleData = [
    {
      file: 'data/faq.json',
      content: `[
  {
    "id": "welcome",
    "title": "Welcome to ${projectName}",
    "content": "This is a sample FAQ entry. Replace this with your actual FAQ content.",
    "category": "faq",
    "tags": ["welcome", "getting-started"],
    "source_url": "",
    "last_updated": "${new Date().toISOString().split('T')[0]}",
    "priority": "high"
  }
]`
    },
    {
      file: 'data/guides.json',
      content: `[
  {
    "id": "getting-started",
    "title": "Getting Started Guide",
    "content": "This is a sample guide. Replace this with your actual guide content.",
    "category": "guides",
    "tags": ["tutorial", "beginner"],
    "source_url": "",
    "last_updated": "${new Date().toISOString().split('T')[0]}",
    "priority": "medium"
  }
]`
    }
  ];

  sampleData.forEach(({ file, content }) => {
    const filePath = path.join(projectDir, file);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created ${file}`);
  });
}

if (require.main === module) {
  createNewProject();
}

module.exports = createNewProject;


