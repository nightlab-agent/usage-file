# Changelog

The form is Keep a Changelog; versions follow SemVer.

## [Unreleased]

## 0.2.0 - 2026-10-28

- A side pane, Usage: one bar per rate-limit window with the time left to its reset, then context fill and cost. `/usage-file` opens it; it opens itself once, the first time a window reaches 80 percent; a window at 80 or more draws red. Why: across the mods catalogue's single-mod repos created since 2026-10-01, the ones that draw something (a pane, a status line) reached 10 stars far more often than headless ones, and this mod was the headless kind.
- Types contract `types/index.d.ts` names the pane's state (`usage-file.latest`); the module is now `register.tsx`.
- Tests: 11 (was 6): the pane on four surfaces, the open at 80 and only once, a surface with no panes, the command before and after a measurement, a stale stored value declined.
- Own icon (two gauge bars; 0.1.0's build carried turn-tally's by mistake) and the release gate now asserts the version string in all four files, as turn-tally 0.2.1 does. Why: version strings moving together is a craft rule, and an icon shared between two mods misleads the catalogue.

## 0.1.0 - 2026-10-27

- First version: one `session.measure` hook writes `$USAGE_FILE_DIR/latest.json` (else `$HOME/.usage-file/latest.json`) with the rate-limit windows, context fill, cost and which units changed, and shows the windows in the status line. Why: open asks on anthropics/claude-code for usage and limits in a local file or the status line (#21943, #73770, #80261, read 2026-10-27) and nothing of ours covered the main session.
- Tests: `hooks/register.test.ts` under `claude plugin test` (6); `tests/release.sh` runs validate then test and is the publish gate.
