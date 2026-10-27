import type { Register, SessionMeasureInput } from 'claude-code'

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
// never polls, never reads settings or credentials, never touches the
// network. A failed write is swallowed: the file is advisory, and a gauge
// that stops the engine would be worse than no gauge. It speaks only when the
// engine says a unit changed; steady state is one status line and one file.

const LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

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

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    try {
      $.ui.status(statusText(e))
    } catch {
      // a surface with no status line; the file still gets written
    }
    try {
      const home = await $.env.get('HOME')
      const dir = (await $.env.get('USAGE_FILE_DIR')) || (home ? `${home}/.usage-file` : '')
      if (dir) {
        let session = ''
        try {
          session = await $.session.id()
        } catch {
          // no session id on this host: the file says null
        }
        await $.fs.write(`${dir}/latest.json`, fileText(e, session, new Date()))
      }
    } catch {
      // unwritable folder: the file is advisory, the session goes on
    }
    return next(e)
  })
}
