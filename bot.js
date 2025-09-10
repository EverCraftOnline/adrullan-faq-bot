require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const indexCommand = require('./commands/indexCommand');
const askCommand = require('./commands/askCommand');
const askAllCommand = require('./commands/askAllCommand');
const refreshFAQ = require('./commands/refreshFAQ');
const quizCommand = require('./commands/quizCommand');
const statsCommand = require('./commands/statsCommand');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready! Commands: !index, !ask, !askall, !refreshfaq, !quiz, !stats');
});

// Handle connection errors
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('disconnect', () => {
  console.log('Bot disconnected from Discord');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Handle !index command (your existing functionality)
  if (message.content.startsWith('!index')) {
    await indexCommand.execute(message);
  }
  
  // Handle !askall command (uses all context) - MUST come before !ask
  if (message.content.startsWith('!askall')) {
    await askAllCommand.execute(message);
  }
  
  // Handle !ask command (new AI functionality)
  else if (message.content.startsWith('!ask')) {
    await askCommand.execute(message);
  }
  
  // Handle !refreshfaq command (FAQ data generation)
  if (message.content.startsWith('!refreshfaq')) {
    await refreshFAQ.execute(message);
  }
  
  // Handle !quiz command (interactive quiz system)
  if (message.content.startsWith('!quiz')) {
    await quizCommand.execute(message);
  }
  
  // Handle !stats command (usage statistics - admin only)
  if (message.content.startsWith('!stats')) {
    await statsCommand.execute(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
