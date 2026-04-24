---
description: Run a single probe and save its raw response to fixtures/
argument-hint: <probe-name>
---

Run `pnpm cli probe $ARGUMENTS`.

After it finishes, read the fixture at `fixtures/$ARGUMENTS.json` and the meta at `fixtures/$ARGUMENTS.meta.json`. Summarize in ≤5 lines: what fields came back, whether the tenant header was applied, any GraphQL errors, and whether the shape matches the query. If there were errors, explain which scope/field is unavailable and update `schema/capabilities.md` accordingly.

Do not modify the probe file unless the user asks.
