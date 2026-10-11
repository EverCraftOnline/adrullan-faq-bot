/**
 * Export a channel's messages over a date range, for backfilling the website's alpha test
 * history. Read-only: uses the bot's REST access, never posts.
 *
 * Usage (from repo root):
 *   node scripts/exportChannelHistory.js <channelId> --from 2022-05-01 --to 2025-08-01
 *   node scripts/exportChannelHistory.js <channelId> --from 2022-11-20 --to 2022-12-20 --download
 *
 * Writes data/history/<channel-name>/<from>_<to>.json (oldest first). With --download, saves
 * attachments to data/history/<channel-name>/attachments/ now, since Discord's attachment URLs
 * expire after about a day. Requires DISCORD_TOKEN in .env and Read Message History on the channel.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { REST, Routes } = require('discord.js');

const DISCORD_EPOCH = 1420070400000n;
const snowflakeAt = (ms) => ((BigInt(ms) - DISCORD_EPOCH) << 22n).toString();
const timeOf = (id) => Number((BigInt(id) >> 22n) + DISCORD_EPOCH);

function args() {
  const [channelId, ...rest] = process.argv.slice(2);
  const flag = (name) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  if (!channelId || !/^\d+$/.test(channelId)) {
    throw new Error('Usage: node scripts/exportChannelHistory.js <channelId> --from YYYY-MM-DD --to YYYY-MM-DD [--download]');
  }
  const from = flag('--from') || '2015-01-01';
  const to = flag('--to') || new Date().toISOString().slice(0, 10);
  return { channelId, from, to, download: rest.includes('--download') };
}

const slim = (m) => ({
  id: m.id,
  url: `https://discord.com/channels/${m.guild_id ?? '@me'}/${m.channel_id}/${m.id}`,
  at: m.timestamp,
  edited: m.edited_timestamp || undefined,
  author: m.author?.global_name || m.author?.username,
  username: m.author?.username,
  bot: m.author?.bot || undefined,
  content: m.content,
  embeds: m.embeds?.length
    ? m.embeds.map((e) => ({ title: e.title, description: e.description, url: e.url, image: e.image?.url, thumbnail: e.thumbnail?.url, video: e.video?.url }))
    : undefined,
  attachments: m.attachments?.length
    ? m.attachments.map((a) => ({ id: a.id, filename: a.filename, type: a.content_type, size: a.size, w: a.width, h: a.height, url: a.url }))
    : undefined,
  reactions: m.reactions?.length ? m.reactions.map((r) => ({ emoji: r.emoji.name, count: r.count })) : undefined,
  thread: m.thread ? { id: m.thread.id, name: m.thread.name } : undefined,
  reference: m.message_reference?.message_id,
});

async function main() {
  const { channelId, from, to, download } = args();
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const channel = await rest.get(Routes.channel(channelId));
  const name = (channel.name || channelId).replace(/[^a-z0-9-_]+/gi, '-');
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T23:59:59Z`);

  // Page backwards from the end of the range until we pass its start.
  const messages = [];
  let before = snowflakeAt(toMs);
  for (;;) {
    const page = await rest.get(Routes.channelMessages(channelId), { query: new URLSearchParams({ limit: '100', before }) });
    if (!page.length) break;
    for (const m of page) if (timeOf(m.id) >= fromMs) messages.push({ ...m, guild_id: channel.guild_id });
    before = page[page.length - 1].id;
    process.stdout.write(`\r#${name}: ${messages.length} messages, back to ${new Date(timeOf(before)).toISOString().slice(0, 10)}`);
    if (timeOf(before) < fromMs) break;
  }
  process.stdout.write('\n');

  const out = messages.reverse().map(slim);
  const dir = path.join(__dirname, '..', 'data', 'history', name);
  fs.mkdirSync(dir, { recursive: true });

  if (download) {
    const adir = path.join(dir, 'attachments');
    fs.mkdirSync(adir, { recursive: true });
    let n = 0;
    for (const m of out) {
      for (const [i, a] of (m.attachments ?? []).entries()) {
        // Several attachments on one post often share a name (image.png), so number them.
        const name = m.attachments.length > 1 ? a.filename.replace(/(\.\w+)?$/, `-${i + 1}$1`) : a.filename;
        const file = path.join(adir, `${m.at.slice(0, 10)}_${m.id}_${name}`);
        if (!fs.existsSync(file)) {
          const res = await fetch(a.url);
          if (!res.ok) { console.warn(`  skip ${a.filename}: HTTP ${res.status}`); continue; }
          fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
        }
        a.saved = path.relative(dir, file).replace(/\\/g, '/');
        n++;
      }
    }
    console.log(`Saved ${n} attachment(s) to ${adir}`);
  }

  const file = path.join(dir, `${from}_${to}.json`);
  fs.writeFileSync(file, JSON.stringify({ channel: { id: channelId, name: channel.name }, from, to, messages: out }, null, 2));
  console.log(`Wrote ${out.length} messages to ${file}`);
}

main().catch((err) => {
  console.error('Failed:', err.rawError?.message || err.message || err);
  process.exit(1);
});
