const profileManager = require('../lib/profileManager');
const monitor = require('../lib/monitor');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  async execute(message) {
    // Check if user is admin (same permissions as stats command)
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                   message.author.id === '146495555760160769' ||
                   message.member?.roles.cache.some(role => role.name === 'Designer');
    
    if (!isAdmin) {
      return message.reply('❌ This command is only available to administrators.');
    }

    const args = message.content.split(' ').slice(1);
    const subcommand = args[0]?.toLowerCase();

    try {
      switch (subcommand) {
        case 'list':
          await handleListProfiles(message);
          break;
        case 'switch':
        case 'set':
          await handleSwitchProfile(message, args[1]);
          break;
        case 'current':
        case 'active':
          await handleCurrentProfile(message);
          break;
        case 'info':
          await handleProfileInfo(message, args[1]);
          break;
        case 'create':
          await handleCreateProfile(message, args.slice(1));
          break;
        case 'update':
          await handleUpdateProfile(message, args.slice(1));
          break;
        case 'delete':
          await handleDeleteProfile(message, args[1]);
          break;
        case 'init':
          await handleInitializeProfiles(message);
          break;
        case 'context':
        case 'conversation':
          await handleToggleConversationContext(message, args[1]);
          break;
        default:
          await showHelp(message);
      }
    } catch (error) {
      console.error('Profile command error:', error);
      await message.reply('❌ An error occurred while processing the profile command.');
    }
  }
};

async function showHelp(message) {
  const helpText = `🤖 **Profile Management Commands** 🤖

**Usage:** \`!profile <command> [options]\`

**Commands:**
\`!profile list\` - List all available profiles
\`!profile current\` - Show the currently active profile
\`!profile switch <name>\` - Switch to a different profile
\`!profile info <name>\` - Show detailed info about a profile
\`!profile create <name> <description>\` - Create a new profile (interactive)
\`!profile update <name>\` - Update an existing profile (interactive)
\`!profile delete <name>\` - Delete a profile (cannot delete default)
\`!profile context [on/off]\` - Toggle conversation context for current profile
\`!profile init\` - Initialize default profiles

**Examples:**
\`!profile switch casual\` - Switch to casual personality
\`!profile info creative\` - Show details about creative profile
\`!profile context on\` - Enable conversation context
\`!profile context\` - Check current conversation context status
\`!profile list\` - See all available profiles

**Note:** Profile changes affect all future !ask and !askall commands.`;

  await message.reply(helpText);
}

async function handleListProfiles(message) {
  const profiles = profileManager.getAllProfiles();
  const activeProfile = profileManager.activeProfile;
  
  let response = `📋 **Available Profiles** 📋\n\n`;
  
  for (const profileName of profiles) {
    const profile = profileManager.getProfile(profileName);
    const isActive = profileName === activeProfile;
    response += `${isActive ? '🟢' : '⚪'} **${profile.name}** (${profileName})`;
    if (isActive) response += ' - *Currently Active*';
    response += `\n   ${profile.description}\n\n`;
  }
  
  response += `**Current Active:** ${profileManager.getActiveProfile().name}`;
  
  await message.reply(response);
}

async function handleCurrentProfile(message) {
  const activeProfile = profileManager.getActiveProfile();
  
  const response = `🎯 **Currently Active Profile** 🎯

**Name:** ${activeProfile.name}
**Description:** ${activeProfile.description}
**Personality:** ${activeProfile.personality}
**Response Length:** ${activeProfile.responseLength}
**Max Tokens:** ${activeProfile.maxTokens}
**Allow Speculation:** ${activeProfile.allowSpeculation ? 'Yes' : 'No'}
**Citation Style:** ${activeProfile.citationStyle}

**System Prompt Preview:**
\`\`\`
${activeProfile.systemPrompt.substring(0, 200)}...
\`\`\`

Use \`!profile list\` to see all available profiles.`;

  await message.reply(response);
}

async function handleSwitchProfile(message, profileName) {
  if (!profileName) {
    return message.reply('❌ Please specify a profile name. Use `!profile list` to see available profiles.');
  }

  const success = profileManager.setActiveProfile(profileName);
  
  if (success) {
    const profile = profileManager.getActiveProfile();
    monitor.trackProfileSwitch(profileManager.activeProfile, profileName);
    await message.reply(`✅ **Switched to profile:** ${profile.name}\n\n${profile.description}\n\n*This will affect all future !ask and !askall commands.*`);
  } else {
    await message.reply(`❌ Profile "${profileName}" not found. Use \`!profile list\` to see available profiles.`);
  }
}

async function handleProfileInfo(message, profileName) {
  if (!profileName) {
    return message.reply('❌ Please specify a profile name. Use `!profile list` to see available profiles.');
  }

  const profile = profileManager.getProfile(profileName);
  
  if (!profile) {
    return message.reply(`❌ Profile "${profileName}" not found. Use \`!profile list\` to see available profiles.`);
  }

  const isActive = profileName === profileManager.activeProfile;
  
  const response = `📖 **Profile Information: ${profile.name}** 📖

**Name:** ${profile.name}
**Description:** ${profile.description}
**Personality:** ${profile.personality}
**Response Length:** ${profile.responseLength}
**Max Tokens:** ${profile.maxTokens}
**Allow Speculation:** ${profile.allowSpeculation ? 'Yes' : 'No'}
**Allow Off-Topic:** ${profile.allowOffTopic ? 'Yes' : 'No'}
**Citation Style:** ${profile.citationStyle}
**Status:** ${isActive ? '🟢 Currently Active' : '⚪ Available'}

**System Prompt:**
\`\`\`
${profile.systemPrompt}
\`\`\`

${isActive ? '' : `Use \`!profile switch ${profileName}\` to activate this profile.`}`;

  await message.reply(response);
}

async function handleCreateProfile(message, args) {
  if (args.length < 2) {
    return message.reply('❌ Usage: `!profile create <name> <description>`\nExample: `!profile create myprofile A custom profile for testing`');
  }

  const profileName = args[0].toLowerCase();
  const description = args.slice(1).join(' ');

  if (profileManager.getProfile(profileName)) {
    return message.reply(`❌ Profile "${profileName}" already exists. Use \`!profile update ${profileName}\` to modify it.`);
  }

  // For now, create a basic profile - in a real implementation, you might want to make this interactive
  const newProfile = {
    name: profileName.charAt(0).toUpperCase() + profileName.slice(1),
    description: description,
    systemPrompt: `You are a custom assistant for Adrullan Online Adventures. ${description}

RULES:
1. Use information from the provided knowledge base context
2. If information isn't available, say "I don't have that information in our current knowledge base"
3. Always cite sources when available
4. Stay focused on Adrullan
5. Be helpful and informative

RESPONSE FORMAT:
- Direct answer to the question
- Cite your sources when available
- Suggest follow-up questions if helpful`,
    maxTokens: 20000,
    responseLength: 'balanced',
    personality: 'custom',
    allowSpeculation: false,
    allowOffTopic: false,
    citationStyle: 'clickable-url'
  };

  const success = profileManager.createProfile(profileName, newProfile);
  
  if (success) {
    await message.reply(`✅ **Created profile:** ${newProfile.name}\n\n${description}\n\nUse \`!profile switch ${profileName}\` to activate it.`);
  } else {
    await message.reply('❌ Failed to create profile. Please try again.');
  }
}

async function handleUpdateProfile(message, args) {
  if (args.length < 1) {
    return message.reply('❌ Usage: `!profile update <name>`\nExample: `!profile update myprofile`');
  }

  const profileName = args[0].toLowerCase();
  const existingProfile = profileManager.getProfile(profileName);
  
  if (!existingProfile) {
    return message.reply(`❌ Profile "${profileName}" not found. Use \`!profile list\` to see available profiles.`);
  }

  // For now, just show current info - in a real implementation, you might want to make this interactive
  await message.reply(`📝 **Update Profile: ${existingProfile.name}**\n\nThis feature is coming soon! For now, you can manually edit the profile file at \`profiles/${profileName}.json\` and restart the bot.\n\nCurrent profile info:\n\`\`\`json\n${JSON.stringify(existingProfile, null, 2)}\n\`\`\``);
}

async function handleDeleteProfile(message, profileName) {
  if (!profileName) {
    return message.reply('❌ Usage: `!profile delete <name>`\nExample: `!profile delete myprofile`');
  }

  if (profileName === 'locked-down') {
    return message.reply('❌ Cannot delete the default "locked-down" profile.');
  }

  const success = profileManager.deleteProfile(profileName);
  
  if (success) {
    await message.reply(`✅ **Deleted profile:** ${profileName}`);
  } else {
    await message.reply(`❌ Profile "${profileName}" not found or could not be deleted.`);
  }
}

async function handleInitializeProfiles(message) {
  profileManager.initializeDefaultProfiles();
  await message.reply('✅ **Initialized default profiles!**\n\nUse `!profile list` to see all available profiles.');
}

async function handleToggleConversationContext(message, action) {
  if (!action) {
    const activeProfile = profileManager.getActiveProfile();
    const status = activeProfile.includeConversationContext ? 'enabled' : 'disabled';
    return message.reply(`📝 **Conversation Context:** ${status}\n\nUse \`!profile context on/off\` to toggle.`);
  }
  
  const enable = action.toLowerCase() === 'on' || action.toLowerCase() === 'true' || action.toLowerCase() === 'enable';
  const activeProfileName = profileManager.activeProfile;
  
  const success = profileManager.updateProfile(activeProfileName, {
    includeConversationContext: enable
  });
  
  if (success) {
    const status = enable ? 'enabled' : 'disabled';
    await message.reply(`✅ **Conversation Context ${status}** for profile: ${activeProfileName}\n\nThis will include the last bot reply and user question as context for new questions.`);
    monitor.trackProfileSwitch(activeProfileName, 'conversation-context-toggle');
  } else {
    await message.reply(`❌ Failed to update conversation context setting.`);
  }
}
