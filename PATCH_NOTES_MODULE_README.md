# Patch Notes Module

This module automatically formats Discord patch notes and saves drafts for dashboard review, plus provides HTML versions for Wix CMS import.

## Features

- Automatically finds the last version post by EnigmaFactory
- Collects all messages after the version post
- **Uses AI (Claude) to format** according to the Patch Notes Formatting Guide
- **Auto-batches large patches** (150+ notes by default) to avoid output truncation
- Saves draft JSON for dashboard editing and publishing
- Posts formatted notes back to Discord on publish (handles message limits)
- Saves HTML version for Wix CMS import

## Usage

### Discord Command

```
!patchnotes
!patchnotes -withimages
```

The bot will:
1. Find the last version post (e.g., "0.10.43") by EnigmaFactory in the patch notes channel
2. Collect all messages after that post
3. Format them according to the formatting guide (batched automatically for large patches)
4. Save a draft for dashboard review
5. Provide a link to edit before publishing

### Channel Configuration

The patch notes channel ID is configured in `commands/patchNotesCommand.js`:
```javascript
const PATCH_NOTES_CHANNEL_ID = '988344623028137995';
```

### Dashboard Access

After running `!patchnotes`, open the editor:

- **Editor**: `{DASHBOARD_URL}/dashboard/patchnotes/{version}`
- **Draft API**: `/api/patch-notes/drafts/{version}`

## Large Patch Batching

When a patch has many Discord entries, the bot splits AI formatting into batches instead of one giant request.

**Default behavior:**
- **Under 150 notes**: single AI formatting call (Discord pass, then deterministic HTML)
- **150+ notes**: batch Pass 1 (Discord formatting), merge programmatically, build HTML deterministically

During batch processing, the bot posts progress in Discord:
- `Batch 1/6 formatting...`
- `Merging 312 notes from 6 batch(es)...`

Merged output is stitched together without a second AI merge call. Categories are normalized to the standard order, the Class section is sorted alphabetically, and exact duplicate bullets are removed.

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PATCH_NOTES_BATCH_THRESHOLD` | `150` | Switch to batched mode at this many raw notes |
| `PATCH_NOTES_BATCH_SIZE` | `50` | Notes per AI batch |
| `PATCH_NOTES_BATCH_CONCURRENCY` | `2` | Parallel batch API calls |
| `PATCH_NOTES_MAX_TOKENS` | `32000` | Max output tokens per AI call (cap 64000) |
| `PATCH_NOTES_LEGACY_SINGLE_CALL` | off | Restore old single JSON call (`discord` + `html` together) |
| `PATCH_NOTES_AI_HTML` | off | Use AI for HTML pass on small patches (default uses deterministic HTML) |

**Expected runtime for large patches:** ~6–8 batches × ~30–60 seconds each (depends on note count and API speed).

### Troubleshooting

- **Incomplete JSON / truncated response**: Lower `PATCH_NOTES_BATCH_SIZE` or raise `PATCH_NOTES_MAX_TOKENS`
- **Missing notes after merge**: Check logs for low note ratio warning; re-run with smaller batches
- **Need old behavior**: Set `PATCH_NOTES_LEGACY_SINGLE_CALL=true`

Run merge/batch unit tests (no AI):
```bash
node scripts/testPatchNotesBatching.js
```

## Formatting Rules

The module uses AI (Claude) to format according to the Patch Notes Formatting Guide:
- Headline Case for all text
- Brief, concise notes
- Proper categorization (Content, Class, Systems, Interface, Crafting, Guilds, Bug Fixes)
- Alphabetical ordering for Class section
- Proper HTML div structure for Wix

The AI reads the formatting guide (from `eco-web/PATCH_NOTES_FORMATTING_GUIDE.md` if available) and applies all formatting rules automatically.

## Message Limits

Discord has a 2000 character limit per message. The module automatically splits long formatted notes into multiple messages when publishing.

## Files

- `commands/patchNotesCommand.js` - Discord command handler
- `lib/patchNotesAiFormatter.js` - AI formatting (single + batched modes)
- `lib/patchNotesMerge.js` - Batch merge, category ordering, deterministic HTML
- `lib/patchNotesDraft.js` - Draft save/load/update
- `lib/patchNotesFormatter.js` - HTML with images for publish
- `data/patch-notes-drafts/draft-{version}.json` - Draft files
- `public/patchnotes-editor.html` - Dashboard editor

## Integration

The module is integrated into `bot.js`. Use `!patchnotes` in Discord, review in the dashboard, then publish to Discord/Wix/eco-web from there.

## After publishing: the feed

The patcher and the game client's main menu read the patch-notes feed, not Discord or Wix.

1. In the dashboard's Publish dialog, check **eco-web feed**. `lib/syncEcoWebPatchFeed.js` adds or
   replaces the version in `..\eco-web\public\patch-notes-feed.json`, so the eco-web checkout must sit
   next to this repo. The **Wix CMS** option feeds the retired Wix site, so leave it unchecked.
2. Push that file live from the aoa-web repo:
   `npm run feed -- ../eco-web/public/patch-notes-feed.json` (add `--dry` to check it first).
   It uploads to the DigitalOcean Space, and `https://www.adrullan.online/public/patch-notes-feed.json`
   serves it within a minute. No site release, and no eco-web deploy, is needed.
3. The website's `/patch-notes` page updates on the next site release
   (`npm run content -- --feed <feed URL>` in aoa-web).

The full flow, feed format and gotchas are in aoa-web's
[docs/patch-notes.md](https://github.com/EverCraftOnline/aoa-web/blob/main/docs/patch-notes.md).
This is interim: the notes move to the database later.
