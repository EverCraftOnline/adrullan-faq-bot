module.exports = {
  async execute(message) {
    const args = message.content.split(' ');
    const forumId = args[1];
    const style = args[2] || 'discord'; // default style: discord internal links
    const noArchive = args.includes('--noarchive'); // flag to exclude archived threads

    if (!forumId) {
      return message.reply('Usage: `!index <forum_channel_id> [style] [--noarchive]`\nStyles: discord, markdown, plain, numbered\nAdd --noarchive to exclude archived threads');
    }

    try {
      const forumChannel = await message.client.channels.fetch(forumId);

      if (!forumChannel || forumChannel.type !== 15) {
        return message.reply('That\'s not a valid forum channel.');
      }

      // Fetch both active and archived threads by default
      const [activeThreads, archivedThreads] = await Promise.all([
        forumChannel.threads.fetchActive(),
        noArchive ? { threads: new Map() } : forumChannel.threads.fetchArchived({ limit: 100 })
      ]);

      const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);
      const entries = [];
      let count = 1;

      for (const [id, thread] of allThreads) {
        const url = `https://discord.com/channels/${thread.guildId}/${thread.id}`;
        const name = thread.name;

        // Add archive indicator
        const archiveIndicator = thread.archived ? ' 💤' : '';
        const displayName = name + archiveIndicator;

        let line;
        switch (style.toLowerCase()) {
          case 'markdown':
            line = `- [${displayName}](${url})`;
            break;
          case 'plain':
            line = `${displayName} - ${url}`;
            break;
          case 'numbered':
            line = `${count++}. [${displayName}](${url})`;
            break;
          case 'discord':
          default:
            line = `#${displayName}`; // Discord-native clickable forum title
            break;
        }

        entries.push(line);

        // Dump to terminal for copy/paste
        console.log(line);
      }

      // Send in chunks under 2000 characters
      const MAX_LENGTH = 2000;
      let currentChunk = '';
      for (const entry of entries) {
        if ((currentChunk + entry + '\n').length > MAX_LENGTH) {
          await message.channel.send(currentChunk);
          currentChunk = '';
        }
        currentChunk += entry + '\n';
      }

      if (currentChunk.length > 0) {
        await message.channel.send(currentChunk);
      }

      // Add summary
      const activeCount = Array.from(allThreads.values()).filter(t => !t.archived).length;
      const archivedCount = Array.from(allThreads.values()).filter(t => t.archived).length;
      const totalCount = allThreads.size;
      
      if (totalCount > 0) {
        await message.channel.send(`📊 **Index Summary:** ${totalCount} total threads (${activeCount} active, ${archivedCount} archived 💤)`);
      }

    } catch (err) {
      console.error('[ERROR] Index command failed:', err);
      message.reply('Something went wrong while building the index.');
    }
  }
};
