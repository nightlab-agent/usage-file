import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionMeasureInput } from 'claude-code'

import type { Shown } from '../types'

// usage-file: the session's rate-limit windows, context fill and cost, as the
// status line has them, written to one local file whenever they move.
//
// The engine raises `session.measure` after each main-thread turn and when a
// rate-limit window moves a whole point; it carries the same figures
// `$.session.usage()` answers. This module writes them as one JSON object
// (rewritten whole, so a reader never sees a partial file) and shows the
// windows in the status line. A runner, a script or another session reads the
// file; nothing has to poll an API.
//
// DESIGN NOTE, deliberately narrow: it never denies, never rewrites an event,
// never polls, reads only the events the engine hands it and sends
// nothing off the machine. A failed write is swallowed: the file is advisory, and a gauge
// that stops the engine would be worse than no gauge. It speaks only when the
// engine says a unit changed; steady state is one status line and one file.
//
// It also draws the same figures in a side pane, one bar per window with the
// time left to its reset. /usage-file opens it; it opens itself once, the first
// time any window reaches OPEN_AT percent, so a long run sees the wall coming.

const LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }
const NAME: Record<string, string> = { five_hour: '5-hour', seven_day: 'Weekly', spend_limit: 'Spend limit' }

const PANE = 'usage-file'
const TITLE = 'Usage'
export const OPEN_AT = 80
let opened = false

// What the pane draws: the newest measurement. Change the tag when Shown's
// fields change: it declines what an earlier version stored.
const shown = atom({ plugin: 'usage-file', key: 'latest' } as const, null as Shown | null, { shape: 'latest-1' })

/** A ten-cell bar: `██████░░░░` for 60. */
export const bar = (pct: number) => {
  const full = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return '\u2588'.repeat(full) + '\u2591'.repeat(10 - full)
}

/** Time left to a reset: `2h 05m`, `3d 4h`, `now`; empty when the engine gave no reset time. */
export const untilText = (resetsAt: string | null, now: Date) => {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now.getTime()
  if (Number.isNaN(ms)) return ''
  if (ms <= 0) return 'now'
  const min = Math.floor(ms / 60000)
  if (min >= 2880) return `${Math.floor(min / 1440)}d ${Math.floor((min % 1440) / 60)}h`
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

/** One pane line per window: `5-hour   ██░░░░░░░░  23.5%  resets in 2h 05m`. */
export const paneLines = (s: Shown, now: Date) =>
  s.windows.map(w => {
    const left = untilText(w.resetsAt, now)
    return `${(NAME[w.kind] ?? w.kind).padEnd(11)} ${bar(w.percentUsed)}  ${w.percentUsed}%${left ? `  resets in ${left}` : ''}`
  })

/** The file's whole text: one JSON object, rewritten whole on every measurement. */
export const fileText = (e: SessionMeasureInput, session: string, now: Date) =>
  JSON.stringify(
    {
      at: now.toISOString(),
      session: session || null,
      changed: e.changed,
      context: {
        tokens: e.context.tokens ?? null,
        window: e.context.window,
        percent: e.context.percent ?? null,
      },
      rateLimits: e.rateLimits.map(w => ({
        kind: w.kind,
        percentUsed: w.percentUsed,
        resetsAt: w.resetsAt ?? null,
      })),
      cost: e.cost ? { usd: e.cost.usd } : null,
    },
    null,
    2,
  ) + '\n'

/** The status line: only the figures that have a reading; undefined when none has. */
export const statusText = (e: SessionMeasureInput) => {
  const parts = e.rateLimits.map(w => `${LABEL[w.kind] ?? w.kind} ${w.percentUsed}%`)
  if (e.context.percent !== undefined) parts.push(`ctx ${e.context.percent}%`)
  if (e.cost) parts.push(`$${e.cost.usd.toFixed(2)}`)
  return parts.length ? parts.join(' | ') : undefined
}

/** The status line again, from what the pane holds (for the command's answer). */
const shownStatus = (s: Shown) =>
  statusText({
    rateLimits: s.windows.map(w => ({ kind: w.kind, percentUsed: w.percentUsed })),
    context: { window: 0, percent: s.context ?? undefined },
    cost: s.usd === null ? undefined : { usd: s.usd },
    changed: [],
  } as SessionMeasureInput) ?? 'No figures yet.'

/** The file's state in this session: whether a write is in flight, whether one is owed, whether
 * `<dir>/.gitignore` has been written, and the newest measurement to write. */
type UsageFile = { writing: boolean; owed: boolean; ignore: boolean; newest: { e: SessionMeasureInput; session: string } | null }

/** One write at a time, always from the newest measurement. Two measurements can wait at once, on
 * `$.session.id()` or on a write; if the earlier one's answer came back late, its figures would land on
 * top of the newer ones. A measurement that finds a write in flight marks the file as owed and goes on;
 * the writing one writes again, from the newest measurement, until nothing is owed. A failed write is
 * made up by the next measurement. Before the first write of a session: `<dir>/.gitignore` holding `*`,
 * so git ignores the folder in every project with no step from the user. */
async function writeUsage($: EngineInterface, dir: string, file: UsageFile) {
  if (file.writing) {
    file.owed = true
    return
  }
  file.writing = true
  try {
    do {
      file.owed = false
      if (!file.ignore) {
        await $.fs.write(`${dir}/.gitignore`, '*\n')
        file.ignore = true
      }
      if (file.newest) await $.fs.write(`${dir}/latest.json`, fileText(file.newest.e, file.newest.session, new Date()))
    } while (file.owed)
  } finally {
    file.writing = false
  }
}

export const register: Register = (on, options) => {
  // Numbers each measurement in the order the engine raised them; the file is written from the newest one.
  let seq = 0
  const file: UsageFile = { writing: false, owed: false, ignore: false, newest: null }

  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({ name: 'usage-file', description: 'Show the rate-limit windows, context and cost of this session, in a pane' })
    } catch {
      // a surface with no commands; the pane still opens at OPEN_AT
    }
    return next(e)
  })

  on('command.run', { command: 'usage-file' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    const s = await read($, shown)
    return { text: `Usage pane opened. ${s ? shownStatus(s) : 'No measurement yet in this session.'}` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const s = await read($, shown)
    if (!s) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No measurement yet in this session.</Text>
        </Box>
      )
    }
    const now = new Date()
    return (
      <Box flexDirection="column">
        {s.windows.length === 0 && <Text dimColor>No rate-limit windows (not on a subscription).</Text>}
        {paneLines(s, now).map((line, i) => (
          <Text color={s.windows[i]!.percentUsed >= OPEN_AT ? 'red' : undefined}>{line}</Text>
        ))}
        {s.context !== null && <Text>{`Context     ${bar(s.context)}  ${s.context}%`}</Text>}
        {s.usd !== null && <Text>{`Cost        $${s.usd.toFixed(2)}`}</Text>}
        <Text dimColor>{`measured ${s.at.slice(11, 19)} UTC`}</Text>
      </Box>
    )
  })

  on('session.measure', async ($, e, next) => {
    const mine = ++seq
    try {
      $.ui.status(statusText(e))
    } catch {
      // a surface with no status line; the file still gets written
    }
    try {
      // a newer measurement already shown keeps the pane; this one's figures are behind it
      await update($, shown, s => (mine !== seq ? s : {
        at: new Date().toISOString(),
        windows: e.rateLimits.map(w => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt ?? null })),
        context: e.context.percent ?? null,
        usd: e.cost ? e.cost.usd : null,
      }))
    } catch {
      // the pane misses one redraw; the file is the record
    }
    if (!opened && e.rateLimits.some(w => w.percentUsed >= OPEN_AT)) {
      opened = true
      // a surface that seats no panes refuses; the status line and file go on
      $.ui.open({ id: PANE, title: TITLE }).catch(() => undefined)
    }
    try {
      const dir = String(options.dir || '.usage-file')
      let session = ''
      try {
        session = await $.session.id()
      } catch {
        // no session id on this host: the file says null
      }
      // a newer measurement already came while this one waited; its figures are the ones to write
      if (mine === seq) file.newest = { e, session }
      await writeUsage($, dir, file)
    } catch {
      // unwritable folder: the file is advisory, the session goes on
    }
    return next(e)
  })
}
