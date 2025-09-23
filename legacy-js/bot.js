const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const indexCommand = require('./commands/indexCommand');
const askCommand = require('./commands/askCommand');
const askAllCommand = require('./commands/askAllCommand');
const refreshFAQ = require('./commands/refreshFAQ');
const quizCommand = require('./commands/quizCommand');
const statsCommand = require('./commands/statsCommand');
const uploadDataCommand = require('./commands/uploadDataCommand');
const profileCommand = require('./commands/profileCommand');
const monitorCommand = require('./commands/monitorCommand');
const helpCommand = require('./commands/helpCommand');
const monitor = require('./lib/monitor');
const HealthCheckServer = require('./lib/healthCheck');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Initialize health check server
const healthServer = new HealthCheckServer();

client.once('ready', () => {
  monitor.log('SUCCESS', `Logged in as ${client.user.tag}`);
  monitor.log('SUCCESS', 'Bot is ready! Commands: !help, !index, !ask, !askall, !refreshfaq, !quiz, !stats, !uploaddata, !profile, !monitor');
  
  // Start health check server
  healthServer.start();
  
  // Set Discord client for notifications
  healthServer.setDiscordClient(client);
  
  // Log startup metrics
  const metrics = monitor.getSystemMetrics();
  monitor.log('INFO', 'Bot startup complete', {
    memory: `${metrics.memory.heapUsed}MB`,
    uptime: metrics.uptime,
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Handle connection errors
client.on('error', (error) => {
  monitor.trackError(error, 'Discord client error');
});

client.on('disconnect', () => {
  monitor.log('WARN', 'Bot disconnected from Discord');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  monitor.trackError(new Error(reason), 'Unhandled promise rejection');
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  monitor.log('INFO', 'Received SIGINT, shutting down gracefully...');
  gracefulShutdown();
});

process.on('SIGTERM', () => {
  monitor.log('INFO', 'Received SIGTERM, shutting down gracefully...');
  gracefulShutdown();
});

// Graceful shutdown function
async function gracefulShutdown() {
  try {
    monitor.log('INFO', 'Starting graceful shutdown...');
    
    // Stop health check server
    healthServer.stop();
    
    // Disconnect from Discord
    if (client.isReady()) {
      await client.destroy();
      monitor.log('SUCCESS', 'Discord client disconnected');
    }
    
    // Clean up old logs
    monitor.cleanOldLogs();
    
    monitor.log('SUCCESS', 'Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    monitor.trackError(error, 'Error during graceful shutdown');
    process.exit(1);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Track message processing
  monitor.trackMessage();
  
  try {
    // Handle !index command (your existing functionality)
    if (message.content.startsWith('!index')) {
      monitor.trackMessage('index');
      await indexCommand.execute(message);
    }
  
    // Handle !askall command (uses all context) - MUST come before !ask
    if (message.content.startsWith('!askall')) {
      monitor.trackMessage('askall');
      await askAllCommand.execute(message);
    }
    
    // Handle !ask command (new AI functionality)
    else if (message.content.startsWith('!ask')) {
      monitor.trackMessage('ask');
      await askCommand.execute(message);
    }
    
    // Handle !refreshfaq command (FAQ data generation)
    if (message.content.startsWith('!refreshfaq')) {
      monitor.trackMessage('refreshfaq');
      await refreshFAQ.execute(message);
    }
    
    // Handle !quiz command (interactive quiz system)
    if (message.content.startsWith('!quiz')) {
      monitor.trackMessage('quiz');
      await quizCommand.execute(message);
    }
    
    // Handle !stats command (usage statistics - admin only)
    if (message.content.startsWith('!stats')) {
      monitor.trackMessage('stats');
      await statsCommand.execute(message);
    }
    
    // Handle !uploaddata command (data upload and toggle management)
    if (message.content.startsWith('!uploaddata')) {
      monitor.trackMessage('uploaddata');
      await uploadDataCommand.execute(message);
    }
    
    // Handle !profile command (profile management - admin only)
    if (message.content.startsWith('!profile')) {
      monitor.trackMessage('profile');
      await profileCommand.execute(message);
    }
    
    // Handle !monitor command (monitoring and admin tools - admin only)
    if (message.content.startsWith('!monitor')) {
      monitor.trackMessage('monitor');
      await monitorCommand.execute(message);
    }
    
    // Handle !help command (command help and documentation)
    if (message.content.startsWith('!help')) {
      monitor.trackMessage('help');
      await helpCommand.execute(message);
    }
  } catch (error) {
    monitor.trackError(error, 'Message processing error');
    await message.reply('❌ An error occurred while processing your command. Please try again later.');
  }
});

client.login(process.env.DISCORD_TOKEN);
