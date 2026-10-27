import { expect, mock, test } from 'claude-code/testing'
import type { SessionMeasureInput } from 'claude-code'

// Each test stands for the engine beneath the plugin: it answers `$.fs.write`,
// `$.ui.status`, `$.env.get` and `$.session.id`, raises `session.measure`,
// and reads what the plugin wrote. Nothing here touches the real file system.

type Written = { path: string; text: string }
type On = Parameters<Parameters<typeof test>[1]>[1]
type Dollar = Parameters<Parameters<typeof test>[1]>[0]

const world = (on: On, env: Record<string, string>, opts: { writeFails?: boolean; noSession?: boolean } = {}) => {
  const writes: Written[] = []
  const statuses: (string | undefined)[] = []
  mock.env(on, env)
  on('fs.write', (_, e) => {
    if (opts.writeFails) throw new Error('read-only file system')
    writes.push({ path: e.path, text: e.text })
    return { value: undefined }
  })
  on('ui.status', (_, e) => {
    statuses.push(e.text)
    return { value: undefined }
  })
  on('session.id', () => {
    if (opts.noSession) throw new Error('no session')
    return { value: 'sess-1' }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  return { writes, statuses }
}

const measurement = (over: Partial<SessionMeasureInput> = {}): SessionMeasureInput => ({
  context: { tokens: 40000, window: 200000, percent: 20 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-27T22:00:00Z' },
    { kind: 'seven_day', percentUsed: 61 },
  ],
  cost: { usd: 1.234 },
  changed: ['context', 'rateLimits', 'cost'],
  ...over,
})

const parsed = (w: Written) => JSON.parse(w.text) as Record<string, any>

test('off a subscription (no rate-limit windows) the file is still written, with an empty list and no window in the status line', async ($, on) => {
  const { writes, statuses } = world(on, { USAGE_FILE_DIR: '/usage', HOME: '/home/someone' })
  await $.session.measure(measurement({ rateLimits: [], cost: undefined, changed: ['context'] }))
  expect(writes.length).toBe(1)
  const got = parsed(writes[0]!)
  expect(got.rateLimits.length).toBe(0)
  expect(got.cost).toBe(null)
  expect(statuses.at(-1)).toBe('ctx 20%')
})

test('a failed write does not fail the measurement and still updates the status line', async ($, on) => {
  const { writes, statuses } = world(on, { USAGE_FILE_DIR: '/nowhere' }, { writeFails: true })
  const r = await $.session.measure(measurement())
  expect(writes.length).toBe(0)
  expect(r.changed.length).toBe(3)
  expect(statuses.at(-1)).toBe('5h 23.5% | 7d 61% | ctx 20% | $1.23')
})

test('without HOME and without USAGE_FILE_DIR nothing is written and the session goes on', async ($, on) => {
  const { writes } = world(on, {})
  const r = await $.session.measure(measurement())
  expect(writes.length).toBe(0)
  expect(r.changed.length).toBe(3)
})

test('a host with no session id writes the file with session null', async ($, on) => {
  const { writes } = world(on, { USAGE_FILE_DIR: '/usage' }, { noSession: true })
  await $.session.measure(measurement())
  expect(parsed(writes[0]!).session).toBe(null)
})

test('one measurement writes one JSON file under USAGE_FILE_DIR with the windows, the context, the cost and what changed', async ($, on) => {
  const { writes, statuses } = world(on, { USAGE_FILE_DIR: '/usage', HOME: '/home/someone' })
  await $.session.measure(measurement())
  expect(writes.length).toBe(1)
  expect(writes[0]!.path).toBe('/usage/latest.json')
  const got = parsed(writes[0]!)
  expect(got.session).toBe('sess-1')
  expect(got.rateLimits[0].kind).toBe('five_hour')
  expect(got.rateLimits[0].percentUsed).toBe(23.5)
  expect(got.rateLimits[0].resetsAt).toBe('2026-10-27T22:00:00Z')
  expect(got.rateLimits[1].resetsAt).toBe(null)
  expect(got.context.percent).toBe(20)
  expect(got.context.window).toBe(200000)
  expect(got.cost.usd).toBe(1.234)
  expect(got.changed.length).toBe(3)
  expect(/^\d{4}-\d{2}-\d{2}T/.test(got.at)).toBe(true)
  expect(writes[0]!.text.endsWith('}\n')).toBe(true)
  expect(statuses.at(-1)).toBe('5h 23.5% | 7d 61% | ctx 20% | $1.23')
})

test('without USAGE_FILE_DIR the file goes under $HOME/.usage-file/, and a second measurement rewrites it whole', async ($, on) => {
  const { writes } = world(on, { HOME: '/home/someone' })
  await $.session.measure(measurement())
  await $.session.measure(measurement({ context: { window: 200000, percent: 35 }, changed: ['context'] }))
  expect(writes.length).toBe(2)
  expect(writes[0]!.path).toBe('/home/someone/.usage-file/latest.json')
  expect(writes[1]!.path).toBe('/home/someone/.usage-file/latest.json')
  const got = parsed(writes[1]!)
  expect(got.context.percent).toBe(35)
  expect(got.context.tokens).toBe(null)
  expect(got.changed.length).toBe(1)
})
