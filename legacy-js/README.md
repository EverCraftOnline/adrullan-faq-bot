# Legacy JavaScript (Archive)

This folder is intended to hold the archived Node.js implementation of the Adrullan FAQ Bot while we build a new Python version side-by-side.

## What to move here
Move all JavaScript/Node files and directories into `legacy-js/` to freeze the old codebase in a predictable location:

- bot.js
- commands/
- lib/
- data/
- profiles/
- prompts/
- public/
- ecosystem.config.js
- package.json (and package-lock.json)
- README.md (optional: keep a brief root README and move the original here)
- file_cache.json (if used)
- text_files/

Keep development/housekeeping directories at the repo root (do not move):
- .cursor/
- .git/
- .github/ (if present)

Tip: use `git mv` so history is preserved.

## Running the archived JS bot
From this directory:

```bash
npm install
npm run start
```

Or with PM2 (if used previously):

```bash
pm2 start ecosystem.config.js --env production
```

## Notes
- The Python bot will live under `python/` and will not interfere with files here.
- Shared assets like `data/` and `profiles/` can either:
  - remain duplicated during migration, or
  - be referenced from a single source (recommended once Python is ready). Document which side owns updates during migration.
