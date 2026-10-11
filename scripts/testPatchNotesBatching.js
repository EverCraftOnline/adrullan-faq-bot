#!/usr/bin/env node
/**
 * Unit tests for patch notes batch merge and formatting helpers (no AI calls).
 * Usage: node scripts/testPatchNotesBatching.js
 */

const fs = require('fs');
const path = require('path');
const {
  parseFormattedToCategories,
  mergeBatchDiscordOutputs,
  categoriesToHtml,
  categoriesToDiscord,
  sortClassSection,
  normalizeCategoryOrder,
  countNotes
} = require('../lib/patchNotesMerge');
const {
  shouldUseBatching,
  chunkArray,
  getConfig
} = require('../lib/patchNotesAiFormatter');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${message}`);
  }
}

console.log('\n=== Patch Notes Batching Tests ===\n');

console.log('Config / threshold:');
const config = getConfig();
assert(config.batchThreshold === 150, 'default batch threshold is 150');
assert(config.batchSize === 50, 'default batch size is 50');
assert(shouldUseBatching(Array(149).fill({ content: 'x' })) === false, '149 notes does not batch');
assert(shouldUseBatching(Array(150).fill({ content: 'x' })) === true, '150 notes triggers batching');
assert(shouldUseBatching(Array(300).fill({ content: 'x' })) === true, '300 notes triggers batching');

console.log('\nchunkArray:');
const chunks = chunkArray(Array.from({ length: 125 }, (_, i) => i), 50);
assert(chunks.length === 3, '125 items splits into 3 chunks');
assert(chunks[0].length === 50 && chunks[2].length === 25, 'chunk sizes are 50, 50, 25');

console.log('\nparseFormattedToCategories:');
const sampleDiscord = `**Content**
- First Note
- Second Note

**Class**
- Cleric: Heal Spell Updated
- Warrior: New Ability

**Bug Fixes**
- Fixed Login Issue`;
const parsed = parseFormattedToCategories({ discord: sampleDiscord });
assert(parsed.Content.length === 2, 'parses Content notes');
assert(parsed.Class.length === 2, 'parses Class notes');
assert(parsed['Bug Fixes'].length === 1, 'parses Bug Fixes notes');

console.log('\nmergeBatchDiscordOutputs:');
const batch1 = `**Content**
- Note A
- Note B

**Class**
- Warrior: Slash Updated`;
const batch2 = `**Content**
- Note C

**Systems**
- New Crafting Window

**Class**
- Cleric: Smite Updated`;
const merged = mergeBatchDiscordOutputs([batch1, batch2]);
assert(merged.categories.Content.length === 3, 'merges Content across batches');
assert(merged.categories.Systems.length === 1, 'merges Systems from batch 2');
assert(merged.categories.Class.length === 2, 'merges Class across batches');
assert(merged.mergedNoteCount === 6, 'total merged note count is 6');

const classNotes = merged.categories.Class;
assert(
  classNotes[0].startsWith('Cleric:') && classNotes[1].startsWith('Warrior:'),
  'Class section sorted alphabetically after merge'
);

const categoryKeys = Object.keys(merged.categories);
assert(
  categoryKeys.indexOf('Content') < categoryKeys.indexOf('Class') &&
    categoryKeys.indexOf('Class') < categoryKeys.indexOf('Systems'),
  'categories follow standard order after merge'
);

assert(merged.html.includes("class='patch-header2'"), 'html uses single-quoted class attributes');
assert(merged.html.includes('Note A'), 'html preserves note text');
assert(merged.discord.includes('**Content**'), 'rebuilt discord has category headers');

console.log('\nDedupe:');
const dupBatch = `**Content**
- Same Note
- Same Note
- Unique Note`;
const deduped = mergeBatchDiscordOutputs([dupBatch], { dedupe: true });
assert(deduped.categories.Content.length === 2, 'removes exact duplicate notes');
assert(deduped.removedCount === 1, 'reports one duplicate removed');

console.log('\n0.10.69 draft regression (merge/html only):');
const draftPath = path.join(__dirname, '..', 'data', 'patch-notes-drafts', 'draft-0.10.69.json');
if (fs.existsSync(draftPath)) {
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  const categories = parseFormattedToCategories(draft);
  const html = categoriesToHtml(categories);
  const discord = categoriesToDiscord(categories);
  const noteCount = countNotes(categories);
  assert(noteCount === draft.messageCount || noteCount >= 180, '0.10.69 categories parse to substantial note count');
  assert(html.length > 1000, '0.10.69 deterministic html is non-trivial');
  assert(discord.includes('**'), '0.10.69 discord rebuild includes headers');
  assert(
    shouldUseBatching(draft.rawNotes || Array(draft.messageCount).fill({})) === true,
    '0.10.69 (206 msgs) would use batch path at default threshold'
  );
} else {
  console.log('  (skipped — draft-0.10.69.json not found)');
}

console.log('\nSimulated 300-note batch split:');
const fakeNotes = Array.from({ length: 300 }, (_, i) => ({ content: `Change number ${i + 1}` }));
const fakeChunks = chunkArray(fakeNotes, config.batchSize);
assert(fakeChunks.length === 6, '300 notes at batch size 50 produces 6 batches');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
