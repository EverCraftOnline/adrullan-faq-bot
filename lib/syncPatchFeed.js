const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const patchNotesFormatter = require('./patchNotesFormatter');

const RELATIVE_FEED_PATH = path.join('..', '..', 'aoa-web', 'data', 'patch-notes', 'patch-notes-feed.json');

function parseVersionOrder(version) {
  const parts = String(version || '')
    .split('.')
    .map((segment) => segment.replace(/\D/g, ''))
    .filter(Boolean);

  if (parts.length === 0) {
    return 0;
  }

  return Number(parts.join('')) || 0;
}

function resolveFeedPath(customPath) {
  const fallbackPath = path.resolve(__dirname, RELATIVE_FEED_PATH);
  const targetPath = customPath ? path.resolve(customPath) : fallbackPath;
  const normalized = targetPath.replace(/\\/g, '/').toLowerCase();

  if (!normalized.endsWith('/aoa-web/data/patch-notes/patch-notes-feed.json')) {
    throw new Error(`Refusing to write outside the aoa-web feed file: ${targetPath}`);
  }

  return targetPath;
}

function ensureDraftVersion(draft, version) {
  if (!draft || !draft.version) {
    throw new Error('Draft is missing version data');
  }

  if (String(draft.version) !== String(version)) {
    throw new Error(`Draft version mismatch. Expected ${version}, got ${draft.version}`);
  }
}

function buildFeedItem(draft) {
  const sourceDate = draft.publishedAt || draft.generated || new Date().toISOString();
  const dateObj = new Date(sourceDate);
  const isoDate = dateObj.toISOString();

  return {
    releaseDate: dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    body: patchNotesFormatter.generateHTMLWithImages(draft),
    _id: crypto.randomUUID(),
    _createdDate: isoDate,
    versionOrder: parseVersionOrder(draft.version),
    displayDate: dateObj.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }),
    _updatedDate: isoDate,
    version: draft.version,
    'link-patch-notes-all': '/patch-notes/'
  };
}

function syncPatchFeed(draft, options = {}) {
  const { version, feedPath } = options;
  ensureDraftVersion(draft, version);

  const targetPath = resolveFeedPath(feedPath);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Feed file not found: ${targetPath}`);
  }

  const feedJson = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
  if (!feedJson || !Array.isArray(feedJson.items)) {
    throw new Error('Invalid feed JSON. Expected root object with items array.');
  }

  const existingIndex = feedJson.items.findIndex((item) => item && item.version === draft.version);
  const item = buildFeedItem(draft);
  let action = 'inserted';

  if (existingIndex >= 0) {
    const existing = feedJson.items[existingIndex];
    feedJson.items[existingIndex] = {
      ...existing,
      ...item,
      _id: existing._id || item._id,
      _createdDate: existing._createdDate || item._createdDate
    };
    action = 'updated';
  } else {
    feedJson.items.unshift(item);
  }

  fs.writeFileSync(targetPath, JSON.stringify(feedJson, null, 2), 'utf-8');

  return {
    success: true,
    action,
    version: draft.version,
    feedPath: targetPath
  };
}

module.exports = {
  syncPatchFeed
};
