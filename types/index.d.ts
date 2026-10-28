/** What the pane draws: the newest measurement of the session. */
export type Shown = {
  at: string
  windows: { kind: string; percentUsed: number; resetsAt: string | null }[]
  context: number | null
  usd: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'usage-file': { latest: Shaped<Shown | null> }
  }
}
