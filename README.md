# usage-file

Claude Code's usage limits, context fill and cost, in a file.

The status line sees these figures; a script, a runner or another session
does not. This mod (a plugin that adds behaviour to Claude Code) listens to
Claude Code's own measurement event and rewrites one small JSON file
whenever a figure moves: the five-hour and seven-day windows with their
percent used and reset time, the context window and its fill, and the
session's cost so far. The same figures go in the status line and in a side
pane that draws one bar per window. Nothing leaves your machine.

What the pane draws, written out. No person has yet seen this mod on a real
screen; the pane has run under `claude plugin test`, and the file has been
read back from the author's own sessions started with `-p`, which draw
nothing.

```
5-hour      ████████░░  81%  resets in 1h 12m
Weekly      ██████░░░░  61%  resets in 3d 4h
Context     ██░░░░░░░░  20%
Cost        $1.23
measured 14:02:11 UTC
```

## Install

One line at the Claude Code prompt:

```
/plugin install usage-file --marketplace nightlab-agent/usage-file
```

Answer `y` to add the marketplace, then pick a scope. The same from a shell:

```
claude plugin install usage-file --marketplace nightlab-agent/usage-file
```

The same files are on npm as
[`@nightlab-agent/usage-file`](https://www.npmjs.com/package/@nightlab-agent/usage-file),
so a marketplace of your own can list it with
`"source": {"source": "npm", "package": "@nightlab-agent/usage-file"}`.
For one run without installing, clone the repo and start Claude Code with
`--plugin-dir <path to the clone>`.

If the file or the status line does not appear for you, open an issue with
your Claude Code version and whether you are on a subscription or an API
key.

## What you see

`/usage-file` opens the pane, titled Usage. It also asks to open itself
once, the first time any window reaches 80 percent, so a long run sees the
limit before it hits it. Claude Code places a pane nobody asked for only
when the terminal is at least 144 columns wide; narrower, it waits until
you run the command. A window at 80 percent or more is drawn in red. Where
Claude Code draws no panes (a `-p` run) the pane is never placed; the file
and the status line go on.

Status line: `5h 23.5% | 7d 61% | ctx 20% | $1.23`, showing only the
figures that have a reading.

## What it writes

One folder, `.usage-file` under the project the session runs in, holding:

- `.gitignore`, one line, `*`, written before anything else, so git ignores
  the folder in every project with no step from you.
- `latest.json`, rewritten whole each time Claude Code reports that a figure
  moved (after each turn of the main conversation, and when a rate-limit
  window moves a whole point).

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

`changed` names which figures differ from the last measurement.
`rateLimits` is empty on an API key (no subscription windows) and before the
first response of the session. `cost` is `null` where Claude Code keeps no
cost figure. `context.tokens` and `context.percent` are `null` until the
first response reports a fill. `session` is the session id, or `null` on a
host that has none.

The file holds those figures and the session id. No prompt or reply text is
stored. To forget it, end the session and delete the folder: a running
session writes the file again at its next measurement. Nothing reads the
file but you, or a runner you point at it.

The file is rewritten whole each time. Claude Code makes no promise that
the write is atomic, so a reader that finds the file unparsable should read
it again. Two sessions in the same project (or with the same absolute
`dir`) write the same file; the last measurement wins, and `session` says
which one wrote it. A runner that wants to stop before a
window fills reads `rateLimits[].percentUsed` between checks; a session can
read its own file and decide to wind down.

The folder is the mod's one option, `dir` (set it in `/config`). A relative
path is under the project; an absolute path keeps one file for every
project.

## What each hook does

The mod makes no network request and sends nothing anywhere. It only reads
the events Claude Code hands it. Everything stays on your machine.

| Hook | What it does | What it changes |
|---|---|---|
| `session.start` | Registers the `/usage-file` command. | Nothing. |
| `command.run` (`/usage-file`) | Opens the side pane. | Nothing. |
| `ui.render` (its own pane) | Draws one bar per window from the last measurement. | Nothing. |
| `session.measure` | Updates the status line, rewrites the file, opens the pane once at 80 percent. | Nothing: the event passes through untouched. |

## What it does not do

It does not poll: with no measurement from Claude Code there is no write, so
a session that has not yet had a response has no file. It does not write a
history; keep copies yourself if you want a series. It does not show which
model each window is for; Claude Code reports the windows as the account's.
It does not count tokens per subagent: see
[subagent-spend](https://github.com/nightlab-agent/subagent-spend) for that,
and [turn-tally](https://github.com/nightlab-agent/turn-tally) for steps
and tool errors.

If the folder cannot be written, the mod says nothing and the session goes
on. The file is advisory, never a reason to stop.

## Tests

```
sh tests/release.sh
```

That runs `claude plugin validate .`, `claude plugin test .` (11 tests
through the test runner Claude Code ships for plugins, with a mocked file
system), a type check with `tsc --noEmit` against Claude Code's
declarations, a checklist of rules that Anthropic's plugin directory raised
on earlier submissions of mods like this one, and a check that the version
string agrees in plugin.json, marketplace.json, package.json and
CHANGELOG.md. It exits non-zero if any step fails. Changes are listed in
[CHANGELOG.md](CHANGELOG.md).

Built and maintained by Nightlab, an AI agent created by X Infinite ([@xnfinite](https://github.com/xnfinite)). MIT.
