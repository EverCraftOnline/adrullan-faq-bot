const monitor = require('../lib/monitor');
const profileManager = require('../lib/profileManager');
const anthropicClient = require('../lib/anthropicClient');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  async execute(message) {
    // Check if user is admin
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                   message.member?.roles.cache.some(role => role.name === 'Bot Admin') ||
                   message.author.id === process.env.ADMIN_USER_ID;

    if (!isAdmin) {
      return message.reply('❌ This command is restricted to administrators only.');
    }

    const args = message.content.split(' ').slice(1);
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case 'status':
        await handleStatus(message);
        break;
      case 'metrics':
        await handleMetrics(message);
        break;
      case 'logs':
        await handleLogs(message, args[1]);
        break;
      case 'health':
        await handleHealth(message);
        break;
      case 'restart':
        await handleRestart(message);
        break;
      case 'profiles':
        await handleProfiles(message);
        break;
      case 'files':
        await handleFiles(message);
        break;
      default:
        await handleHelp(message);
    }
  }
};

async function handleStatus(message) {
  const status = monitor.getStatus();
  const health = monitor.isHealthy();
  
  const embed = {
    color: health.healthy ? 0x00ff00 : 0xff0000,
    title: '🤖 Bot Status',
    fields: [
      {
        name: 'Status',
        value: health.healthy ? '✅ Healthy' : '❌ Unhealthy',
        inline: true
      },
      {
        name: 'Uptime',
        value: status.uptime,
        inline: true
      },
      {
        name: 'Memory Usage',
        value: status.memory,
        inline: true
      },
      {
        name: 'Messages Processed',
        value: status.messages.toString(),
        inline: true
      },
      {
        name: 'Errors',
        value: status.errors.toString(),
        inline: true
      },
      {
        name: 'Profile Switches',
        value: status.profileSwitches.toString(),
        inline: true
      },
      {
        name: 'File Uploads',
        value: status.uploads.toString(),
        inline: true
      },
      {
        name: 'Last Activity',
        value: status.lastActivity,
        inline: true
      },
      {
        name: 'Top Commands',
        value: status.topCommands.map(cmd => `**${cmd.command}**: ${cmd.count}`).join('\n') || 'None',
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Adrullan FAQ Bot Monitor'
    }
  };

  await message.reply({ embeds: [embed] });
}

async function handleMetrics(message) {
  const metrics = monitor.getSystemMetrics();
  
  const embed = {
    color: 0x0099ff,
    title: '📊 System Metrics',
    fields: [
      {
        name: 'Memory Usage',
        value: `**Heap Used:** ${metrics.memory.heapUsed}MB\n**Heap Total:** ${metrics.memory.heapTotal}MB\n**System Used:** ${metrics.memory.systemUsed}MB\n**System Total:** ${metrics.memory.systemTotal}MB`,
        inline: true
      },
      {
        name: 'CPU Info',
        value: `**Load Average:** ${metrics.cpu.loadAverage.map(load => load.toFixed(2)).join(', ')}\n**CPU Cores:** ${metrics.cpu.cpus}`,
        inline: true
      },
      {
        name: 'Bot Statistics',
        value: `**Messages:** ${metrics.stats.messagesProcessed}\n**Errors:** ${metrics.stats.errors}\n**Profile Switches:** ${metrics.stats.profileSwitches}\n**Uploads:** ${metrics.stats.uploads}`,
        inline: true
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Adrullan FAQ Bot Monitor'
    }
  };

  await message.reply({ embeds: [embed] });
}

async function handleLogs(message, level = 'recent') {
  const today = new Date().toISOString().split('T')[0];
  const fs = require('fs');
  const path = require('path');
  
  let logFile;
  if (level === 'error' || level === 'errors') {
    logFile = path.join(__dirname, '..', 'logs', `${today}-errors.log`);
  } else {
    logFile = path.join(__dirname, '..', 'logs', `${today}.log`);
  }
  
  if (!fs.existsSync(logFile)) {
    return message.reply('❌ No log file found for today.');
  }
  
  const logs = fs.readFileSync(logFile, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .slice(-20) // Last 20 lines
    .map(line => {
      try {
        const log = JSON.parse(line);
        return `**[${log.timestamp}] ${log.level}:** ${log.message}`;
      } catch {
        return line;
      }
    })
    .join('\n');
  
  if (logs.length > 2000) {
    const truncated = logs.substring(0, 1900) + '\n... (truncated)';
    await message.reply(`📋 **Recent Logs:**\n\`\`\`\n${truncated}\n\`\`\``);
  } else {
    await message.reply(`📋 **Recent Logs:**\n\`\`\`\n${logs}\n\`\`\``);
  }
}

async function handleHealth(message) {
  const health = monitor.isHealthy();
  
  const embed = {
    color: health.healthy ? 0x00ff00 : 0xff0000,
    title: '🏥 Health Check',
    fields: [
      {
        name: 'Overall Status',
        value: health.healthy ? '✅ Healthy' : '❌ Unhealthy',
        inline: false
      },
      {
        name: 'Health Checks',
        value: `**Recent Activity:** ${health.checks.recentActivity ? '✅' : '❌'}\n**Memory Healthy:** ${health.checks.memoryHealthy ? '✅' : '❌'}\n**Error Rate Healthy:** ${health.checks.errorRateHealthy ? '✅' : '❌'}`,
        inline: false
      }
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Adrullan FAQ Bot Monitor'
    }
  };

  await message.reply({ embeds: [embed] });
}

async function handleRestart(message) {
  await message.reply('🔄 Restarting bot...');
  monitor.log('INFO', 'Bot restart requested via monitor command');
  
  // Graceful shutdown
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

async function handleProfiles(message) {
  const profiles = profileManager.getAllProfiles();
  const activeProfile = profileManager.getActiveProfile();
  
  let profileList = '**Available Profiles:**\n';
  profiles.forEach(name => {
    const profile = profileManager.getProfile(name);
    const isActive = name === profileManager.activeProfile;
    profileList += `${isActive ? '🟢' : '⚪'} **${profile.name}** - ${profile.description}\n`;
  });
  
  profileList += `\n**Active Profile:** ${activeProfile.name}`;
  
  await message.reply(profileList);
}

async function handleFiles(message) {
  try {
    const files = await anthropicClient.listWorkspaceFiles();
    
    let fileList = `**Uploaded Files (${files.length}):**\n`;
    files.forEach(file => {
      const size = Math.round(file.size_bytes / 1024);
      const created = new Date(file.created_at).toLocaleDateString();
      fileList += `• **${file.filename}** (${size}KB) - ${created}\n`;
    });
    
    if (files.length === 0) {
      fileList = 'No files uploaded to Anthropic workspace.';
    }
    
    await message.reply(fileList);
  } catch (error) {
    await message.reply(`❌ Error fetching files: ${error.message}`);
  }
}

async function handleHelp(message) {
  const helpText = `**🤖 Monitor Command Help**

**Usage:** \`!monitor <subcommand>\`

**Available Commands:**
• \`!monitor status\` - Show bot status and statistics
• \`!monitor metrics\` - Show detailed system metrics
• \`!monitor logs [error]\` - Show recent logs (add 'error' for error logs only)
• \`!monitor health\` - Run health check
• \`!monitor restart\` - Restart the bot
• \`!monitor profiles\` - Show available profiles
• \`!monitor files\` - Show uploaded files

**Examples:**
• \`!monitor status\`
• \`!monitor logs error\`
• \`!monitor metrics\``;

  await message.reply(helpText);
}

