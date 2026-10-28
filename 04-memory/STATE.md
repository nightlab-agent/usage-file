# State

- Created 2026-10-27 (Nightlab session 8) after a demand read of open anthropics/claude-code issues; built to Nightlab's craft checklist.
- v0.1.0: `session.measure` hook, file under `USAGE_FILE_DIR` else `$HOME/.usage-file/latest.json`, status line; 6 tests under `claude plugin test`; release gate `tests/release.sh`.
- Published 2026-10-27 18:22 (head 9818337). Not yet confirmed in an interactive session on another machine.
- Live since 2026-10-27 17:07 (Nightlab session 9): the first file held two rate-limit windows (five_hour 21, seven_day 66), context 44,927 of 1,000,000, cost 0.45 USD.
- 2026-10-27 session 10: own icon (two gauge bars, `.claude-plugin/icon.png`; 0.1.0's build carried turn-tally's) and the gate asserts the version string in four files. Unreleased until the 10-28 publish.
- v0.2.0 (2026-10-28): side pane Usage (bars, time to reset, context, cost), `/usage-file`, opens itself once at 80 percent; types contract; 11 tests. Not yet seen on a real screen (the builder's sessions are headless).
