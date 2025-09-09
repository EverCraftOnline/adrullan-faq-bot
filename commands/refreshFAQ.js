const fs = require('fs');
const path = require('path');

module.exports = {
  async execute(message) {
    const args = message.content.split(' ');
    const forumId = args[1];

    if (!forumId) {
      return message.reply('Usage: `!refreshfaq <forum_channel_id>`\nThis will fetch actual message content from forum threads to update the knowledge base.');
    }

    try {
      const forumChannel = await message.client.channels.fetch(forumId);

      if (!forumChannel || forumChannel.type !== 15) {
        return message.reply('That\'s not a valid forum channel.');
      }

      await message.reply('🔄 Fetching forum content... This may take a moment.');

      const threads = await forumChannel.threads.fetchActive();
      const jsonEntries = [];
      let processedCount = 0;

      for (const [id, thread] of threads.threads) {
        try {
          // Fetch messages from the thread to get actual content
          const messages = await thread.messages.fetch({ limit: 100 });
          const content = Array.from(messages.values())
            .filter(msg => !msg.author.bot && msg.content.trim().length > 0)
            .map(msg => msg.content)
            .join('\n\n')
            .substring(0, 3000); // Limit content length but give more space

          const url = `https://discord.com/channels/${thread.guildId}/${thread.id}`;
          
          jsonEntries.push({
            id: `forum_${id}`,
            title: thread.name,
            content: content || `Forum thread: ${thread.name}`,
            category: 'faq',
            tags: ['forum', 'community', 'faq', 'discord'],
            source_url: url,
            last_updated: new Date().toISOString().split('T')[0],
            priority: 'high'
          });

          processedCount++;
          console.log(`Processed: ${thread.name} (${content.length} chars)`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (fetchError) {
          console.error(`Error fetching content for thread ${thread.name}:`, fetchError.message);
          // Still add the thread with just the title
          const url = `https://discord.com/channels/${thread.guildId}/${thread.id}`;
          jsonEntries.push({
            id: `forum_${id}`,
            title: thread.name,
            content: `Forum thread: ${thread.name}`,
            category: 'faq',
            tags: ['forum', 'community', 'faq'],
            source_url: url,
            last_updated: new Date().toISOString().split('T')[0],
            priority: 'medium'
          });
        }
      }

      // Save to data folder
      const jsonPath = path.join(__dirname, '..', 'data', 'forum_faq.json');
      fs.writeFileSync(jsonPath, JSON.stringify(jsonEntries, null, 2));
      
      await message.reply(`✅ **FAQ Knowledge Base Updated!**\n\n📊 **Stats:**\n• ${processedCount} threads processed\n• ${jsonEntries.length} total entries\n• Saved to: \`data/forum_faq.json\`\n\n🤖 The bot now has access to actual forum content for answering questions!`);

    } catch (err) {
      console.error('[ERROR] Refresh FAQ command failed:', err);
      message.reply('❌ Something went wrong while refreshing the FAQ data. Check the console for details.');
    }
  }
};
