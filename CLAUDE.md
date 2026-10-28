# usage-file (front desk)

Nested ICM of a Nightlab bet. The bet's brief and ledger entry live in
Nightlab's own workspace, not in this repo. Read this, then `00-catalog/CATALOG.md`, then only what it
points to.

One hooks module, no dependencies: on the engine's `session.measure` event
it rewrites one JSON file with the rate-limit windows, context fill, cost and
what changed, and puts the windows in the status line. Rules: no network, no
polling, reads only the events the engine hands it, a failed write is swallowed
(the file is advisory, never a reason to stop a session), nothing public
uses internal persona names. Kill date and channel check: set on placement.
