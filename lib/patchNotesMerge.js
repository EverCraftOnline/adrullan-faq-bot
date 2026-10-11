/**
 * Merge batched patch note AI outputs and rebuild discord/html deterministically.
 */

const CATEGORY_ORDER = [
  'Content',
  'Class',
  'Systems',
  'Interface',
  'Crafting',
  'Guilds',
  'Bug Fixes'
];

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Parse Discord markdown into structured categories.
 */
function parseFormattedToCategories(formatted) {
  const discordText = typeof formatted === 'string' ? formatted : formatted.discord;
  const categories = {};
  const lines = discordText.split('\n');
  let currentCategory = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const categoryMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1];
      if (!categories[currentCategory]) {
        categories[currentCategory] = [];
      }
      continue;
    }

    if (trimmed.startsWith('-') && currentCategory) {
      const note = trimmed.substring(1).trim();
      categories[currentCategory].push(note);
    }
  }

  return categories;
}

function countNotes(categories) {
  return Object.values(categories).reduce((sum, notes) => sum + notes.length, 0);
}

function mergeCategoryMaps(categoryMaps) {
  const merged = {};

  for (const categories of categoryMaps) {
    for (const category of Object.keys(categories)) {
      if (!merged[category]) {
        merged[category] = [];
      }
      merged[category].push(...categories[category]);
    }
  }

  return merged;
}

function dedupeNotes(categories) {
  const result = {};
  let removedCount = 0;

  for (const category of Object.keys(categories)) {
    const seen = new Set();
    result[category] = [];

    for (const note of categories[category]) {
      const key = note.toLowerCase().trim();
      if (seen.has(key)) {
        removedCount++;
        continue;
      }
      seen.add(key);
      result[category].push(note);
    }
  }

  return { categories: result, removedCount };
}

function getClassSortKey(note) {
  const match = note.match(/^([^:]+):/);
  return match ? match[1].trim().toLowerCase() : note.toLowerCase();
}

function sortClassSection(categories) {
  if (!categories.Class || categories.Class.length === 0) {
    return categories;
  }

  return {
    ...categories,
    Class: [...categories.Class].sort((a, b) => {
      const keyA = getClassSortKey(a);
      const keyB = getClassSortKey(b);
      if (keyA !== keyB) {
        return keyA.localeCompare(keyB);
      }
      return a.localeCompare(b);
    })
  };
}

function normalizeCategoryOrder(categories) {
  const ordered = {};
  const known = new Set(CATEGORY_ORDER);

  for (const category of CATEGORY_ORDER) {
    if (categories[category] && categories[category].length > 0) {
      ordered[category] = categories[category];
    }
  }

  for (const category of Object.keys(categories)) {
    if (!known.has(category) && categories[category].length > 0) {
      ordered[category] = categories[category];
    }
  }

  return ordered;
}

function categoriesToDiscord(categories) {
  const sections = [];

  for (const category of Object.keys(categories)) {
    const notes = categories[category];
    if (!notes || notes.length === 0) continue;

    sections.push(`**${category}**`);
    for (const note of notes) {
      sections.push(`- ${note}`);
    }
    sections.push('');
  }

  return sections.join('\n').trim();
}

function categoriesToHtml(categories) {
  const sections = [];

  for (const category of Object.keys(categories)) {
    const notes = categories[category];
    if (!notes || notes.length === 0) continue;

    sections.push(`<div class='patch-header2'>${escapeHtml(category)}</div>`);
    sections.push(`<div class='spacer-10'></div>`);

    for (const note of notes) {
      sections.push(`<div class='patch-note'>- ${escapeHtml(note)}</div>`);
    }

    sections.push(`<div class='spacer-30'></div>`);
  }

  return sections.join('\n');
}

/**
 * Merge multiple batch discord outputs into normalized categories, discord, and html.
 */
function mergeBatchDiscordOutputs(batchDiscordTexts, options = {}) {
  const dedupe = options.dedupe !== false;
  const categoryMaps = batchDiscordTexts.map((discord) =>
    parseFormattedToCategories({ discord })
  );

  let merged = mergeCategoryMaps(categoryMaps);
  let removedCount = 0;

  if (dedupe) {
    const deduped = dedupeNotes(merged);
    merged = deduped.categories;
    removedCount = deduped.removedCount;
  }

  merged = sortClassSection(merged);
  merged = normalizeCategoryOrder(merged);

  const discord = categoriesToDiscord(merged);
  const html = categoriesToHtml(merged);

  return {
    categories: merged,
    discord,
    html,
    mergedNoteCount: countNotes(merged),
    removedCount
  };
}

module.exports = {
  CATEGORY_ORDER,
  parseFormattedToCategories,
  mergeCategoryMaps,
  dedupeNotes,
  sortClassSection,
  normalizeCategoryOrder,
  categoriesToDiscord,
  categoriesToHtml,
  mergeBatchDiscordOutputs,
  countNotes
};
