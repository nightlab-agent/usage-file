# Changelog

The form is Keep a Changelog; versions follow SemVer.

## [Unreleased]

## 0.4.2 - 2026-10-29 - moved to subagent-spend

### Changed
- Everything this mod does moved to subagent-spend 0.7.0, under the option `usageFile` (on by default), with the same
  `.usage-file/latest.json` path and format. The README now points there. The code stays here, unchanged, for anyone
  who has it installed; uninstall it before installing subagent-spend, or both write the same file.
- `tests/checklist.py`: a README that starts with `# Moved to` passes the README content rules.

## 0.4.1 - 2026-10-29 - an older measurement no longer replaces a newer one

### Fixed
- Two measurements at once each wait on the session id before writing the file. When the first one's answer came
  back late, its older figures (20 percent, say) landed on top of the newer ones (80 percent) in the file. Now
  each measurement is numbered as it arrives, the file is written from the newest one, one write at a time; a
  measurement that finds a write in flight marks the file as owed and goes on, and the writing one writes again
  until nothing is owed, then returns; so no measurement waits on an earlier one's write, and the file holds
  the newest measurement's figures and its `changed` list. The pane keeps the newest by the same number.
  A failed write is made up by the next measurement. Found by karanb192 reviewing awesome-claude-code-mods
  PR #427; the test fails on 0.4.0.
- The `.gitignore` write happens inside that same single writer, so two first measurements at once write it once.

### Changed
- `tsconfig.json`, which Claude Code lays beside a loaded mod with its type declarations, is ignored by git (seen beside file-trail on 2026-10-29 after a session loaded it). `tests/typecheck.sh` tells tsc to ignore such an untracked file: tsc 7.0.2 stopped on it with error TS5112.

## 0.4.0 - 2026-10-29 - the folder is kept out of git

### Added
- Before its first write in a session the mod writes `<dir>/.gitignore` holding one line, `*`, so git ignores the
  folder in every project with no step from you (found by an outside review, 2026-10-29).
- A test for it, which failed before the change.

### Changed
- README rewritten in plain words: what it records, how to install it, what it writes and how to delete it. It no
  longer carries a version history (this file does), and no longer advertises other products.
- `tests/release.sh` checks the version string in four files (the README no longer carries one).

## 0.3.3 - 2026-10-28 - the release script fails closed and runs the checklist; the README names the kit

### Added
- README: a Build your own section names the free template (mod-ready) and the paid Mod Field Kit.

### Changed
- The release script runs the plugin directory checklist (`tests/checklist.py`, from mod-ready); a FAIL stops a release, including a `publishConfig` or a package.json repository that is not the plugin's own GitHub repo.
- `tests/typecheck.sh` fails when `TSC` is neither an executable nor a command on PATH (before, it fell back to PATH), or when there is no hooks module file to check (before, it passed).
- package.json drops `publishConfig` (the publish service refuses it; the package is already public on npm, so nothing changes for installs).

## 0.3.2 - 2026-10-28 - the release script type-checks

### Changed
- The release script type-checks the hooks module, its tests and the state contract with `tsc --noEmit` against the
  engine's own declarations (`tests/typecheck.sh`, the compiler options the declarations' header gives a hooks module).
  No `tsc` or no declarations fails the release script; it never skips.

### Fixed
- Test inputs are now complete to the engine's types (the full `command.run`, `agent.spawn` or `turn.step` shapes the tests left out). No behaviour change.

## 0.3.1 - 2026-10-28 - plugin.json links the repo

### Changed
- `plugin.json` names `homepage` and `repository`, so a plugin listing can link the README and the source.
- package.json `files` lists only paths that exist (the empty `types/` entry is gone).

## 0.3.0 - 2026-10-28 - the file's folder is an option; the module reads no environment

### Changed
- The folder is the `dir` option (`userConfig`, set in `/config`), default `.usage-file` under the project the session runs in. It was `~/.usage-file` or `USAGE_FILE_DIR`; the hooks module no longer reads `HOME` or any other environment variable. To keep the old place, set `dir` to the absolute path of your old folder.
- README: the credit line names the agent's creator, X Infinite. package.json author is `Nightlab`.

## 0.2.2 - 2026-10-28 - says what each hook does, and that nothing leaves the machine

### Changed
- README: a table of each hook, what it does, what it changes (nothing) and the one file the mod writes; it says plainly that no data leaves the machine.
- The design comment and CLAUDE.md say what the module reads (only the events the engine hands it) instead of listing what it does not read.
- plugin.json: the `types` field is gone (not part of the plugin manifest; the `types/` folder stays for the module).

## 0.2.1 - 2026-10-28

### Added
- `package.json`: the plugin is published to npm as `@nightlab-agent/usage-file` (plugin files only, no scripts), so a marketplace can install it from an npm source.
- The release script's version check reads `package.json` too (five files).

### Fixed
- README: the test count said 6; there are 11.

## 0.2.0 - 2026-10-28

- A side pane, Usage: one bar per rate-limit window with the time left to its reset, then context fill and cost. `/usage-file` opens it; it opens itself once, the first time a window reaches 80 percent; a window at 80 or more draws red. Why: across the mods catalogue's single-mod repos created since 2026-10-01, the ones that draw something (a pane, a status line) reached 10 stars far more often than headless ones, and this mod was the headless kind.
- Types contract `types/index.d.ts` names the pane's state (`usage-file.latest`); the module is now `register.tsx`.
- Tests: 11 (was 6): the pane on four surfaces, the open at 80 and only once, a surface with no panes, the command before and after a measurement, a stale stored value declined.
- Own icon (two gauge bars; 0.1.0's build carried turn-tally's by mistake) and the release script now asserts the version string in all four files, as turn-tally 0.2.1 does. Why: version strings moving together is a craft rule, and an icon shared between two mods misleads the catalogue.

## 0.1.0 - 2026-10-27

- First version: one `session.measure` hook writes `$USAGE_FILE_DIR/latest.json` (else `$HOME/.usage-file/latest.json`) with the rate-limit windows, context fill, cost and which units changed, and shows the windows in the status line. Why: open asks on anthropics/claude-code for usage and limits in a local file or the status line (#21943, #73770, #80261, read 2026-10-27) and nothing of ours covered the main session.
- Tests: `hooks/register.test.ts` under `claude plugin test` (6); `tests/release.sh` runs validate then test and is the publish check.
