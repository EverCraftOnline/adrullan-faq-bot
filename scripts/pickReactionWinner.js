/**
 * Randomly pick entrant(s) from a saved reaction CSV (or fetch fresh first).
 * Uses crypto.randomInt (Fisher–Yates) for unbiased draws without replacement.
 *
 * Usage (from repo root):
 *   node scripts/pickReactionWinner.js
 *   node scripts/pickReactionWinner.js --count 5
 *   node scripts/pickReactionWinner.js -n 3
 *   node scripts/pickReactionWinner.js 5
 *   node scripts/pickReactionWinner.js --fetch --count 5
 *   node scripts/pickReactionWinner.js path/to/reaction-users-....csv --count 3
 *   node scripts/pickReactionWinner.js --fetch <channelId> <messageId> [emoji] --count 5
 *
 * Requires DISCORD_TOKEN in .env when using --fetch.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  csvPathForMessage,
  loadUsersFromCsv,
  fetchReactionEntrants,
  pickRandomWinners,
  saveWinnerRecord,
} = require('../lib/reactionUsers');

const DEFAULT_CHANNEL_ID = '809209869818658886';
const DEFAULT_MESSAGE_ID = '1506548546734919830';
const PRIZE = 'Closed Alpha Access';

function parseArgs(argv) {
  let fetch = false;
  let count = 1;
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--fetch') {
      fetch = true;
      continue;
    }

    if (arg === '--count' || arg === '-n') {
      count = parseInt(argv[++i], 10);
      continue;
    }

    positional.push(arg);
  }

  // Shorthand: `node scripts/pickReactionWinner.js 5`
  if (positional[0] && /^\d{1,2}$/.test(positional[0])) {
    count = parseInt(positional[0], 10);
    positional.shift();
  }

  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Invalid winner count: ${count}`);
  }

  let csvPath = null;
  let channelId = DEFAULT_CHANNEL_ID;
  let messageId = DEFAULT_MESSAGE_ID;
  let emoji = '🌈';

  if (positional[0] && (positional[0].endsWith('.csv') || positional[0].includes('reaction-users'))) {
    csvPath = path.isAbsolute(positional[0]) ? positional[0] : path.join(process.cwd(), positional[0]);
    messageId = path.basename(csvPath).match(/reaction-users-(\d+)\.csv/)?.[1] || DEFAULT_MESSAGE_ID;
  } else if (fetch) {
    channelId = positional[0] || DEFAULT_CHANNEL_ID;
    messageId = positional[1] || DEFAULT_MESSAGE_ID;
    emoji = positional[2] || '🌈';
    csvPath = csvPathForMessage(messageId);
  } else {
    messageId = DEFAULT_MESSAGE_ID;
    csvPath = csvPathForMessage(messageId);
  }

  return { fetch, count, csvPath, channelId, messageId, emoji };
}

function formatWinner(winner) {
  const display =
    winner.display_name && winner.display_name !== winner.username
      ? `${winner.username} (${winner.display_name})`
      : winner.username;
  return `${display} — id: ${winner.user_id}`;
}

async function main() {
  const { fetch, count, csvPath, channelId, messageId, emoji } = parseArgs(process.argv.slice(2));

  let source = csvPath;
  let entrants;
  let meta = {};

  if (fetch) {
    console.log('Fetching latest entrants from Discord...\n');
    const result = await fetchReactionEntrants(channelId, messageId, emoji);
    entrants = result.people;
    meta = {
      messageUrl: result.messageUrl,
      emoji: result.emoji,
      reactionCount: result.totalCount,
    };
    console.log(`Saved ${entrants.length} entrants to ${csvPath}\n`);
  } else {
    entrants = loadUsersFromCsv(csvPath);
    meta = {
      messageUrl: `https://discord.com/channels/804170096082681876/${channelId}/${messageId}`,
    };
  }

  const { winners, indices } = pickRandomWinners(entrants, count);

  const record = {
    pickedAt: new Date().toISOString(),
    prize: PRIZE,
    winnerCount: count,
    source,
    entrantCount: entrants.length,
    randomIndices: indices,
    messageId,
    ...meta,
    winners,
  };

  const recordPath = saveWinnerRecord(messageId, record);

  console.log('═'.repeat(50));
  console.log(`  PRIZE: ${PRIZE}`);
  console.log('═'.repeat(50));

  if (count === 1) {
    console.log(`\n  WINNER: ${formatWinner(winners[0])}\n`);
    console.log(`  Draw index: ${indices[0]} (0-based)`);
  } else {
    console.log(`\n  WINNERS (${count}):\n`);
    winners.forEach((w) => {
      console.log(`  ${w.place}. ${formatWinner(w)}  [index ${w.drawIndex}]`);
    });
    console.log('');
  }

  console.log(`  Pool size: ${entrants.length} entrants`);
  console.log(`  Source: ${source}`);
  console.log(`\n  Audit log: ${recordPath}`);
  console.log('═'.repeat(50));
}

main().catch((err) => {
  console.error('Failed:', err.message || err);
  process.exit(1);
});
