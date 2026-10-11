---
name: patch-notes
description: Draft and publish a patch's notes with this bot - !patchnotes from Discord, edit in the dashboard, publish to Discord and the eco-web feed file, then hand the feed to aoa-web's npm run feed. Use when the user has a new patch to write up, asks how patch notes get to the patcher/game/site, or a draft, image upload or feed sync misbehaves.
---

# Patch notes (bot side)

The bot turns the #patch-notes Discord channel into a draft, then into the patch-notes feed file. The
feed reaches players through aoa-web; the whole flow is in aoa-web's `docs/patch-notes.md`
(`E:\EverCraft Online\aoa-web\docs\patch-notes.md`). This repo's `PATCH_NOTES_MODULE_README.md` covers
formatting, batching and the env vars.

## Steps

1. **Discord.** EnigmaFactory posts the version number (e.g. `0.10.78`) in #patch-notes
   (`PATCH_NOTES_CHANNEL_ID` in `commands/patchNotesCommand.js`), then the notes and screenshots.
2. **Draft.** With the bot running locally (`npm start`, or pm2 via `ecosystem.config.js`), send
   `!patchnotes -withimages`. It collects every message after the version post, formats them with
   Claude (`lib/patchNotesAiFormatter.js`, batched past 150 notes), downloads screenshots to
   `data/patch-notes-images/<ver>/`, uploads them to Wix Media when `WIX_API_KEY`/`WIX_SITE_ID` are set,
   and saves `data/patch-notes-drafts/draft-<ver>.json`. Re-running replaces the draft and loses manual
   edits, so warn the user before re-running on an edited draft.
3. **Edit.** `http://localhost:3000/dashboard/patchnotes/<ver>` (port `HEALTH_CHECK_PORT`).
4. **Publish.** In the dialog: Discord (posts the notes), **eco-web feed** (the one players see), and
   Wix CMS, which is checked by default but feeds the retired Wix site, so uncheck it. The feed option
   runs `lib/syncEcoWebPatchFeed.js`, which upserts the version at the top of
   `..\eco-web\public\patch-notes-feed.json` and refuses any other target path.
5. **Go live.** In aoa-web: `npm run feed -- ../eco-web/public/patch-notes-feed.json` (dry-run first
   with `--dry`). That's aoa-web's `patch-notes` skill; nothing here deploys the feed.

## The feed item this bot writes

`buildFeedItem()` in `lib/syncEcoWebPatchFeed.js`: `version`, `releaseDate` ("Sep 30, 2026, 8:58 PM"),
`displayDate` ("September 30, 2026"), `body`, `versionOrder`, `_id`, `_createdDate`, `_updatedDate`.
`body` comes from `lib/patchNotesFormatter.js`'s `generateHTMLWithImages`, which emits only
`patch-header2`, `patch-note`, `patch-image` and `spacer-N` divs. Those are the only classes the
patcher renders, so keep any formatter change inside them.

## Gotchas

- A screenshot whose Wix upload failed keeps its Discord attachment URL, which expires within days.
  Check the draft's images have `wixUrl` before publishing; `scripts/replaceDiscordUrlsWithWix.js` and
  `scripts/uploadExistingImagesToWix.js` repair older ones.
- The feed path is relative to this repo, so the checkout layout matters
  (`E:\EverCraft Online\adrullan-faq-bot` next to `E:\EverCraft Online\eco-web`).
- Interim setup: patch notes move to the database later, and screenshots move off Wix to the Space.
