const fs = require('fs');
const path = require('path');
const { randomInt } = require('crypto');
const { Client, GatewayIntentBits } = require('discord.js');

const DATA_DIR = path.join(__dirname, '..', 'data');

function csvPathForMessage(messageId) {
  return path.join(DATA_DIR, `reaction-users-${messageId}.csv`);
}

function parseCsvRow(line) {
  const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)"$/);
  if (!match) return null;
  return {
    username: match[1],
    display_name: match[2],
    user_id: match[3],
  };
}

function loadUsersFromCsv(csvPath) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}\nRun: node scripts/listReactionUsers.js`);
  }

  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const users = lines.slice(1).map(parseCsvRow).filter(Boolean);

  if (users.length === 0) {
    throw new Error(`No entrants in ${csvPath}`);
  }

  return users;
}

function saveUserLists(messageId, people, guildId, channelId, emoji, totalCount) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const txtPath = path.join(DATA_DIR, `reaction-users-${messageId}.txt`);
  const csvPath = csvPathForMessage(messageId);

  const lines = people.map((u) => u.username);
  fs.writeFileSync(txtPath, lines.join('\n') + '\n', 'utf8');
  fs.writeFileSync(
    csvPath,
    'username,display_name,user_id\n' +
      people
        .map((u) => {
          const display = (u.display_name || '').replace(/"/g, '""');
          return `"${u.username}","${display}","${u.user_id}"`;
        })
        .join('\n') +
      '\n',
    'utf8'
  );

  return { txtPath, csvPath, messageUrl: `https://discord.com/channels/${guildId}/${channelId}/${messageId}`, emoji, totalCount };
}

async function fetchAllReactionUsers(reaction) {
  let users = await reaction.users.fetch();

  while (users.size < reaction.count) {
    const lastId = users.lastKey();
    const more = await reaction.users.fetch({ after: lastId });
    if (more.size === 0) break;
    users = users.concat(more);
  }

  return users;
}

async function fetchReactionEntrants(channelId, messageId, emoji = '🌈') {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not set in .env');
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  try {
    await client.login(process.env.DISCORD_TOKEN);
    await new Promise((resolve, reject) => {
      client.once('ready', resolve);
      client.once('error', reject);
    });

    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      throw new Error(`Channel ${channelId} is not a text channel`);
    }

    const message = await channel.messages.fetch(messageId);
    const reaction = message.reactions.cache.find((r) => r.emoji.name === emoji);

    if (!reaction) {
      const names = [...message.reactions.cache.values()].map(
        (r) => `${r.emoji.name ?? r.emoji.toString()} (${r.count})`
      );
      throw new Error(`No "${emoji}" reaction. Present: ${names.join(', ') || 'none'}`);
    }

    const users = await fetchAllReactionUsers(reaction);
    const people = [...users.values()]
      .filter((u) => !u.bot)
      .sort((a, b) => a.username.localeCompare(b.username))
      .map((u) => ({
        username: u.username,
        display_name: u.globalName || u.displayName || '',
        user_id: u.id,
      }));

    const saved = saveUserLists(
      messageId,
      people,
      channel.guildId,
      channelId,
      emoji,
      reaction.count
    );

    return { people, ...saved };
  } finally {
    client.destroy();
  }
}

function pickRandomWinners(entrants, count = 1) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Winner count must be a positive integer, got: ${count}`);
  }
  if (count > entrants.length) {
    throw new Error(`Cannot pick ${count} winners from ${entrants.length} entrants`);
  }

  const indices = Array.from({ length: entrants.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const chosen = indices.slice(0, count).sort((a, b) => a - b);
  const winners = chosen.map((index, rank) => ({
    place: rank + 1,
    drawIndex: index,
    ...entrants[index],
  }));

  return { winners, indices: chosen };
}

function pickRandomWinner(entrants) {
  const { winners, indices } = pickRandomWinners(entrants, 1);
  return { winner: winners[0], index: indices[0] };
}

function saveWinnerRecord(messageId, result) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(DATA_DIR, `reaction-winner-${messageId}-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  return outPath;
}

module.exports = {
  DATA_DIR,
  csvPathForMessage,
  loadUsersFromCsv,
  fetchReactionEntrants,
  pickRandomWinner,
  pickRandomWinners,
  saveWinnerRecord,
};
