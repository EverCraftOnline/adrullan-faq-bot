const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.join(__dirname, '..', 'data');

function safeSessionId(session) {
  if (!session || typeof session !== 'string') return null;
  const s = session.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(s) || s.length > 64) return null;
  return s;
}

function safePrefix(prefix) {
  if (prefix == null || typeof prefix !== 'string') return 'AOA_';
  return prefix
    .trim()
    .replace(/[/\\:*?"<>|]/g, '_')
    .slice(0, 80) || 'AOA_';
}

function sessionDir(session) {
  const id = safeSessionId(session);
  if (!id) throw new Error('Invalid session id (use letters, numbers, underscore, hyphen)');
  return path.join(DATA_ROOT, 'cat-screenshots', id);
}

function statePath(session) {
  return path.join(sessionDir(session), 'session-state.json');
}

function loadState(session) {
  const sp = statePath(session);
  if (!fs.existsSync(sp)) {
    return { nextSeq: 1, entries: [] };
  }
  try {
    const raw = fs.readFileSync(sp, 'utf8');
    const data = JSON.parse(raw);
    return {
      nextSeq: Math.max(1, parseInt(data.nextSeq, 10) || 1),
      entries: Array.isArray(data.entries) ? data.entries : []
    };
  } catch {
    return { nextSeq: 1, entries: [] };
  }
}

function saveState(session, state) {
  const dir = sessionDir(session);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(statePath(session), JSON.stringify(state, null, 2), 'utf8');
}

/**
 * @param {string} session
 * @param {string} prefix
 * @param {Buffer} buffer
 * @param {string} ext - without dot, e.g. png
 */
function saveScreenshot(session, prefix, buffer, ext) {
  const id = safeSessionId(session);
  if (!id) throw new Error('Invalid session id');

  const state = loadState(session);
  const seq = state.nextSeq;
  const padded = String(seq).padStart(4, '0');
  const pf = safePrefix(prefix);
  const safeExt = (ext || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const filename = `${pf}${padded}.${safeExt}`;

  const dir = sessionDir(session);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, buffer);

  const localPath = `cat-screenshots/${id}/${filename}`;
  const entry = {
    seq,
    filename,
    localPath,
    savedAt: new Date().toISOString()
  };

  state.entries.push(entry);
  state.nextSeq = seq + 1;
  saveState(session, state);

  return { entry, fullPath, localPath, filename, seq };
}

function entryBySeq(entries, seq) {
  const n = Number(seq);
  return entries.find((x) => Number(x.seq) === n);
}

function updateEntryWix(session, seq, wix) {
  const state = loadState(session);
  const e = entryBySeq(state.entries, seq);
  if (!e) return false;
  e.wixUrl = wix.wixUrl;
  e.wixFileId = wix.wixFileId;
  e.uploadedToWix = new Date().toISOString();
  saveState(session, state);
  return true;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 40).map((t) => t.slice(0, 80));
  }
  return String(tags || '')
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((t) => t.slice(0, 80));
}

function updateEntryMeta(session, seq, meta) {
  const state = loadState(session);
  const e = entryBySeq(state.entries, seq);
  if (!e) return null;
  if (meta.title !== undefined) e.title = String(meta.title).trim().slice(0, 200) || undefined;
  if (meta.note !== undefined) e.note = String(meta.note).trim().slice(0, 4000) || undefined;
  if (meta.tags !== undefined) {
    const t = normalizeTags(meta.tags);
    e.tags = t.length ? t : undefined;
  }
  if (e.title === undefined) delete e.title;
  if (e.note === undefined) delete e.note;
  if (!e.tags || !e.tags.length) delete e.tags;
  saveState(session, state);
  return e;
}

function deleteEntry(session, seq) {
  const state = loadState(session);
  const n = Number(seq);
  const idx = state.entries.findIndex((x) => Number(x.seq) === n);
  if (idx < 0) return false;
  const e = state.entries[idx];
  const fullPath = path.join(sessionDir(session), path.basename(e.filename));
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
  state.entries.splice(idx, 1);
  saveState(session, state);
  return true;
}

function entryFullPath(session, entry) {
  return path.join(sessionDir(session), path.basename(entry.filename));
}

module.exports = {
  DATA_ROOT,
  safeSessionId,
  safePrefix,
  sessionDir,
  loadState,
  saveScreenshot,
  updateEntryWix,
  updateEntryMeta,
  deleteEntry,
  entryFullPath,
  normalizeTags
};
