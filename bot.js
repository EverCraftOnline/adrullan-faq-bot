require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const indexCommand = require('./commands/indexCommand');
const askCommand = require('./commands/askCommand');
const refreshFAQ = require('./commands/refreshFAQ');

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
  console.log('Bot is ready! Commands: !index, !ask, !refreshfaq');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Handle !index command (your existing functionality)
  if (message.content.startsWith('!index')) {
    await indexCommand.execute(message);
  }
  
  // Handle !ask command (new AI functionality)
  if (message.content.startsWith('!ask')) {
    await askCommand.execute(message);
  }
  
  // Handle !refreshfaq command (FAQ data generation)
  if (message.content.startsWith('!refreshfaq')) {
    await refreshFAQ.execute(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
