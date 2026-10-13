## Command Permissions Overview

This bot now gates every `!` command through a central, config-driven permissions layer.

### Config location
- `config/permissions.json` holds all rules.
- Defaults apply when a command has no explicit rule; current defaults:
  - `allowIfNoRule: false` (new commands are denied until added)
  - `allowDM: true`
  - `allowedChannels: ["#general-discussion", "#dev-updates", "#help"]`

### Rule fields (per command)
- `allowDM`: allow in DMs (bool).
- `channels`: list of channel names or IDs allowed (empty = any channel). Names are matched literally (case-insensitive after the leading `#` is trimmed).
- `roles`: Discord role names allowed (any match passes).
- `users`: Discord user IDs allowed.
- `adminOnly`: optional; if true, `configLoader.isAdmin` or `ADMIN_USER_ID` env bypasses other checks.
- `reason`: optional custom denial message.

### Evaluation order
1) Load rule; if missing, use defaults (`allowIfNoRule`).
2) DM check (deny if DM and not allowed).
3) `adminOnly` bypass if enabled and caller is admin.
4) Channel check (skipped in DM). If channel not in `channels` (or default list), deny.
5) User/role check. If both lists are empty, pass; otherwise require user ID match or role match.

### How to add/adjust commands
1) Add or update an entry under `commands.<name>` in `config/permissions.json`.
2) If adding a new bot command, ensure you add a rule; otherwise it will be denied because `allowIfNoRule` is false.
3) Deploy/restart the bot to pick up the updated config.

### Notes & tips
- Channel matching supports IDs or names (case-insensitive, `#` optional). Rename-aware updates are manual.
- Existing in-command admin checks still run; align `permissions.json` with command-level expectations to avoid confusing double-gates.
- To force guild-only usage, set `allowDM: false` in defaults and override per command as needed.

