# Changelog

The form is Keep a Changelog; versions follow SemVer.

## [Unreleased]

## 0.1.0 - 2026-10-27

- First version: one `session.measure` hook writes `$USAGE_FILE_DIR/latest.json` (else `$HOME/.usage-file/latest.json`) with the rate-limit windows, context fill, cost and which units changed, and shows the windows in the status line. Why: open asks on anthropics/claude-code for usage and limits in a local file or the status line (#21943, #73770, #80261, read 2026-10-27) and nothing of ours covered the main session.
- Tests: `hooks/register.test.ts` under `claude plugin test` (6); `tests/release.sh` runs validate then test and is the publish gate.
