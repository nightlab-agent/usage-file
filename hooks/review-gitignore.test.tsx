import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'
import type { SessionMeasureInput } from 'claude-code'

// Review tests (s755). The fake file system below knows which spellings name the project (/work) and
// models a symbolic link the way Node does: exists on a link that leads nowhere is false, and a write
// through the link lands at its target.
type On = Parameters<TestBody>[1]
const measurement = (): SessionMeasureInput => ({
  context: { tokens: 40000, window: 200000, percent: 20 },
  rateLimits: [{ kind: 'five_hour', percentUsed: 23.5 }],
  cost: { usd: 1.2 },
  changed: ['context'],
})

const world = (on: On, files: Map<string, string>, links = new Map<string, string>()) => {
  const writes: string[] = []
  const land = (p: string) => links.get(p) ?? p
  on('fs.exists', (_, e) => ({ value: files.has(land(e.path)) }))
  on('fs.write', (_, e) => {
    writes.push(land(e.path))
    files.set(land(e.path), e.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  return writes
}

// the project at /work has no .gitignore of its own (a new repo, or one ignored from .git/info/exclude)
test('review: dir spelled as the project\'s absolute path writes * into the project\'s own .gitignore', { options: { dir: '/work' } }, async ($, on) => {
  const files = new Map<string, string>()
  const writes = world(on, files)
  await $.session.measure(measurement())
  expect(writes.filter(w => w.endsWith('.gitignore'))).toEqual([])
})

test('review: dir spelled ./. (still the project) writes * into the project\'s .gitignore', { options: { dir: './.' } }, async ($, on) => {
  const files = new Map<string, string>()
  const writes = world(on, files)
  await $.session.measure(measurement())
  expect(writes.filter(w => w.endsWith('.gitignore'))).toEqual([])
})

test('comparison: dir spelled . writes no .gitignore into the project', { options: { dir: '.' } }, async ($, on) => {
  const files = new Map<string, string>()
  const writes = world(on, files)
  await $.session.measure(measurement())
  expect(writes.filter(w => w.endsWith('.gitignore'))).toEqual([])
})

// a .gitignore of the user's that is a link (a dotfiles manager) whose target is not there yet
test('review: a .gitignore that is a link leading nowhere is written through, creating its target with *', { options: { dir: '/home/u/notes' } }, async ($, on) => {
  const files = new Map<string, string>()
  const links = new Map([['/home/u/notes/.gitignore', '/home/u/dotfiles/notes.gitignore']])
  const writes = world(on, files, links)
  await $.session.measure(measurement())
  expect(files.has('/home/u/dotfiles/notes.gitignore')).toBe(false)
  expect(writes).toEqual(['/home/u/notes/latest.json'])
})

test('comparison: a .gitignore that is a link to a file that is there is left as it is', { options: { dir: '/home/u/notes' } }, async ($, on) => {
  const files = new Map([['/home/u/dotfiles/notes.gitignore', 'build/\n']])
  const links = new Map([['/home/u/notes/.gitignore', '/home/u/dotfiles/notes.gitignore']])
  const writes = world(on, files, links)
  await $.session.measure(measurement())
  expect(files.get('/home/u/dotfiles/notes.gitignore')).toBe('build/\n')
  expect(writes).toEqual(['/home/u/notes/latest.json'])
})
