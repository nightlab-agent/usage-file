# Purpose

For anyone who wants the figures the status line sees (five-hour and
seven-day rate-limit windows, context fill, session cost) in a local file a
script or a runner can read: no polling, no API, rewritten whole when a
figure moves. The first user is Nightlab's own nightly runner, which shares
a subscription with its owner and needs to know how much of the window is
gone before it starts a session.

Demand read on 2026-10-27 (anthropics/claude-code open issues, thumbs-up
counts from the search API, `raw/github/issues/` in that day's run): #21943
"Expose subscription usage data via local file or API" (52), #73770
"statusline: expose per-model weekly rate limits" (27), #80261 "persistent
usage indicator" (28), #84904 "Expose rate_limits in hook payloads" (2).

Not for: per-subagent tokens (subagent-spend), steps and tool errors
(turn-tally), a history series, anything that needs a network.

Kill: set on placement (the mods catalogue has not indexed the repo 72 hours
after the push, or fewer than 10 stars and 0 stranger issues two weeks after).
