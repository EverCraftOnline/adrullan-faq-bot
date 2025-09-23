const fs = require('fs');
const path = require('path');
const anthropicClient = require('../lib/anthropicClient');
const { PermissionsBitField } = require('discord.js');

module.exports = {
  async execute(message) {
    // Check if user is admin (you can customize this)
    const isAdmin = message.member?.permissions.has(PermissionsBitField.Flags.Administrator) || 
                   message.author.id === '146495555760160769' ||
                   message.member?.roles.cache.some(role => role.name === 'Designer');
    
    if (!isAdmin) {
      return message.reply('❌ This command is only available to administrators.');
    }

    const args = message.content.split(' ');
    const forumId = args[1];
    const bumpThreads = args.includes('--bump'); // Optional flag to bump threads

    if (!forumId) {
      return message.reply('Usage: `!refreshfaq <forum_channel_id> [--bump]`\nThis will fetch actual message content from forum threads to update the knowledge base.\nAdd --bump to also bump archived threads back to active.');
    }

    try {
      const forumChannel = await message.client.channels.fetch(forumId);

      if (!forumChannel || forumChannel.type !== 15) {
        return message.reply('That\'s not a valid forum channel.');
      }

      await message.reply('🔄 Fetching forum content... This may take a moment.');

      // Fetch both active and archived threads
      const [activeThreads, archivedThreads] = await Promise.all([
        forumChannel.threads.fetchActive(),
        forumChannel.threads.fetchArchived({ limit: 50 }) // Get up to 50 archived threads
      ]);

      const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);
      const jsonEntries = [];
      let processedCount = 0;

      for (const [id, thread] of allThreads) {
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

          // Bump archived threads if requested
          if (bumpThreads && thread.archived) {
            try {
              await thread.send('🔄 FAQ thread refreshed for knowledge base update');
              console.log(`Bumped: ${thread.name}`);
            } catch (bumpError) {
              console.log(`Could not bump ${thread.name}: ${bumpError.message}`);
            }
          }

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

      // Save to data folder at repo root (Option A)
      const jsonPath = path.join(__dirname, '..', '..', 'data', 'forum_faq.json');
      fs.writeFileSync(jsonPath, JSON.stringify(jsonEntries, null, 2));
      
      const archivedCount = Array.from(allThreads.values()).filter(t => t.archived).length;
      const activeCount = Array.from(allThreads.values()).filter(t => !t.archived).length;
      
      // Upload to Anthropic workspace
      await message.reply('📤 Uploading updated FAQ to Anthropic workspace...');
      
      try {
        const uploadResults = await anthropicClient.uploadAllDataFiles();
        const successCount = uploadResults.filter(r => r.success).length;
        const totalFiles = uploadResults.length;
        
        let uploadStatus = `✅ **FAQ Knowledge Base Updated & Uploaded!**\n\n📊 **Local Stats:**\n• ${processedCount} threads processed\n• ${activeCount} active threads\n• ${archivedCount} archived threads\n• ${jsonEntries.length} total entries\n• Saved to: \`data/forum_faq.json\`\n\n📤 **Anthropic Upload:**\n• ${successCount}/${totalFiles} files uploaded successfully`;
        
        if (successCount < totalFiles) {
          uploadStatus += '\n\n❌ **Upload Issues:**';
          uploadResults.filter(r => !r.success).forEach(result => {
            uploadStatus += `\n• ${result.file}: ${result.error}`;
          });
        }
        
        uploadStatus += '\n\n🤖 The bot now has access to actual forum content for answering questions!';
        
        await message.reply(uploadStatus);
      } catch (uploadError) {
        console.error('Upload to Anthropic failed:', uploadError);
        await message.reply(`✅ **FAQ Knowledge Base Updated Locally!**\n\n📊 **Stats:**\n• ${processedCount} threads processed\n• ${activeCount} active threads\n• ${archivedCount} archived threads\n• ${jsonEntries.length} total entries\n• Saved to: \`data/forum_faq.json\`\n\n❌ **Anthropic Upload Failed:** ${uploadError.message}\n\n🤖 The bot has local access to forum content, but upload to Anthropic failed.`);
      }

    } catch (err) {
      console.error('[ERROR] Refresh FAQ command failed:', err);
      message.reply('❌ Something went wrong while refreshing the FAQ data. Check the console for details.');
    }
  }
};
