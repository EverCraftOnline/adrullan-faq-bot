/**
 * List Discord usernames for everyone who reacted with a specific emoji on a message.
 *
 * Usage (from repo root):
 *   node scripts/listReactionUsers.js
 *   node scripts/listReactionUsers.js <channelId> <messageId>
 *   node scripts/listReactionUsers.js <channelId> <messageId> <emoji>
 *
 * Requires DISCORD_TOKEN in .env (same token as the bot).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { fetchReactionEntrants } = require('../lib/reactionUsers');

const CHANNEL_ID = process.argv[2] || '809209869818658886';
const MESSAGE_ID = process.argv[3] || '1506548546734919830';
const EMOJI = process.argv[4] || '🌈';

async function main() {
  const { people, txtPath, csvPath, messageUrl, emoji, totalCount } =
    await fetchReactionEntrants(CHANNEL_ID, MESSAGE_ID, EMOJI);

  const displayNameLines = people.map((u) => {
    return u.display_name && u.display_name !== u.username
      ? `${u.username} (${u.display_name})`
      : u.username;
  });

  console.log(`Message: ${messageUrl}`);
  console.log(`Emoji: ${emoji} (${totalCount} total, ${people.length} non-bot)\n`);
  displayNameLines.forEach((line) => console.log(line));
  console.log(`\nWrote ${people.length} usernames to:`);
  console.log(`  ${txtPath}`);
  console.log(`  ${csvPath}`);
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
