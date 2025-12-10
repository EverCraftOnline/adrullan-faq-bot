const { PermissionsBitField } = require('discord.js');
const configLoader = require('../lib/configLoader');

module.exports = {
  async execute(message) {
    const args = message.content.split(' ').slice(1);
    const commandName = args[0]?.toLowerCase();

    // If a specific command is requested, show detailed help for that command
    if (commandName) {
      return await showCommandHelp(message, commandName);
    }

    // Check if user is admin for admin commands visibility
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                   configLoader.isAdmin(message.author.id, message.member);

    const branding = configLoader.getBranding();
    const project = configLoader.getProjectInfo();
    const discordConfig = configLoader.getDiscordConfig();

    const helpEmbed = {
      color: parseInt(branding.color.replace('#', ''), 16),
      title: `${branding.emoji} ${branding.displayName} - Command Help`,
      description: `Here are all the commands available for the ${branding.displayName}:`,
      fields: [
        {
          name: '🎯 **Question Commands**',
          value: `\`!ask <question>\` - Ask a question about Adrullan (smart context selection)
\`!quiz\` - Start an interactive quiz about Adrullan lore and gameplay`,
          inline: false
        },
        {
          name: '📚 **Forum & Index Commands**',
          value: `\`!index <forum_id> [style] [--noarchive]\` - Create an index of forum threads
\`!refreshfaq <forum_id> [--bump]\` - Update knowledge base from forum content`,
          inline: false
        },
        {
          name: '⚙️ **Profile Management**',
          value: `\`!profile list\` - List all available AI personalities
\`!profile current\` - Show currently active profile
\`!profile switch <name>\` - Switch to a different personality
\`!profile info <name>\` - Show detailed profile information
\`!profile context [on/off]\` - Toggle conversation context`,
          inline: false
        }
      ],
      footer: {
        text: `Use ${discordConfig.defaultPrefix}help <command> for detailed information about any command`
      },
      timestamp: new Date().toISOString()
    };

    // Add admin commands if user is admin
    if (isAdmin) {
      helpEmbed.fields.push({
        name: '🔧 **Admin Commands** (Admin Only)',
        value: `\`!askall <question>\` - Ask questions using ALL available context (testing)
\`!stats\` - View bot usage statistics and costs
\`!monitor status\` - Show bot status and health
\`!monitor metrics\` - Show detailed system metrics
\`!monitor logs [error]\` - Show recent logs
\`!monitor health\` - Run health check
\`!monitor restart\` - Restart the bot
\`!uploaddata upload [filename]\` - Upload files to Anthropic workspace
\`!uploaddata toggle on/off\` - Switch between context modes
\`!uploaddata status\` - Show upload status and files`,
        inline: false
      });
    }

    await message.reply({ embeds: [helpEmbed] });
  }
};

async function showCommandHelp(message, commandName) {
  const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                 configLoader.isAdmin(message.author.id, message.member);
  
  const project = configLoader.getProjectInfo();
  const discordConfig = configLoader.getDiscordConfig();

  let helpText = '';

  switch (commandName) {
    case 'ask':
      helpText = `**🎯 !ask Command**

**Usage:** \`!ask <your question>\`

**Description:** Ask questions about {{project.name}} lore, gameplay, mechanics, or philosophy. The bot intelligently selects relevant context based on your question type.

**Examples:**
• \`!ask What is the death penalty system?\`
• \`!ask Who are the Six Aspects?\`
• \`!ask How does combat work?\`
• \`!ask What is the central conflict in Adrullan?\`

**Flags:**
• \`--all\` or \`--full\` - Use all available context (no token limits)

**Rate Limits:** 20 requests per day per user (30s cooldown for simple questions, 2m for complex ones)`;
      break;

    case 'askall':
      if (!isAdmin) {
        return message.reply('❌ This command is only available to administrators.');
      }
      helpText = `**🎯 !askall Command** (Admin Only)

**Usage:** \`!askall <your question>\`

**Description:** Ask questions using ALL available context from the knowledge base. This is a testing command for comprehensive answers about complex topics.

**Examples:**
• \`!askall What is the complete story of Adrullan?\`
• \`!askall Tell me everything about the Six Aspects?\`
• \`!askall What are all the gameplay mechanics?\`

**Note:** This command bypasses rate limits and uses maximum context for the most thorough answers. Use sparingly for testing purposes.`;
      break;

    case 'quiz':
      helpText = `**🎯 !quiz Command**

**Usage:** \`!quiz\`

**Description:** Start an interactive quiz about Adrullan lore and gameplay. The bot generates random questions from the knowledge base.

**Features:**
• Random questions about lore, gods, champions, and gameplay
• 60-second time limit per question
• First correct answer wins
• Shows time taken and number of attempts

**Commands:**
• \`!quiz\` - Start a new quiz
• \`!quiz stop\` - Stop the current quiz

**Note:** Only one quiz can be active at a time.`;
      break;

    case 'index':
      helpText = `**📚 !index Command**

**Usage:** \`!index <forum_channel_id> [style] [--noarchive]\`

**Description:** Create an index of forum threads in a Discord forum channel.

**Parameters:**
• \`forum_channel_id\` - The ID of the forum channel to index
• \`style\` - Output format: discord (default), markdown, plain, numbered
• \`--noarchive\` - Exclude archived threads

**Examples:**
• \`!index 1234567890123456789\`
• \`!index 1234567890123456789 markdown\`
• \`!index 1234567890123456789 discord --noarchive\`

**Styles:**
• \`discord\` - Discord-native clickable links
• \`markdown\` - Markdown format with clickable links
• \`plain\` - Plain text with URLs
• \`numbered\` - Numbered list with links`;
      break;

    case 'refreshfaq':
      if (!isAdmin) {
        return message.reply('❌ This command is only available to administrators.');
      }
      helpText = `**📚 !refreshfaq Command** (Admin Only)

**Usage:** \`!refreshfaq <forum_channel_id> [--bump]\`

**Description:** Update the knowledge base by fetching actual content from forum threads.

**Parameters:**
• \`forum_channel_id\` - The ID of the forum channel to process
• \`--bump\` - Bump archived threads back to active

**Process:**
1. Fetches all threads (active and archived)
2. Downloads actual message content from each thread
3. Creates structured JSON data for the knowledge base
4. Uploads to Anthropic workspace for AI access

**Examples:**
• \`!refreshfaq 1234567890123456789\`
• \`!refreshfaq 1234567890123456789 --bump\`

**Note:** This command processes up to 100 messages per thread and may take several minutes.`;
      break;

    case 'profile':
      helpText = `**⚙️ !profile Command**

**Usage:** \`!profile <subcommand> [options]\`

**Description:** Manage AI personality profiles that affect how the bot responds to questions.

**Subcommands:**
• \`!profile list\` - List all available profiles
• \`!profile current\` - Show currently active profile
• \`!profile switch <name>\` - Switch to a different profile
• \`!profile info <name>\` - Show detailed profile information
• \`!profile context [on/off]\` - Toggle conversation context
• \`!profile create <name> <description>\` - Create new profile (interactive)

**Available Profiles:**
• \`casual\` - Friendly, casual responses
• \`technical\` - Detailed, technical explanations
• \`creative\` - Imaginative, story-focused responses
• \`locked-down\` - Conservative, fact-only responses

**Examples:**
• \`!profile switch creative\`
• \`!profile info technical\`
• \`!profile context on\`

**Note:** Profile changes affect all future !ask and !askall commands.`;
      break;

    case 'stats':
      if (!isAdmin) {
        return message.reply('❌ This command is only available to administrators.');
      }
      helpText = `**📊 !stats Command** (Admin Only)

**Usage:** \`!stats\`

**Description:** View bot usage statistics, costs, and user activity.

**Information Shown:**
• Total requests today
• Estimated costs
• Active users
• Top users by request count
• Rate limit settings

**Rate Limits:**
• 20 requests per day per user
• 30s cooldown for simple questions
• 2m cooldown for complex questions
• ~$0.003 per simple request
• ~$0.01 per complex request`;
      break;

    case 'monitor':
      if (!isAdmin) {
        return message.reply('❌ This command is only available to administrators.');
      }
      helpText = `**🔧 !monitor Command** (Admin Only)

**Usage:** \`!monitor <subcommand>\`

**Description:** Monitor bot health, performance, and system status.

**Subcommands:**
• \`!monitor status\` - Show bot status and statistics
• \`!monitor metrics\` - Show detailed system metrics
• \`!monitor logs [error]\` - Show recent logs (add 'error' for errors only)
• \`!monitor health\` - Run health check
• \`!monitor restart\` - Restart the bot
• \`!monitor profiles\` - Show available profiles
• \`!monitor files\` - Show uploaded files

**Examples:**
• \`!monitor status\`
• \`!monitor logs error\`
• \`!monitor metrics\`

**Note:** This command provides comprehensive monitoring and administration tools.`;
      break;

    case 'uploaddata':
      if (!isAdmin) {
        return message.reply('❌ This command is only available to administrators.');
      }
      helpText = `**📤 !uploaddata Command** (Admin Only)

**Usage:** \`!uploaddata <subcommand> [options]\`

**Description:** Manage data uploads to Anthropic workspace and toggle between context modes.

**Subcommands:**
• \`!uploaddata upload [filename]\` - Upload all files or specific file
• \`!uploaddata toggle on/off\` - Toggle between context passing and file usage
• \`!uploaddata status\` - Show current mode and uploaded files
• \`!uploaddata list\` - List all files in Anthropic workspace
• \`!uploaddata delete <file_id>\` - Delete specific file
• \`!uploaddata deleteall\` - Delete ALL files
• \`!uploaddata clear\` - Clear uploaded files cache

**Modes:**
• **Context Passing** (default) - Bot passes context in prompts
• **File Usage** - Bot uses uploaded files from workspace

**Examples:**
• \`!uploaddata upload\` - Upload all files
• \`!uploaddata upload lore.txt\` - Upload specific file
• \`!uploaddata toggle off\` - Switch to file usage mode

**Note:** File usage mode provides better quality answers but requires uploading files first.`;
      break;

    default:
      helpText = `❌ **Command not found:** \`${commandName}\`

**Available commands for detailed help:**
• \`!help ask\` - Question asking with smart context
• \`!help quiz\` - Interactive quiz system
• \`!help index\` - Forum thread indexing
• \`!help profile\` - AI personality management
${isAdmin ? '• `!help askall` - Questions using all context (Admin)\n• `!help stats` - Usage statistics (Admin)\n• `!help monitor` - System monitoring (Admin)\n• `!help uploaddata` - Data upload management (Admin)\n• `!help refreshfaq` - FAQ knowledge base updates (Admin)' : ''}

Use \`!help\` to see the main command overview.`;
  }

  await message.reply(helpText);
}
