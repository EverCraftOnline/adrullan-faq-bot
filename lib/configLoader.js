const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.config = null;
    this.configPath = path.join(__dirname, '..', 'config', 'project.json');
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.error(`❌ Configuration file not found at ${this.configPath}`);
        console.log('💡 Please create a config/project.json file first');
        process.exit(1);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      console.log(`✅ Loaded configuration for: ${this.config.project.name}`);
      return this.config;
    } catch (error) {
      console.error('❌ Error loading configuration:', error.message);
      process.exit(1);
    }
  }

  // Get a config value using dot notation (e.g., 'project.name', 'branding.color')
  get(path, defaultValue = null) {
    if (!this.config) {
      this.loadConfig();
    }

    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  // Replace template variables in strings (e.g., {{project.name}})
  templateReplace(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.get(path.trim());
      return value !== null ? value : match;
    });
  }

  // Get project info for easy access
  getProjectInfo() {
    return {
      name: this.get('project.name'),
      description: this.get('project.description'),
      version: this.get('project.version'),
      author: this.get('project.author'),
      repository: this.get('project.repository'),
      website: this.get('project.website')
    };
  }

  // Get branding info for easy access
  getBranding() {
    return {
      botName: this.get('branding.botName'),
      displayName: this.get('branding.displayName'),
      emoji: this.get('branding.emoji'),
      color: this.get('branding.color'),
      primaryColor: this.get('branding.primaryColor'),
      secondaryColor: this.get('branding.secondaryColor')
    };
  }

  // Get Discord configuration
  getDiscordConfig() {
    return {
      adminUserIds: this.get('discord.adminUserIds', []),
      adminRoles: this.get('discord.adminRoles', []),
      supportChannels: this.get('discord.supportChannels', []),
      defaultPrefix: this.get('discord.defaultPrefix', '!')
    };
  }

  // Get AI configuration
  getAIConfig() {
    return {
      model: this.get('ai.model'),
      maxTokens: this.get('ai.maxTokens'),
      contextLimits: this.get('ai.contextLimits', {}),
      defaultSystemPrompt: this.templateReplace(this.get('ai.defaultSystemPrompt'))
    };
  }

  // Get rate limiting configuration
  getRateLimitConfig() {
    return {
      dailyLimit: this.get('rateLimits.dailyLimit'),
      cooldownSimple: this.get('rateLimits.cooldownSimple'),
      cooldownComplex: this.get('rateLimits.cooldownComplex'),
      costEstimates: this.get('rateLimits.costEstimates', {})
    };
  }

  // Get feature flags
  getFeatures() {
    return this.get('features', {});
  }

  // Get data configuration
  getDataConfig() {
    return {
      categories: this.get('data.categories', {}),
      knowledgeBasePath: this.get('data.knowledgeBasePath'),
      profilesPath: this.get('data.profilesPath'),
      templatesPath: this.get('data.templatesPath')
    };
  }

  // Get deployment configuration
  getDeploymentConfig() {
    return this.get('deployment', {});
  }

  // Check if user is admin
  isAdmin(userId, member) {
    const discordConfig = this.getDiscordConfig();
    
    // Check user ID
    if (discordConfig.adminUserIds.includes(userId)) {
      return true;
    }

    // Check roles if member object is provided
    if (member && member.roles) {
      return discordConfig.adminRoles.some(roleName => 
        member.roles.cache.some(role => role.name === roleName)
      );
    }

    return false;
  }

  // Reload configuration (useful for development)
  reload() {
    this.loadConfig();
  }
}

// Create singleton instance
const configLoader = new ConfigLoader();

module.exports = configLoader;


