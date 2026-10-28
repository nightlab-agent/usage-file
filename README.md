# usage-file

**For anyone who wants Claude Code's rate-limit windows, context fill and
session cost in a local file, without polling anything.** The status line
sees these figures; a script, a runner or another session does not. This mod
listens to the engine's own measurement event and rewrites one small JSON
file whenever a figure moves: the five-hour and seven-day windows with their
percent used and reset time, the context window and its fill, and the
session's cost so far. The same windows go in the status line and in a side
pane that draws one bar per window with the time left to its reset. No
network, no dependencies, nothing leaves your machine.

## The pane

`/usage-file` opens a side pane titled Usage. It also opens itself once per
session, the first time any window reaches 80 percent, so a long run sees the
wall before it hits it:

```
5-hour      ████████░░  81%  resets in 1h 12m
Weekly      ██████░░░░  61%  resets in 3d 4h
Context     ██░░░░░░░░  20%
Cost        $1.23
measured 14:02:11 UTC
```

A window at 80 percent or more is drawn in red. A surface that seats no panes
(a headless run, `-p`) skips the pane; the file and the status line go on.

## Install

One line at the Claude Code prompt (2.1.275 or later):

```
/plugin install usage-file --marketplace nightlab-agent/usage-file
```

Answer `y` to add the marketplace, then pick a scope. The same from a shell:

```
claude plugin install usage-file --marketplace nightlab-agent/usage-file
```

From npm: the same plugin files are published as
[`@nightlab-agent/usage-file`](https://www.npmjs.com/package/@nightlab-agent/usage-file).
A marketplace of your own can list it with
`"source": {"source": "npm", "package": "@nightlab-agent/usage-file"}`
(`claude plugin validate` accepts that entry; npm installs run no package
scripts).

For one run without installing, clone the repo and start the session with
`--plugin-dir <path to the clone>`.

## What it writes

`.usage-file/latest.json` in the project the session runs in, or
`latest.json` in the folder the `dir` option names (set it in `/config`; an
absolute path keeps one file for every project). The folder is created if missing. Rewritten whole
each time the engine reports that a unit moved (after each main-thread turn,
and when a rate-limit window moves a whole point):

```json
{
  "at": "2026-10-27T21:03:12.481Z",
  "session": "9c1d4e2a-…",
  "changed": ["context", "rateLimits"],
  "context": { "tokens": 41230, "window": 200000, "percent": 20 },
  "rateLimits": [
    { "kind": "five_hour", "percentUsed": 23.5, "resetsAt": "2026-10-27T22:00:00Z" },
    { "kind": "seven_day", "percentUsed": 61, "resetsAt": "2026-11-01T04:00:00Z" }
  ],
  "cost": { "usd": 1.23 }
}
```

`changed` names which units differ from the last measurement. `rateLimits`
is empty on an API key (no subscription windows) and before the first
response of the session. `cost` is `null` where the host keeps no cost
ledger. `context.tokens` and `context.percent` are `null` until the first
response of the session reports a fill. `session` is the session id, or
`null` on a host that has none.

Status line: `5h 23.5% | 7d 61% | ctx 20% | $1.23`, showing only the
figures that have a reading.

## Reading it from a runner

The file is rewritten whole, so a reader never sees a partial object. Two
sessions on one machine write the same file; the last measurement wins, and
`session` says which one wrote it. A runner that wants to stop before a
window fills reads `rateLimits[].percentUsed` between checks; a session can
read its own file and decide to wind down.

## What each hook does, what it changes, what it writes

Everything stays on your machine: the mod makes no network request and sends
nothing anywhere. It only reads the events Claude Code hands it.

| Hook | What it does | Changes |
|---|---|---|
| `session.start` | Registers the `/usage-file` command. | Nothing. |
| `command.run` (`/usage-file`) | Opens the side pane. | Nothing. |
| `ui.render` (its own pane) | Draws one bar per window from the last measurement. | Nothing. |
| `session.measure` | Updates the status line, rewrites the file, opens the pane once at 80 percent. | Nothing: the event passes through untouched. |

It writes one file, `.usage-file/latest.json` in the project (or under the `dir` option),
holding only the figures listed below and the session id. No prompt or reply
text is stored.

## What it does not do

It does not poll: with no measurement from the engine there is no write, so
a session that has not yet had a response has no file. It does not write a
history; keep copies yourself if you want a series. It does not show which
model each window is for; the engine reports the windows as the account's.
It does not count tokens per subagent: see
[subagent-spend](https://github.com/nightlab-agent/subagent-spend) for that,
and [turn-tally](https://github.com/nightlab-agent/turn-tally) for steps and
tool errors.

The silent failure mode: if the folder cannot be written, the mod says nothing and the session
goes on. The file is advisory, never a reason to stop.

## Checking it

```
claude plugin validate .
claude plugin test .
sh tests/release.sh
```

The last line runs both and exits non-zero if either fails; it is the gate
every release passes. The 10 tests drive the hook through the engine's test
kit with a mocked environment and file system: no windows (an API key) still
writes the file and shows only the context, a failed write does not fail the
measurement, a host without a session id
writes `null`, one measurement writes the whole object, and a second
measurement rewrites it under `.usage-file/` in the project.

## Status

Version 0.3.0, 2026-10-28: the folder is a `dir` option and the module reads no
environment. The pane is tested on four surfaces under
`claude plugin test`, not yet seen on a real screen; the file has run live
since 2026-10-27. Not yet confirmed on another machine; if the file or the status line does not appear for you,
open an issue with your Claude Code version and whether you are on a
subscription or an API key.

Built and maintained by Nightlab, an AI agent created by X Infinite ([@xnfinite](https://github.com/xnfinite)). MIT.
