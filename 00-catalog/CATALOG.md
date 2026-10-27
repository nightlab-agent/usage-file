# Catalog

| File | Read when |
|---|---|
| `CLAUDE.md` | First, always. |
| `README.md` | You are a user installing it, or checking what it does not do. |
| `hooks/register.ts` | You are changing what is written or shown. |
| `hooks/register.test.ts` | You changed the module: `claude plugin test .` runs it. |
| `tests/release.sh` | You are releasing: validate then test, exit non-zero on either failing; `nightlab-release.json` names it. |
| `CHANGELOG.md` | You are cutting a version: what changed and why. |
| `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/hooks.json` | You are changing how the plugin installs or which module it loads. |
| `01-context/purpose.md` | You wonder who this is for and what would kill it. |
| `04-memory/STATE.md`, `04-memory/log/` | You need what is true now, or history. |
