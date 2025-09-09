module.exports = {
  async execute(message) {
    const args = message.content.split(' ');
    const forumId = args[1];
    const style = args[2] || 'discord'; // default style: discord internal links

    if (!forumId) {
      return message.reply('Usage: `!index <forum_channel_id> [style]`\nStyles: discord, markdown, plain, numbered');
    }

    try {
      const forumChannel = await message.client.channels.fetch(forumId);

      if (!forumChannel || forumChannel.type !== 15) {
        return message.reply('That\'s not a valid forum channel.');
      }

      const threads = await forumChannel.threads.fetchActive();

      const entries = [];
      let count = 1;

      for (const [id, thread] of threads.threads) {
        const url = `https://discord.com/channels/${thread.guildId}/${thread.id}`;
        const name = thread.name;

        let line;
        switch (style.toLowerCase()) {
          case 'markdown':
            line = `- [${name}](${url})`;
            break;
          case 'plain':
            line = `${name} - ${url}`;
            break;
          case 'numbered':
            line = `${count++}. [${name}](${url})`;
            break;
          case 'discord':
          default:
            line = `#${name}`; // Discord-native clickable forum title
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

    } catch (err) {
      console.error('[ERROR] Index command failed:', err);
      message.reply('Something went wrong while building the index.');
    }
  }
};
